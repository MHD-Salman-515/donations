import { Router } from "express"
import { createCampaign, listCampaigns } from "../controllers/campaigns.i18n.controller.js"

const router = Router()

router.get("/", listCampaigns)
router.post("/", createCampaign)

export default router
