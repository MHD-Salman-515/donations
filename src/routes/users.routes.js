import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
  listIdentityRequests,
  reviewIdentityRequest,
} from "../controllers/users.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/", listUsers)
router.get("/:id", getUser)
router.post("/", createUser)
router.put("/:id", updateUser)
router.patch("/:id/status", setUserStatus)
router.delete("/:id", deleteUser)

export const adminIdentityRoutes = Router()
adminIdentityRoutes.use(requireAuth, requireRole("admin"))
adminIdentityRoutes.get("/", listIdentityRequests)
adminIdentityRoutes.patch("/:userId/review", reviewIdentityRequest)

export default router
