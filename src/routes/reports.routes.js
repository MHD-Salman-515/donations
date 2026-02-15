import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  getSummary,
  donationsByMonth,
  donationsByCategory,
  topCampaigns,
} from "../controllers/reports.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/summary", getSummary)
router.get("/donations-by-month", donationsByMonth)
router.get("/donations-by-category", donationsByCategory)
router.get("/top-campaigns", topCampaigns)

export default router
