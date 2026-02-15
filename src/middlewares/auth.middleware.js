import jwt from "jsonwebtoken"

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const [type, token] = header.split(" ")

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "missing bearer token" })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
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
