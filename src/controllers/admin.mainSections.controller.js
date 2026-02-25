import { collections } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import { normalizeSectionKey } from "../utils/mainSections.js"
import {
  validateCreateMainSectionBody,
  validateReorderMainSectionsBody,
  validateUpdateMainSectionBody,
} from "../validators/mainSections.validation.js"

function parseOptionalBoolean(value) {
  if (value === undefined) return null
  if (typeof value === "boolean") return value
  const raw = String(value).trim().toLowerCase()
  if (raw === "true") return true
  if (raw === "false") return false
  return null
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

export async function listAdminMainSections(req, res) {
  try {
    const isActive = parseOptionalBoolean(req.query?.isActive)
    if (req.query?.isActive !== undefined && isActive === null) {
      return res.status(400).json({ message: "isActive must be boolean" })
    }

    const q = normalizeText(req.query?.q)
    const filter = {
      ...(isActive === null ? {} : { isActive }),
      ...(q
        ? {
            $or: [
              { key: { $regex: q, $options: "i" } },
              { "title.ar": { $regex: q, $options: "i" } },
              { "title.en": { $regex: q, $options: "i" } },
            ],
          }
        : {}),
    }

    const rows = await collections.mainSections().find(filter, { projection: { _id: 0 } }).sort({ order: 1, key: 1 }).toArray()
    return res.json({ data: rows, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to list main sections", error: err.message })
  }
}

export async function createMainSection(req, res) {
  try {
    const valid = validateCreateMainSectionBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const now = new Date()
    const payload = {
      ...valid.value,
      key: normalizeSectionKey(valid.value.key),
      created_at: now,
      updated_at: now,
    }

    const existing = await collections.mainSections().findOne({ key: payload.key }, { projection: { _id: 0, key: 1 } })
    if (existing) return res.status(409).json({ message: "section key already exists" })

    await collections.mainSections().insertOne(payload)
    const created = await collections.mainSections().findOne({ key: payload.key }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "section_create",
      entity_type: "main_section",
      entity_id: payload.key,
      meta: { key: payload.key, isActive: payload.isActive, order: payload.order },
      actor_id: Number(req.user?.id) || null,
    })

    return res.status(201).json({ data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to create main section", error: err.message })
  }
}

export async function updateMainSection(req, res) {
  try {
    const key = normalizeSectionKey(req.params?.key)
    if (!key) return res.status(400).json({ message: "invalid key" })

    const current = await collections.mainSections().findOne({ key }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ message: "section not found" })

    const valid = validateUpdateMainSectionBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    await collections.mainSections().updateOne({ key }, { $set: { ...valid.value, updated_at: new Date() } })
    const updated = await collections.mainSections().findOne({ key }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "section_update",
      entity_type: "main_section",
      entity_id: key,
      meta: { changed: Object.keys(valid.value) },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to update main section", error: err.message })
  }
}

export async function toggleMainSection(req, res) {
  try {
    const key = normalizeSectionKey(req.params?.key)
    if (!key) return res.status(400).json({ message: "invalid key" })

    const current = await collections.mainSections().findOne({ key }, { projection: { _id: 0, key: 1, isActive: 1 } })
    if (!current) return res.status(404).json({ message: "section not found" })

    const nextIsActive = !Boolean(current.isActive)
    await collections.mainSections().updateOne({ key }, { $set: { isActive: nextIsActive, updated_at: new Date() } })
    const updated = await collections.mainSections().findOne({ key }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "section_toggle",
      entity_type: "main_section",
      entity_id: key,
      meta: { from: current.isActive, to: nextIsActive },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to toggle main section", error: err.message })
  }
}

export async function reorderMainSections(req, res) {
  try {
    const valid = validateReorderMainSectionsBody(req.body)
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const keys = valid.value.items.map((item) => item.key)
    const existingCount = await collections.mainSections().countDocuments({ key: { $in: keys } })
    if (existingCount !== keys.length) return res.status(404).json({ message: "one or more section keys were not found" })

    const now = new Date()
    const operations = valid.value.items.map((item) => ({
      updateOne: {
        filter: { key: item.key },
        update: { $set: { order: item.order, updated_at: now } },
      },
    }))
    await collections.mainSections().bulkWrite(operations, { ordered: false })

    const rows = await collections
      .mainSections()
      .find({ key: { $in: keys } }, { projection: { _id: 0 } })
      .sort({ order: 1, key: 1 })
      .toArray()

    await logAudit(null, req, {
      action: "section_reorder",
      entity_type: "main_section",
      entity_id: null,
      meta: { items: valid.value.items },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ data: rows, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to reorder main sections", error: err.message })
  }
}
