import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  listAds,
  getAd,
  createAd,
  updateAd,
  setAdStatus,
  deleteAd,
} from "../controllers/ads.controller.js"

const router = Router()

router.use(requireAuth)

router.get("/", listAds)
router.get("/:id", getAd)
router.post("/", requireRole("admin"), createAd)
router.put("/:id", requireRole("admin"), updateAd)
router.patch("/:id/status", requireRole("admin"), setAdStatus)
router.delete("/:id", requireRole("admin"), deleteAd)

export default router
