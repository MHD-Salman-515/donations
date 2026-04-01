import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  changeMyPassword,
  getMyAccount,
  updateMyAccount,
} from "../controllers/account.controller.js"

const router = Router()

router.use(requireAuth)
router.get("/me", getMyAccount)
router.patch("/me", updateMyAccount)
router.post("/change-password", changeMyPassword)

export default router
