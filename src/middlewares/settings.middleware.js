import jwt from "jsonwebtoken"
import { collections } from "../config/db.js"

function isTrue(value) {
  return value === true || value === "true"
}

function isFalse(value) {
  return value === false || value === "false"
}

function isAdminToken(req) {
  try {
    const header = req.headers.authorization || ""
    const [type, token] = header.split(" ")
    if (type !== "Bearer" || !token) return false
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload?.role === "admin"
  } catch (_) {
    return false
  }
}

export async function checkMaintenanceMode(req, res, next) {
  try {
    if (req.path.startsWith("/api/auth")) return next()
    if (isAdminToken(req)) return next()

    const doc = await collections
      .settings()
      .findOne({ id: 1 }, { projection: { _id: 0, maintenance_mode: 1 } })

    if (isTrue(doc?.maintenance_mode)) {
      return res.status(503).json({ message: "service under maintenance" })
    }

    return next()
  } catch (_) {
    return next()
  }
}

export async function checkDonationsEnabled(req, res, next) {
  try {
    const doc = await collections
      .settings()
      .findOne({ id: 1 }, { projection: { _id: 0, donations_enabled: 1 } })

    if (isFalse(doc?.donations_enabled)) {
      return res.status(403).json({ message: "donations are currently disabled" })
    }

    return next()
  } catch (_) {
    return next()
  }
}
