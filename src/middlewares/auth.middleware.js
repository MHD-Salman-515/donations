import jwt from "jsonwebtoken"
import { normalizeLang } from "../utils/i18n.js"

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const [type, token] = header.split(" ")

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "missing bearer token" })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // TODO: enforce typ === "access" strictly after all clients migrate to typ-bearing tokens.
    if (payload?.typ && payload.typ !== "access") {
      return res.status(401).json({ message: "invalid token type" })
    }
    req.user = payload

    const hasHeaderLang =
      Boolean(req.headers["x-lang"]) || Boolean(req.headers["accept-language"])
    const userLang = normalizeLang(req.user?.preferredLanguage)
    if (!hasHeaderLang && userLang) {
      req.lang = userLang
    }

    next()
  } catch {
    return res.status(401).json({ message: "invalid/expired token" })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "unauthorized" })
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "forbidden" })
    next()
  }
}
