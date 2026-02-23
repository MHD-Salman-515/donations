import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { setCampaignPartner } from "../controllers/campaigns.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))
router.patch("/:id/partner", setCampaignPartner)

export default router
