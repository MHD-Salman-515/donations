import rateLimit from "express-rate-limit"
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from "../config/env.js"

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: "Too many requests, please try again later.",
})
