import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  parsePagination,
  validateCreatePartnerBody,
  validatePartnerListFilters,
  validatePartnerStatusBody,
  validateUpdatePartnerBody,
} from "../validators/partners.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function listPublicPartners(req, res) {
  try {
    const filters = validatePartnerListFilters(req.query || {}, { admin: false })
    if (!filters.ok) return res.status(400).json({ ok: false, message: filters.message })

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = filters.value.filter

    const total = await collections.partners().countDocuments(filter)
    const rows = await collections
      .partners()
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1, id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      ok: true,
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list partners", error: err.message })
  }
}

export async function getPublicPartner(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid partner id" })

    const row = await collections
      .partners()
      .findOne({ id, status: "active" }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ ok: false, message: "partner not found" })

    return res.json({ ok: true, data: row, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to get partner", error: err.message })
  }
}

export async function createPartner(req, res) {
  try {
    const valid = validateCreatePartnerBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const now = new Date()
    const id = await nextSequence("partners")
    await collections.partners().insertOne({
      id,
      ...valid.value,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.partners().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "partner_create",
      entity_type: "partner",
      entity_id: id,
      meta: { status: created.status, name: created.name },
      actor_id: Number(req.user?.id) || null,
    })

    return res.status(201).json({ ok: true, data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to create partner", error: err.message })
  }
}

export async function listAdminPartners(req, res) {
  try {
    const filters = validatePartnerListFilters(req.query || {}, { admin: true })
    if (!filters.ok) return res.status(400).json({ ok: false, message: filters.message })

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = filters.value.filter

    const total = await collections.partners().countDocuments(filter)
    const rows = await collections
      .partners()
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1, id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      ok: true,
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list partners", error: err.message })
  }
}

export async function getAdminPartner(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid partner id" })

    const row = await collections.partners().findOne({ id }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ ok: false, message: "partner not found" })

    return res.json({ ok: true, data: row, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to get partner", error: err.message })
  }
}

export async function updatePartner(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid partner id" })

    const current = await collections.partners().findOne({ id }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ ok: false, message: "partner not found" })

    const valid = validateUpdatePartnerBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const updates = { ...valid.value, updated_at: new Date() }
    await collections.partners().updateOne({ id }, { $set: updates })

    const updated = await collections.partners().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "partner_update",
      entity_type: "partner",
      entity_id: id,
      meta: { changed: Object.keys(valid.value) },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to update partner", error: err.message })
  }
}

export async function setPartnerStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid partner id" })

    const current = await collections.partners().findOne({ id }, { projection: { _id: 0, status: 1 } })
    if (!current) return res.status(404).json({ ok: false, message: "partner not found" })

    const valid = validatePartnerStatusBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    await collections
      .partners()
      .updateOne({ id }, { $set: { status: valid.value.status, updated_at: new Date() } })

    const updated = await collections.partners().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "partner_status",
      entity_type: "partner",
      entity_id: id,
      meta: { from_status: current.status, to_status: valid.value.status },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to update partner status", error: err.message })
  }
}

export async function deletePartner(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid partner id" })

    const current = await collections.partners().findOne({ id }, { projection: { _id: 0, status: 1 } })
    if (!current) return res.status(404).json({ ok: false, message: "partner not found" })

    await collections
      .partners()
      .updateOne({ id }, { $set: { status: "inactive", updated_at: new Date() } })

    const updated = await collections.partners().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "partner_status",
      entity_type: "partner",
      entity_id: id,
      meta: { from_status: current.status, to_status: "inactive", reason: "soft_delete" },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to delete partner", error: err.message })
  }
}
