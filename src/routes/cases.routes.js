import { Router } from "express"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
  addCaseDocument,
  createCase,
  getPublicCase,
  listMyCases,
  listPublicCases,
  mapPublicCases,
  submitCase,
  updateCase,
} from "../controllers/cases.controller.js"
import {
  addCaseUpdate,
  listAdminCases,
  patchCasePriority,
  patchCaseStatus,
  setCasePartner,
  verifyCaseDocument,
} from "../controllers/admin.cases.controller.js"
import { listCaseDonationsAdmin } from "../controllers/donations.controller.js"

const beneficiaryCasesRoutes = Router()
beneficiaryCasesRoutes.use(requireAuth, requireRole("beneficiary"))
beneficiaryCasesRoutes.get("/my", listMyCases)
beneficiaryCasesRoutes.post("/", createCase)
beneficiaryCasesRoutes.put("/:id", updateCase)
beneficiaryCasesRoutes.post("/:id/submit", submitCase)
beneficiaryCasesRoutes.post("/:id/documents", addCaseDocument)

const adminCasesRoutes = Router()
adminCasesRoutes.use(requireAuth, requireRole("admin"))
adminCasesRoutes.get("/", listAdminCases)
adminCasesRoutes.patch("/:id/status", patchCaseStatus)
adminCasesRoutes.patch("/:id/priority", patchCasePriority)
adminCasesRoutes.patch("/:id/partner", setCasePartner)
adminCasesRoutes.post("/:id/updates", addCaseUpdate)
adminCasesRoutes.get("/:id/donations", listCaseDonationsAdmin)

const adminCaseDocumentsRoutes = Router()
adminCaseDocumentsRoutes.use(requireAuth, requireRole("admin"))
adminCaseDocumentsRoutes.patch("/case-documents/:docId/verify", verifyCaseDocument)

const publicCasesRoutes = Router()
publicCasesRoutes.get("/map", mapPublicCases)
publicCasesRoutes.get("/", listPublicCases)
publicCasesRoutes.get("/:id", getPublicCase)

export {
  beneficiaryCasesRoutes,
  adminCasesRoutes,
  adminCaseDocumentsRoutes,
  publicCasesRoutes,
}
