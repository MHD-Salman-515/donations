import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  saveDeviceToken,
} from "../controllers/notifications.controller.js"

const router = Router()
router.use(requireAuth)

router.get("/my", getMyNotifications)
router.patch("/read-all", markAllNotificationsRead)
router.patch("/:id/read", markNotificationRead)
router.post("/device-token", saveDeviceToken)

export default router
