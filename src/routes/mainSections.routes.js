import { Router } from "express"
import { getMainSectionByKey, listMainSections } from "../controllers/mainSections.controller.js"

const router = Router()

router.get("/", listMainSections)
router.get("/:key", getMainSectionByKey)

export default router
