import { collections, nextSequence } from "../config/db.js"
import {
  ALLOWED_CASE_EDITABLE_STATUSES,
  ALLOWED_CASE_PRIORITIES,
  ALLOWED_CASE_STATUSES,
  ALLOWED_CASE_TYPES,
  parsePagination,
  validateCreateCaseBody,
  validateCreateCaseDocumentBody,
  validatePublicMapQuery,
  validateUpdateCaseBody,
} from "../validators/cases.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toPublicCase(doc) {
  if (!doc) return doc

  const {
    _id,
    beneficiary_id,
    created_by,
    assigned_admin_id,
    rejection_reason,
    ...rest
  } = doc

  return {
    ...rest,
    masked_display: rest.masked_display || { alias_name: null, hide_images: false },
  }
}

function buildPublicFilter(query) {
  const type = normalizeText(query?.type)
  const category = normalizeText(query?.category)
  const q = normalizeText(query?.q)
  const city = normalizeText(query?.city)
  const priority = normalizeText(query?.priority)

  if (type && !ALLOWED_CASE_TYPES.includes(type)) return { error: "invalid type" }
  if (priority && !ALLOWED_CASE_PRIORITIES.includes(priority)) return { error: "invalid priority" }

  const filter = {
    status: { $in: ["approved", "active"] },
  }
  if (type) filter.type = type
  if (category) filter.category = category
  if (city) filter["location.city"] = city
  if (priority) filter.priority = priority
  if (q) {
    filter.$or = [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }]
  }

  return { filter }
}

export async function createCase(req, res) {
  try {
    const valid = validateCreateCaseBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const beneficiaryId = req.user?.id
    if (!beneficiaryId) return res.status(401).json({ message: "unauthorized" })

    const now = new Date()
    const id = await nextSequence("cases")
    const payload = valid.value

    await collections.cases().insertOne({
      id,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      target_amount: payload.target_amount,
      currency: payload.currency,
      status: payload.status,
      priority: payload.priority,
      beneficiary_id: beneficiaryId,
      created_by: beneficiaryId,
      assigned_admin_id: null,
      rejection_reason: null,
      privacy_mode: payload.privacy_mode,
      masked_display: payload.masked_display,
      location: payload.location,
      start_date: payload.start_date,
      end_date: payload.end_date,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.cases().findOne({ id }, { projection: { _id: 0 } })
    return res.status(201).json({ data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to create case", error: err.message })
  }
}

export async function updateCase(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid case id" })

    const row = await collections.cases().findOne({ id }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ message: "case not found" })
    if (row.beneficiary_id !== req.user?.id) return res.status(403).json({ message: "forbidden" })
    if (!ALLOWED_CASE_EDITABLE_STATUSES.includes(row.status)) {
      return res.status(400).json({ message: "case cannot be edited in current status" })
    }

    const valid = validateUpdateCaseBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const updates = { ...valid.value, updated_at: new Date() }
    const result = await collections.cases().updateOne({ id }, { $set: updates })
    if (!result.matchedCount) return res.status(404).json({ message: "case not found" })

    const updated = await collections.cases().findOne({ id }, { projection: { _id: 0 } })
    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to update case", error: err.message })
  }
}

export async function submitCase(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid case id" })

    const row = await collections.cases().findOne({ id }, { projection: { _id: 0, id: 1, status: 1, beneficiary_id: 1 } })
    if (!row) return res.status(404).json({ message: "case not found" })
    if (row.beneficiary_id !== req.user?.id) return res.status(403).json({ message: "forbidden" })
    if (!ALLOWED_CASE_EDITABLE_STATUSES.includes(row.status)) {
      return res.status(400).json({ message: "case cannot be submitted in current status" })
    }

    await collections
      .cases()
      .updateOne({ id }, { $set: { status: "submitted", updated_at: new Date() } })

    const updated = await collections.cases().findOne({ id }, { projection: { _id: 0 } })
    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to submit case", error: err.message })
  }
}

export async function listMyCases(req, res) {
  try {
    const status = normalizeText(req.query?.status)
    if (status && !ALLOWED_CASE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status filter" })
    }

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = {
      beneficiary_id: req.user?.id,
      ...(status && { status }),
    }

    const total = await collections.cases().countDocuments(filter)
    const rows = await collections
      .cases()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list my cases", error: err.message })
  }
}

export async function addCaseDocument(req, res) {
  try {
    const caseId = toId(req.params.id)
    if (!caseId) return res.status(400).json({ message: "invalid case id" })

    const row = await collections.cases().findOne(
      { id: caseId },
      { projection: { _id: 0, id: 1, beneficiary_id: 1 } }
    )
    if (!row) return res.status(404).json({ message: "case not found" })
    if (row.beneficiary_id !== req.user?.id) return res.status(403).json({ message: "forbidden" })

    const valid = validateCreateCaseDocumentBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const id = await nextSequence("case_documents")
    const now = new Date()

    await collections.caseDocuments().insertOne({
      id,
      case_id: caseId,
      type: valid.value.type,
      file_url: valid.value.file_url,
      mime_type: valid.value.mime_type,
      size_bytes: valid.value.size_bytes,
      verified: false,
      verified_by: null,
      verified_at: null,
      created_at: now,
    })

    const created = await collections.caseDocuments().findOne({ id }, { projection: { _id: 0 } })
    return res.status(201).json({ data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to add case document", error: err.message })
  }
}

export async function listPublicCases(req, res) {
  try {
    const built = buildPublicFilter(req.query || {})
    if (built.error) return res.status(400).json({ message: built.error })

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const total = await collections.cases().countDocuments(built.filter)
    const rows = await collections
      .cases()
      .find(built.filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      data: rows.map(toPublicCase),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list public cases", error: err.message })
  }
}

export async function getPublicCase(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid case id" })

    const row = await collections.cases().findOne(
      { id, status: { $in: ["approved", "active"] } },
      { projection: { _id: 0 } }
    )

    if (!row) return res.status(404).json({ message: "case not found" })
    return res.json({ data: toPublicCase(row), meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to get public case", error: err.message })
  }
}

export async function mapPublicCases(req, res) {
  try {
    const parsed = validatePublicMapQuery(req.query || {})
    if (!parsed.ok) return res.status(400).json({ message: parsed.message })

    const baseFilter = { status: { $in: ["approved", "active"] } }
    if (parsed.value.mode === "bbox") {
      baseFilter.location = {
        $geoWithin: {
          $box: [
            [parsed.value.minLng, parsed.value.minLat],
            [parsed.value.maxLng, parsed.value.maxLat],
          ],
        },
      }
    } else {
      baseFilter.location = {
        $geoWithin: {
          $centerSphere: [[parsed.value.centerLng, parsed.value.centerLat], parsed.value.radiusKm / 6378.1],
        },
      }
    }

    const rows = await collections
      .cases()
      .find(baseFilter, {
        projection: {
          _id: 0,
          id: 1,
          type: 1,
          status: 1,
          location: 1,
          priority: 1,
          masked_display: 1,
          title: 1,
        },
      })
      .limit(500)
      .toArray()

    return res.json({ data: rows, meta: { total: rows.length } })
  } catch (err) {
    return res.status(500).json({ message: "failed to load cases map", error: err.message })
  }
}
