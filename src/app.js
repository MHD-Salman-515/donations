import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/users.routes.js"
import campaignsRoutes from "./routes/campaigns.routes.js"
import donationsRoutes from "./routes/donations.routes.js"
import reportsRoutes from "./routes/reports.routes.js"
import adsRoutes from "./routes/ads.routes.js"
import settingsRoutes from "./routes/settings.routes.js"
import auditRoutes from "./routes/audit.routes.js"
import { CORS_ORIGIN_LIST, NODE_ENV } from "./config/env.js"
import { errorHandler, notFound } from "./middlewares/error.middleware.js"

const app = express()

app.use(helmet())

if (NODE_ENV !== "production") {
  app.use(morgan("dev"))
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (CORS_ORIGIN_LIST.includes(origin)) return callback(null, true)
      return callback(new Error("CORS error: origin not allowed"))
    },
  })
)
app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: NODE_ENV })
})

app.get("/", (req, res) => {
  res.json({ ok: true, service: "backend" })
})

// routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/campaigns", campaignsRoutes)
app.use("/api/donations", donationsRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/ads", adsRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/audit", auditRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
