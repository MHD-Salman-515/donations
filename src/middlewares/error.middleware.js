import { NODE_ENV } from "../config/env.js"

export function notFound(req, res, next) {
  res.status(404).json({ message: "Route not found" })
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const isProduction = NODE_ENV === "production"
  const message = isProduction && status >= 500 ? "Internal Server Error" : err.message || "Internal Server Error"

  if (status >= 500) {
    console.error("Unhandled error:", err)
  }

  return res.status(status).json({
    message,
    ...(!isProduction && { stack: err.stack }),
  })
}
