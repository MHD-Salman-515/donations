import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { createOrder, listMyOrders } from "../controllers/orders.controller.js"

const router = Router()

router.use(requireAuth)
router.post("/", createOrder)
router.get("/my", listMyOrders)

export default router

