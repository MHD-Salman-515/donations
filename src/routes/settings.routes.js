import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { listSettings, getSetting, upsertSetting } from "../controllers/settings.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/", listSettings)
router.get("/:key", getSetting)
router.put("/:key", upsertSetting)

export default router
