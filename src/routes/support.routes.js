import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { reportSupportMessage } from "../controllers/support.controller.js"

const router = Router()

router.post("/:supportId/report", requireAuth, reportSupportMessage)

export default router
