import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  approveStoreApplication,
  createStoreApplication,
  getAdminStoreApplication,
  getMyStoreApplication,
  listAdminStoreApplications,
  rejectStoreApplication,
} from "../controllers/storeApplications.controller.js"

const publicStoreApplicationsRoutes = Router()
publicStoreApplicationsRoutes.post("/", requireAuth, createStoreApplication)
publicStoreApplicationsRoutes.get("/my", requireAuth, getMyStoreApplication)

const adminStoreApplicationsRoutes = Router()
adminStoreApplicationsRoutes.use(requireAuth, requireRole("admin"))
adminStoreApplicationsRoutes.get("/", listAdminStoreApplications)
adminStoreApplicationsRoutes.get("/:id", getAdminStoreApplication)
adminStoreApplicationsRoutes.patch("/:id/approve", approveStoreApplication)
adminStoreApplicationsRoutes.patch("/:id/reject", rejectStoreApplication)

export { publicStoreApplicationsRoutes, adminStoreApplicationsRoutes }
