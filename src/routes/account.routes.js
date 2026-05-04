import { Router } from "express"
import multer from "multer"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  changeMyPassword,
  getMyAccount,
  updateMyAccount,
  submitIdentityVerification,
} from "../controllers/account.controller.js"

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()

router.use(requireAuth)
router.get("/me", getMyAccount)
router.patch("/me", updateMyAccount)
router.post("/change-password", changeMyPassword)
router.post("/verify-identity", upload.single("file"), submitIdentityVerification)

export default router
