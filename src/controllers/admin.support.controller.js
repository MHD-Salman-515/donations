import { collections } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  parsePagination,
  validateAdminSupportFilters,
  validateAdminSupportPatchBody,
} from "../validators/support.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function listAdminSupportMessages(req, res) {
  try {
    const validFilters = validateAdminSupportFilters(req.query || {})
    if (!validFilters.ok) return res.status(400).json({ ok: false, message: validFilters.message })

    const { status, campaign_id, q } = validFilters.value
    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = {
      ...(status && { status }),
      ...(campaign_id && { campaign_id }),
      ...(q && {
        $or: [{ message: { $regex: q, $options: "i" } }, { quick_key: { $regex: q, $options: "i" } }],
      }),
    }

    const total = await collections.campaignSupportMessages().countDocuments(filter)
    const rows = await collections
      .campaignSupportMessages()
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
    return res.status(500).json({ ok: false, message: "failed to list support messages", error: err.message })
  }
}

export async function moderateSupportMessage(req, res) {
  try {
    const supportId = toId(req.params.supportId)
    if (!supportId) return res.status(400).json({ ok: false, message: "invalid support id" })

    const valid = validateAdminSupportPatchBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const current = await collections
      .campaignSupportMessages()
      .findOne({ id: supportId }, { projection: { _id: 0, id: 1, status: 1, moderation: 1 } })
    if (!current) return res.status(404).json({ ok: false, message: "support message not found" })

    const updates = {
      status: valid.value.status,
      moderation: {
        auto_flag: current.moderation?.auto_flag || false,
        reason: valid.value.moderation_reason,
      },
    }

    await collections.campaignSupportMessages().updateOne({ id: supportId }, { $set: updates })
    const updated = await collections
      .campaignSupportMessages()
      .findOne({ id: supportId }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "support_moderate",
      entity_type: "campaign_support_message",
      entity_id: supportId,
      meta: {
        from_status: current.status,
        to_status: valid.value.status,
        moderation_reason: valid.value.moderation_reason,
      },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: updated, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to moderate support message", error: err.message })
  }
}
