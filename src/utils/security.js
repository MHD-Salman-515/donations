import crypto from "crypto"
import jwt from "jsonwebtoken"

export function createAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" })
}

export function createRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" })
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}
