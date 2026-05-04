import { Router } from "express"
import { register, login, refresh, logout, setup2FA, verify2FA, disable2FA, login2FA } from "../controllers/auth.controller.js"
import { authLimiter } from "../middlewares/rateLimit.middleware.js"
import { requireAuth } from "../middlewares/auth.middleware.js"

const router = Router()

router.post("/register", authLimiter, register)
router.post("/login", authLimiter, login)
router.post("/refresh", refresh)
router.post("/logout", logout)

router.post("/2fa/setup", authLimiter, requireAuth, setup2FA)
router.post("/2fa/verify", authLimiter, requireAuth, verify2FA)
router.post("/2fa/disable", authLimiter, requireAuth, disable2FA)
router.post("/2fa/login", authLimiter, login2FA)

export default router
