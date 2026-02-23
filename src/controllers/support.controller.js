import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  parsePagination,
  validateCreateSupportBody,
  validateReportBody,
} from "../validators/support.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function createCampaignSupportMessage(req, res) {
  try {
    const campaign_id = toId(req.params.id)
    if (!campaign_id) return res.status(400).json({ ok: false, message: "invalid campaign id" })

    const actor_user_id = req.user?.id
    if (!actor_user_id) return res.status(401).json({ ok: false, message: "unauthorized" })

    const campaign = await collections
      .campaigns()
      .findOne({ id: campaign_id }, { projection: { _id: 0, id: 1, status: 1 } })
    if (!campaign) return res.status(404).json({ ok: false, message: "campaign not found" })
    if (campaign.status !== "active") {
      return res.status(400).json({ ok: false, message: "only active campaigns accept support messages" })
    }

    const valid = validateCreateSupportBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const attempts = await collections.campaignSupportMessages().countDocuments({
      campaign_id,
      actor_user_id,
      created_at: { $gte: since },
    })
    if (attempts >= 3) {
      return res
        .status(429)
        .json({ ok: false, message: "rate limit exceeded: max 3 support messages per campaign per 24h" })
    }

    const now = new Date()
    const id = await nextSequence("campaign_support_messages")
    const payload = valid.value

    await collections.campaignSupportMessages().insertOne({
      id,
      campaign_id,
      actor_user_id,
      type: payload.type,
      quick_key: payload.quick_key,
      message: payload.message,
      status: payload.status,
      moderation: payload.moderation,
      created_at: now,
    })

    const created = await collections
      .campaignSupportMessages()
      .findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "support_create",
      entity_type: "campaign_support_message",
      entity_id: id,
      meta: { campaign_id, type: payload.type, status: payload.status },
      actor_id: actor_user_id,
    })

    return res.status(201).json({ ok: true, data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to create support message", error: err.message })
  }
}

export async function listCampaignSupportMessages(req, res) {
  try {
    const campaign_id = toId(req.params.id)
    if (!campaign_id) return res.status(400).json({ ok: false, message: "invalid campaign id" })

    const campaign = await collections
      .campaigns()
      .findOne({ id: campaign_id }, { projection: { _id: 0, id: 1 } })
    if (!campaign) return res.status(404).json({ ok: false, message: "campaign not found" })

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = { campaign_id, status: "visible" }

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

export async function reportSupportMessage(req, res) {
  try {
    const support_id = toId(req.params.supportId)
    if (!support_id) return res.status(400).json({ ok: false, message: "invalid support id" })
    const reporter_user_id = req.user?.id
    if (!reporter_user_id) return res.status(401).json({ ok: false, message: "unauthorized" })

    const support = await collections
      .campaignSupportMessages()
      .findOne({ id: support_id }, { projection: { _id: 0, id: 1, campaign_id: 1, status: 1 } })
    if (!support) return res.status(404).json({ ok: false, message: "support message not found" })

    const valid = validateReportBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const duplicate = await collections
      .supportReports()
      .findOne({ support_id, reporter_user_id }, { projection: { _id: 0, id: 1 } })
    if (duplicate) {
      return res.status(409).json({ ok: false, message: "support message already reported by this user" })
    }

    const now = new Date()
    const id = await nextSequence("support_reports")
    await collections.supportReports().insertOne({
      id,
      support_id,
      reporter_user_id,
      reason: valid.value.reason,
      note: valid.value.note,
      created_at: now,
    })

    const totalReports = await collections.supportReports().countDocuments({ support_id })
    if (totalReports >= 3) {
      await collections.campaignSupportMessages().updateOne(
        { id: support_id },
        {
          $set: {
            status: "flagged",
            moderation: { auto_flag: true, reason: "report_threshold" },
          },
        }
      )
    }

    await logAudit(null, req, {
      action: "support_report",
      entity_type: "support_report",
      entity_id: id,
      meta: { support_id, reason: valid.value.reason },
      actor_id: reporter_user_id,
    })

    const created = await collections.supportReports().findOne({ id }, { projection: { _id: 0 } })
    return res.status(201).json({ ok: true, data: created, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to report support message", error: err.message })
  }
}
