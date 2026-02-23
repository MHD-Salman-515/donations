import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  adminEmergencyDonations,
  donateToEmergency,
  getAdminEmergencyFund,
  getPublicEmergencyFund,
  myEmergencyDonations,
  updateAdminEmergencyFund,
} from "../controllers/emergency.controller.js"

const publicEmergencyRoutes = Router()
publicEmergencyRoutes.get("/", getPublicEmergencyFund)

const donorEmergencyRoutes = Router()
donorEmergencyRoutes.use(requireAuth, requireRole("donor"))
donorEmergencyRoutes.post("/donate", donateToEmergency)
donorEmergencyRoutes.get("/my", myEmergencyDonations)

const adminEmergencyRoutes = Router()
adminEmergencyRoutes.use(requireAuth, requireRole("admin"))
adminEmergencyRoutes.get("/", getAdminEmergencyFund)
adminEmergencyRoutes.put("/", updateAdminEmergencyFund)
adminEmergencyRoutes.get("/donations", adminEmergencyDonations)

export { publicEmergencyRoutes, donorEmergencyRoutes, adminEmergencyRoutes }
