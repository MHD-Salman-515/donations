import { collections } from "../config/db.js"

export async function getStoreProfile(req, res) {
  try {
    const userId = Number(req.user?.id)
    const user = await collections
      .users()
      .findOne({ id: userId }, { projection: { _id: 0, id: 1, name: 1, email: 1 } })

    if (!user) return res.status(404).json({ ok: false, message: "user not found" })

    const store = req.storePartner || null
    if (!store) {
      return res.status(403).json({ ok: false, message: "store access is not available for this user" })
    }

    const linkedApplication = store.created_from_application_id
      ? await collections
          .storeApplications()
          .findOne(
            { id: store.created_from_application_id },
            { projection: { _id: 0, id: 1, status: 1, reviewed_at: 1, partner_id: 1 } }
          )
      : null

    return res.json({
      ok: true,
      data: {
        user,
        store: {
          id: store.id,
          name: store.name,
          partner_type: store.partner_type || null,
          status: store.status,
          city: store.city || store.location?.city || null,
          business_category: store.business_category || null,
          donation_mode: store.donation_mode || null,
          donation_value: store.donation_value ?? null,
          default_target_type: store.default_target_type || null,
          default_target_id: store.default_target_id ?? null,
          created_from_application_id: store.created_from_application_id || null,
          application: linkedApplication,
        },
      },
      meta: null,
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to load store profile", error: err.message })
  }
}

