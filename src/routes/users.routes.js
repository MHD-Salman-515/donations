import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
} from "../controllers/users.controller.js"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/", listUsers)
router.get("/:id", getUser)
router.post("/", createUser)
router.put("/:id", updateUser)
router.patch("/:id/status", setUserStatus)
router.delete("/:id", deleteUser)

export default router
