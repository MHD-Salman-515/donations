import { Router } from "express"
import { createCampaign, listCampaigns } from "../controllers/campaigns.i18n.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"

const router = Router()

router.get("/", listCampaigns)
router.post("/", requireAuth, requireRole("admin"), createCampaign)

export default router
