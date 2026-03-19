import { collections } from "../config/db.js"

export async function requireStoreAccess(req, res, next) {
  try {
    const userId = Number(req.user?.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ ok: false, message: "unauthorized" })
    }

    const storePartner = await collections
      .partners()
      .findOne(
        { user_id: userId, partner_type: "store", status: "active" },
        { projection: { _id: 0 } }
      )

    if (!storePartner) {
      return res.status(403).json({ ok: false, message: "store access is not available for this user" })
    }

    req.storePartner = storePartner
    next()
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to resolve store access", error: err.message })
  }
}

