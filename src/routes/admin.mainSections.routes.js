import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  createMainSection,
  listAdminMainSections,
  reorderMainSections,
  toggleMainSection,
  updateMainSection,
} from "../controllers/admin.mainSections.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))
router.get("/", listAdminMainSections)
router.post("/", createMainSection)
router.patch("/reorder", reorderMainSections)
router.patch("/:key/toggle", toggleMainSection)
router.patch("/:key", updateMainSection)

export default router
