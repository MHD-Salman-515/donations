import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  createPartner,
  deletePartner,
  getAdminPartner,
  getPublicPartner,
  listAdminPartners,
  listPublicPartners,
  setPartnerStatus,
  updatePartner,
} from "../controllers/partners.controller.js"

const publicPartnersRoutes = Router()
publicPartnersRoutes.get("/", listPublicPartners)
publicPartnersRoutes.get("/:id", getPublicPartner)

const adminPartnersRoutes = Router()
adminPartnersRoutes.use(requireAuth, requireRole("admin"))
adminPartnersRoutes.post("/", createPartner)
adminPartnersRoutes.get("/", listAdminPartners)
adminPartnersRoutes.get("/:id", getAdminPartner)
adminPartnersRoutes.put("/:id", updatePartner)
adminPartnersRoutes.patch("/:id/status", setPartnerStatus)
adminPartnersRoutes.delete("/:id", deletePartner)

export { publicPartnersRoutes, adminPartnersRoutes }
