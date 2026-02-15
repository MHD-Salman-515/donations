import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { listAuditLogs } from "../controllers/audit.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/", listAuditLogs)

export default router
