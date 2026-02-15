import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"

const ALLOWED_STATUSES = ["pending", "active", "inactive"]
const ALLOWED_CATEGORIES = ["education", "health", "relief", "construction", "general"]

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function toPage(value, fallback = 1) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function toLimit(value, fallback = 10) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return fallback
  return Math.min(n, 100)
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

async function fetchAdById(id) {
  const ad = await collections.advertisements().findOne({ id }, { projection: { _id: 0 } })
  if (!ad) return null

  const creator = ad.created_by
    ? await collections
        .users()
        .findOne({ id: ad.created_by }, { projection: { _id: 0, name: 1, email: 1 } })
    : null

  return {
    ...ad,
    creator_name: creator?.name || null,
    creator_email: creator?.email || null,
  }
}

export async function listAds(req, res) {
  try {
    const status = normalizeText(req.query?.status)
    const category = normalizeText(req.query?.category)
    const q = normalizeText(req.query?.q)
    const page = toPage(req.query?.page, 1)
    const limit = toLimit(req.query?.limit, 10)
    const skip = (page - 1) * limit

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "invalid category" })
    }

    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (q) filter.title = { $regex: q, $options: "i" }

    const total = await collections.advertisements().countDocuments(filter)
    const rows = await collections
      .advertisements()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await Promise.all(rows.map((row) => fetchAdById(row.id)))

    return res.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list ads", error: err.message })
  }
}

export async function getAd(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid ad id" })

    const row = await fetchAdById(id)
    if (!row) return res.status(404).json({ message: "ad not found" })

    return res.json({ data: row, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to get ad", error: err.message })
  }
}

export async function createAd(req, res) {
  try {
    const title = normalizeText(req.body?.title)
    const description = normalizeText(req.body?.description) || null
    const image_url = normalizeText(req.body?.image_url) || null
    const link_url = normalizeText(req.body?.link_url) || null
    const category = normalizeText(req.body?.category) || "general"
    const status = normalizeText(req.body?.status) || "pending"
    const start_date = req.body?.start_date ? new Date(req.body.start_date) : null
    const end_date = req.body?.end_date ? new Date(req.body.end_date) : null
    const created_by = req.user?.id

    if (!title) return res.status(400).json({ message: "title is required" })
    if (!created_by) return res.status(401).json({ message: "unauthorized" })
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "invalid category" })
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    const now = new Date()
    const id = await nextSequence("advertisements")

    await collections.advertisements().insertOne({
      id,
      title,
      description,
      image_url,
      link_url,
      category,
      status,
      start_date,
      end_date,
      created_by,
      created_at: now,
      updated_at: now,
    })

    const created = await fetchAdById(id)

    await logAudit(null, req, {
      action: "ads_create",
      entity_type: "ad",
      entity_id: id,
      meta: { title, category, status },
      actor_id: created_by,
    })

    return res.status(201).json({ data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to create ad", error: err.message })
  }
}

export async function updateAd(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid ad id" })

    const title = req.body?.title === undefined ? null : normalizeText(req.body.title)
    const description = req.body?.description === undefined ? null : normalizeText(req.body.description)
    const image_url = req.body?.image_url === undefined ? null : normalizeText(req.body.image_url)
    const link_url = req.body?.link_url === undefined ? null : normalizeText(req.body.link_url)
    const category = req.body?.category === undefined ? null : normalizeText(req.body.category)
    const start_date = req.body?.start_date === undefined ? null : new Date(req.body.start_date)
    const end_date = req.body?.end_date === undefined ? null : new Date(req.body.end_date)

    if (category !== null && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "invalid category" })
    }

    if (req.body?.status !== undefined) {
      return res.status(400).json({ message: "use PATCH /api/ads/:id/status to update status" })
    }

    const updates = { updated_at: new Date() }
    if (title !== null) updates.title = title
    if (description !== null) updates.description = description
    if (image_url !== null) updates.image_url = image_url
    if (link_url !== null) updates.link_url = link_url
    if (category !== null) updates.category = category
    if (start_date !== null) updates.start_date = start_date
    if (end_date !== null) updates.end_date = end_date

    const result = await collections.advertisements().updateOne({ id }, { $set: updates })

    if (!result.matchedCount) return res.status(404).json({ message: "ad not found" })

    const updated = await fetchAdById(id)

    await logAudit(null, req, {
      action: "ads_update",
      entity_type: "ad",
      entity_id: id,
      meta: {
        changed: {
          ...(title !== null && { title }),
          ...(description !== null && { description }),
          ...(image_url !== null && { image_url }),
          ...(link_url !== null && { link_url }),
          ...(category !== null && { category }),
          ...(start_date !== null && { start_date }),
          ...(end_date !== null && { end_date }),
        },
      },
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to update ad", error: err.message })
  }
}

export async function setAdStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid ad id" })

    const status = normalizeText(req.body?.status)
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    const result = await collections
      .advertisements()
      .updateOne({ id }, { $set: { status, updated_at: new Date() } })
    if (!result.matchedCount) return res.status(404).json({ message: "ad not found" })

    const updated = await fetchAdById(id)

    await logAudit(null, req, {
      action: "ads_status",
      entity_type: "ad",
      entity_id: id,
      meta: { status },
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to update ad status", error: err.message })
  }
}

export async function deleteAd(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid ad id" })

    const result = await collections.advertisements().deleteOne({ id })
    if (!result.deletedCount) return res.status(404).json({ message: "ad not found" })

    await logAudit(null, req, {
      action: "ads_delete",
      entity_type: "ad",
      entity_id: id,
    })

    return res.json({ data: { id, deleted: true }, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to delete ad", error: err.message })
  }
}
