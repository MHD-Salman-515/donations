import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { createAdminStore } from "../controllers/partners.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))
router.post("/", createAdminStore)

export default router
