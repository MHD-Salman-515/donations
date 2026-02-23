import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  deleteCampaign,
} from "../controllers/campaigns.controller.js"
import {
  createCampaignSupportMessage,
  listCampaignSupportMessages,
} from "../controllers/support.controller.js"

const router = Router()

router.get("/:id/support", listCampaignSupportMessages)
router.post("/:id/support", requireAuth, requireRole("donor", "admin"), createCampaignSupportMessage)

router.use(requireAuth)

router.get("/", listCampaigns)
router.get("/:id", getCampaign)

router.post("/", requireRole("admin"), createCampaign)
router.put("/:id", requireRole("admin"), updateCampaign)
router.patch("/:id/status", requireRole("admin"), setCampaignStatus)
router.delete("/:id", requireRole("admin"), deleteCampaign)

export default router
