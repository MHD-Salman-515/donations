import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import { createAccessToken, createRefreshToken, hashToken } from "../utils/security.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
  }
}

function getRequestIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"]
  if (typeof xForwardedFor === "string" && xForwardedFor.trim()) {
    return xForwardedFor.split(",")[0].trim()
  }
  return req.socket?.remoteAddress || null
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferredLanguage || "ar",
    created_at: user.created_at,
  }
}

export async function register(req, res) {
  try {
    const rawName = req.body?.name
    const rawEmail = req.body?.email
    const password = req.body?.password
    const role = req.body?.role

    const name = typeof rawName === "string" ? rawName.trim() : ""
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" })
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "invalid email format" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 chars" })
    }

    const safeRole = role && role !== "admin" ? role : "donor"
    const password_hash = await bcrypt.hash(password, 10)
    const now = new Date()

    const id = await nextSequence("users")
    await collections.users().insertOne({
      id,
      name,
      email,
      password_hash,
      role: safeRole,
      status: "active",
      preferredLanguage: "ar",
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    })

    const user = await collections
      .users()
      .findOne({ id }, { projection: { _id: 0, password_hash: 0, failed_login_attempts: 0, locked_until: 0 } })

    const token = createAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
      preferredLanguage: user.preferredLanguage || "ar",
    })

    return res.status(201).json({ token, user })
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "email already exists" })
    }
    return res.status(500).json({ message: "register failed", error: err.message })
  }
}

export async function login(req, res) {
  try {
    const rawEmail = req.body?.email
    const password = req.body?.password
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "invalid email format" })
    }

    const user = await collections.users().findOne({ email })

    if (!user) return res.status(401).json({ message: "invalid credentials" })

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ message: "account temporarily locked. try again later" })
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "account is inactive" })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      const attempts = Number(user.failed_login_attempts || 0) + 1
      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000)
        await collections.users().updateOne(
          { id: user.id },
          { $set: { failed_login_attempts: 0, locked_until: lockUntil, updated_at: new Date() } }
        )
      } else {
        await collections.users().updateOne(
          { id: user.id },
          { $set: { failed_login_attempts: attempts, locked_until: null, updated_at: new Date() } }
        )
      }
      return res.status(401).json({ message: "invalid credentials" })
    }

    await collections.users().updateOne(
      { id: user.id },
      { $set: { failed_login_attempts: 0, locked_until: null, updated_at: new Date() } }
    )

    const preferredLanguage = user.preferredLanguage || "ar"
    const token = createAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
      preferredLanguage,
    })
    const refreshToken = createRefreshToken({
      id: user.id,
      role: user.role,
      email: user.email,
      preferredLanguage,
    })
    const refreshTokenHash = hashToken(refreshToken)
    const userAgent = req.headers["user-agent"] || null
    const ip = getRequestIp(req)

    await collections.refreshTokens().insertOne({
      id: await nextSequence("refresh_tokens"),
      user_id: user.id,
      token_hash: refreshTokenHash,
      revoked: false,
      user_agent: userAgent,
      ip,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    })

    res.cookie("refresh_token", refreshToken, getRefreshCookieOptions())

    await logAudit(null, req, {
      action: "auth_login",
      entity_type: "user",
      entity_id: user.id,
      actor_id: user.id,
      meta: { ip, user_agent: userAgent },
    })

    return res.json({ token, user: publicUser(user) })
  } catch (err) {
    return res.status(500).json({ message: "login failed", error: err.message })
  }
}

export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) return res.status(401).json({ message: "missing refresh token" })

    try {
      jwt.verify(refreshToken, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: "invalid refresh token" })
    }

    const tokenHash = hashToken(refreshToken)
    const now = new Date()

    const rt = await collections.refreshTokens().findOne({
      token_hash: tokenHash,
      revoked: false,
      expires_at: { $gt: now },
    })

    if (!rt) return res.status(401).json({ message: "invalid refresh token" })

    const user = await collections.users().findOne({ id: rt.user_id })
    if (!user) return res.status(401).json({ message: "invalid refresh token" })

    if (user.status !== "active") {
      return res.status(403).json({ message: "account is inactive" })
    }

    const token = createAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
      preferredLanguage: user.preferredLanguage || "ar",
    })

    await logAudit(null, req, {
      action: "auth_refresh",
      entity_type: "user",
      entity_id: user.id,
      actor_id: user.id,
    })

    return res.json({ token })
  } catch (err) {
    return res.status(500).json({ message: "refresh failed", error: err.message })
  }
}

export async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token
    let actorId = req.user?.id ?? null

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken)
      const existing = await collections.refreshTokens().findOne({ token_hash: tokenHash })
      if (existing) actorId = existing.user_id

      await collections
        .refreshTokens()
        .updateMany({ token_hash: tokenHash, revoked: false }, { $set: { revoked: true } })
    }

    res.clearCookie("refresh_token", getRefreshCookieOptions())

    await logAudit(null, req, {
      action: "auth_logout",
      entity_type: "user",
      entity_id: actorId,
      actor_id: actorId,
    })

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: "logout failed", error: err.message })
  }
}
