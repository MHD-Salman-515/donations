import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  validateCreateStoreApplicationBody,
  validateRejectStoreApplicationBody,
  validateStoreApplicationsAdminFilters,
} from "../validators/storeApplications.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function targetExists(target_type, target_id) {
  if (target_type === "campaign") {
    const row = await collections.campaigns().findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
    return Boolean(row)
  }

  if (target_type === "case") {
    const row = await collections.cases().findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
    return Boolean(row)
  }

  const row = await collections
    .emergencyFund()
    .findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
  return Boolean(row)
}

export async function createStoreApplication(req, res) {
  try {
    const valid = validateCreateStoreApplicationBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const exists = await targetExists(valid.value.target_type, valid.value.target_id)
    if (!exists) return res.status(404).json({ ok: false, message: "target not found" })

    const now = new Date()
    const id = await nextSequence("store_applications")

    await collections.storeApplications().insertOne({
      id,
      ...valid.value,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_application_create",
      entity_type: "store_application",
      entity_id: id,
      meta: {
        target_type: valid.value.target_type,
        target_id: valid.value.target_id,
        donation_mode: valid.value.donation_mode,
      },
      actor_id: null,
    })

    return res.status(201).json({ ok: true, data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to create store application", error: err.message })
  }
}

export async function listAdminStoreApplications(req, res) {
  try {
    const valid = validateStoreApplicationsAdminFilters(req.query || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const { status, city, business_category, q, page, limit, skip } = valid.value
    const filter = {
      ...(status && { status }),
      ...(city && { city }),
      ...(business_category && { business_category }),
      ...(q && {
        $or: [
          { store_name: { $regex: q, $options: "i" } },
          { owner_name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }),
    }

    const total = await collections.storeApplications().countDocuments(filter)
    const rows = await collections
      .storeApplications()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      ok: true,
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list store applications", error: err.message })
  }
}

export async function getAdminStoreApplication(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid application id" })

    const row = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ ok: false, message: "store application not found" })

    return res.json({ ok: true, data: row, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to get store application", error: err.message })
  }
}

export async function approveStoreApplication(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid application id" })

    const current = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ ok: false, message: "store application not found" })
    if (current.status === "approved") {
      return res.status(400).json({ ok: false, message: "application is already approved" })
    }

    const now = new Date()
    await collections.storeApplications().updateOne(
      { id },
      {
        $set: {
          status: "approved",
          reviewed_by: req.user?.id || null,
          reviewed_at: now,
          updated_at: now,
        },
      }
    )

    const updated = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_application_approved",
      entity_type: "store_application",
      entity_id: id,
      meta: { from_status: current.status, to_status: "approved" },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to approve store application", error: err.message })
  }
}

export async function rejectStoreApplication(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid application id" })

    const valid = validateRejectStoreApplicationBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const current = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ ok: false, message: "store application not found" })
    if (current.status === "rejected") {
      return res.status(400).json({ ok: false, message: "application is already rejected" })
    }

    const now = new Date()
    await collections.storeApplications().updateOne(
      { id },
      {
        $set: {
          status: "rejected",
          notes: valid.value.notes,
          reviewed_by: req.user?.id || null,
          reviewed_at: now,
          updated_at: now,
        },
      }
    )

    const updated = await collections.storeApplications().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_application_rejected",
      entity_type: "store_application",
      entity_id: id,
      meta: { from_status: current.status, to_status: "rejected", notes: valid.value.notes },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to reject store application", error: err.message })
  }
}

