import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { requireStoreAccess } from "../middlewares/store.middleware.js"
import {
  createStoreProduct,
  getMyStoreProduct,
  getPublicStoreProduct,
  listMyStoreProducts,
  listPublicStoreProducts,
  setMyStoreProductStatus,
  updateMyStoreProduct,
} from "../controllers/storeProducts.controller.js"

const storeProductsRoutes = Router()
storeProductsRoutes.use(requireAuth, requireStoreAccess)
storeProductsRoutes.post("/", createStoreProduct)
storeProductsRoutes.get("/my", listMyStoreProducts)
storeProductsRoutes.get("/:id", getMyStoreProduct)
storeProductsRoutes.put("/:id", updateMyStoreProduct)
storeProductsRoutes.patch("/:id/status", setMyStoreProductStatus)

const publicStoreProductsRoutes = Router()
publicStoreProductsRoutes.get("/", listPublicStoreProducts)
publicStoreProductsRoutes.get("/:id", getPublicStoreProduct)

export { storeProductsRoutes, publicStoreProductsRoutes }

