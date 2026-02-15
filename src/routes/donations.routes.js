import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { createDonation, listDonations } from "../controllers/donations.controller.js"

const router = Router()

router.post("/", requireAuth, requireRole("admin", "donor"), createDonation)
router.get("/", requireAuth, requireRole("admin"), listDonations)

export default router
