import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  listAdminSupportMessages,
  moderateSupportMessage,
} from "../controllers/admin.support.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))
router.get("/", listAdminSupportMessages)
router.patch("/:supportId", moderateSupportMessage)

export default router
