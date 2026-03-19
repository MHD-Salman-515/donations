import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { requireStoreAccess } from "../middlewares/store.middleware.js"
import { getStoreProfile } from "../controllers/store.controller.js"

const router = Router()

router.get("/profile", requireAuth, requireStoreAccess, getStoreProfile)

export default router

