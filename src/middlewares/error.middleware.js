import { NODE_ENV } from "../config/env.js"

export function notFound(req, res, next) {
  res.status(404).json({ message: "Route not found" })
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const message = err.message || "Internal Server Error"

  return res.status(status).json({
    message,
    ...(NODE_ENV !== "production" && { stack: err.stack }),
  })
}
