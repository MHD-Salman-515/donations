import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  ALLOWED_CASE_PRIORITIES,
  ALLOWED_CASE_STATUSES,
  parsePagination,
  validateAdminPriorityPatchBody,
  validateAdminStatusPatchBody,
  validateCreateCaseUpdateBody,
  validateVerifyCaseDocumentBody,
} from "../validators/cases.validation.js"
import { validatePartnerLinkBody } from "../validators/partners.validation.js"
import { isKnownCaseType, normalizeSectionKey } from "../utils/mainSections.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function buildDateFilter(field, from, to) {
  const filter = {}
  if (from) {
    const d = new Date(from)
    if (!Number.isNaN(d.getTime())) filter.$gte = d
  }
  if (to) {
    const d = new Date(to)
    if (!Number.isNaN(d.getTime())) filter.$lte = d
  }
  return Object.keys(filter).length ? { [field]: filter } : {}
}

export async function listAdminCases(req, res) {
  try {
    const status = normalizeText(req.query?.status)
    const type = normalizeSectionKey(req.query?.type)
    const priority = normalizeText(req.query?.priority)
    const q = normalizeText(req.query?.q)
    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)
    const beneficiary_id = req.query?.beneficiary_id ? toId(req.query.beneficiary_id) : null

    if (status && !ALLOWED_CASE_STATUSES.includes(status)) return res.status(400).json({ message: "invalid status" })
    if (type) {
      const isKnownType = await isKnownCaseType(type)
      if (!isKnownType) return res.status(400).json({ message: "invalid type" })
    }
    if (priority && !ALLOWED_CASE_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "invalid priority" })
    }
    if (req.query?.beneficiary_id && !beneficiary_id) {
      return res.status(400).json({ message: "invalid beneficiary_id" })
    }

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = {
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(beneficiary_id && { beneficiary_id }),
      ...buildDateFilter("created_at", from, to),
      ...(q && {
        $or: [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }],
      }),
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
    return res.status(500).json({ message: "failed to list admin cases", error: err.message })
  }
}

export async function patchCaseStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid case id" })

    const valid = validateAdminStatusPatchBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const row = await collections.cases().findOne({ id }, { projection: { _id: 0, id: 1, status: 1 } })
    if (!row) return res.status(404).json({ message: "case not found" })

    const now = new Date()
    const updates = {
      status: valid.value.status,
      rejection_reason: valid.value.status === "rejected" ? valid.value.rejection_reason : null,
      updated_at: now,
      ...(valid.value.status === "under_review" && { assigned_admin_id: req.user?.id || null }),
    }

    await collections.cases().updateOne({ id }, { $set: updates })
    const updated = await collections.cases().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "case_status_changed",
      entity_type: "case",
      entity_id: id,
      meta: {
        from_status: row.status,
        to_status: valid.value.status,
        rejection_reason: updates.rejection_reason,
      },
      actor_id: Number(req.user?.id) || null,
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to change case status", error: err.message })
  }
}

export async function patchCasePriority(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid case id" })

    const valid = validateAdminPriorityPatchBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const row = await collections.cases().findOne({ id }, { projection: { _id: 0, id: 1, priority: 1 } })
    if (!row) return res.status(404).json({ message: "case not found" })

    await collections
      .cases()
      .updateOne({ id }, { $set: { priority: valid.value.priority, updated_at: new Date() } })

    const updated = await collections.cases().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "case_priority_changed",
      entity_type: "case",
      entity_id: id,
      meta: { from_priority: row.priority, to_priority: valid.value.priority },
      actor_id: req.user?.id || null,
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to change case priority", error: err.message })
  }
}

export async function verifyCaseDocument(req, res) {
  try {
    const docId = toId(req.params.docId)
    if (!docId) return res.status(400).json({ message: "invalid document id" })

    const valid = validateVerifyCaseDocumentBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const doc = await collections.caseDocuments().findOne({ id: docId }, { projection: { _id: 0 } })
    if (!doc) return res.status(404).json({ message: "document not found" })

    const now = new Date()
    const updates = {
      verified: valid.value.verified,
      verified_by: req.user?.id || null,
      verified_at: valid.value.verified ? now : null,
    }

    await collections.caseDocuments().updateOne({ id: docId }, { $set: updates })
    const updated = await collections.caseDocuments().findOne({ id: docId }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "case_document_verified",
      entity_type: "case_document",
      entity_id: docId,
      meta: { case_id: doc.case_id, verified: valid.value.verified },
      actor_id: req.user?.id || null,
    })

    return res.json({ data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to verify case document", error: err.message })
  }
}

export async function addCaseUpdate(req, res) {
  try {
    const caseId = toId(req.params.id)
    if (!caseId) return res.status(400).json({ message: "invalid case id" })

    const caseRow = await collections.cases().findOne({ id: caseId }, { projection: { _id: 0, id: 1 } })
    if (!caseRow) return res.status(404).json({ message: "case not found" })

    const valid = validateCreateCaseUpdateBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const id = await nextSequence("case_updates")
    const now = new Date()

    await collections.caseUpdates().insertOne({
      id,
      case_id: caseId,
      kind: valid.value.kind,
      content: valid.value.content,
      media_urls: valid.value.media_urls,
      created_by: req.user?.id || null,
      created_at: now,
    })

    await collections.cases().updateOne({ id: caseId }, { $set: { updated_at: now } })

    const created = await collections.caseUpdates().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "case_update_added",
      entity_type: "case_update",
      entity_id: id,
      meta: { case_id: caseId, kind: valid.value.kind },
      actor_id: req.user?.id || null,
    })

    return res.status(201).json({ data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to add case update", error: err.message })
  }
}

export async function setCasePartner(req, res) {
  try {
    const caseId = toId(req.params.id)
    if (!caseId) return res.status(400).json({ ok: false, message: "invalid case id" })

    const valid = validatePartnerLinkBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const caseRow = await collections.cases().findOne({ id: caseId }, { projection: { _id: 0 } })
    if (!caseRow) return res.status(404).json({ ok: false, message: "case not found" })

    if (valid.value.partner_id !== null) {
      const partner = await collections
        .partners()
        .findOne({ id: valid.value.partner_id, status: "active" }, { projection: { _id: 0, id: 1 } })
      if (!partner) return res.status(404).json({ ok: false, message: "active partner not found" })
    }

    await collections
      .cases()
      .updateOne({ id: caseId }, { $set: { partner_id: valid.value.partner_id, updated_at: new Date() } })

    const updated = await collections.cases().findOne({ id: caseId }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "case_partner_set",
      entity_type: "case",
      entity_id: caseId,
      meta: { partner_id: valid.value.partner_id },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to set case partner", error: err.message })
  }
}
