import jwt from "jsonwebtoken"
import { normalizeLang } from "../utils/i18n.js"
import { collections } from "../config/db.js"

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const [type, token] = header.split(" ")

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "missing bearer token" })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: "invalid/expired token" })
  }

  if (payload?.typ !== "access") {
    return res.status(401).json({ message: "invalid token type" })
  }

  req.user = payload
  if (req.user && req.user.id) {
    req.user.id = Number(req.user.id)
  }

  const dbUser = await collections
    .users()
    .findOne({ id: req.user.id }, { projection: { _id: 0, id: 1, status: 1 } })

  if (!dbUser) return res.status(401).json({ message: "account not found" })
  if (dbUser.status === "inactive") return res.status(403).json({ message: "account suspended" })

  req.user.status = dbUser.status

  const hasHeaderLang =
    Boolean(req.headers["x-lang"]) || Boolean(req.headers["accept-language"])
  const userLang = normalizeLang(req.user?.preferredLanguage)
  if (!hasHeaderLang && userLang) {
    req.lang = userLang
  }

  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "unauthorized" })
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "forbidden" })
    next()
  }
}
