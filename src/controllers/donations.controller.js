import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"

const ALLOWED_PAYMENT_METHODS = ["card", "bank", "cash", "paypal"]
const ALLOWED_PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"]

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function inDateRangeFilter(field, from, to) {
  const filter = {}
  if (from) filter.$gte = new Date(from)
  if (to) filter.$lte = new Date(to)
  return Object.keys(filter).length ? { [field]: filter } : {}
}

async function decorateDonation(d) {
  const [campaign, caseRow, emergencyFund, donor] = await Promise.all([
    d.campaign_id
      ? collections
          .campaigns()
          .findOne({ id: d.campaign_id }, { projection: { _id: 0, title: 1, status: 1 } })
      : null,
    d.case_id
      ? collections
          .cases()
          .findOne({ id: d.case_id }, { projection: { _id: 0, title: 1, type: 1, status: 1 } })
      : null,
    d.emergency_id
      ? collections
          .emergencyFund()
          .findOne({ id: d.emergency_id }, { projection: { _id: 0, id: 1, title: 1, enabled: 1, currency: 1 } })
      : null,
    collections.users().findOne({ id: d.donor_id }, { projection: { _id: 0, name: 1, email: 1 } }),
  ])

  return {
    ...d,
    campaign_title: campaign?.title || null,
    campaign_status: campaign?.status || null,
    case_title: caseRow?.title || null,
    case_type: caseRow?.type || null,
    case_status: caseRow?.status || null,
    emergency_title: emergencyFund?.title || null,
    emergency_enabled: emergencyFund?.enabled ?? null,
    emergency_currency: emergencyFund?.currency || null,
    donor_name: donor?.name || null,
    donor_email: donor?.email || null,
  }
}

export async function createDonation(req, res) {
  try {
    const campaign_id = toId(req.body?.campaign_id)
    const case_id = toId(req.body?.case_id)
    const emergency_id = toId(req.body?.emergency_id)
    const amount = parseAmount(req.body?.amount)
    const payment_method = normalizeText(req.body?.payment_method)
    const payment_status = normalizeText(req.body?.payment_status)

    if (req.body?.campaign_id !== undefined && !campaign_id) {
      return res.status(400).json({ message: "invalid campaign_id" })
    }
    if (req.body?.case_id !== undefined && !case_id) {
      return res.status(400).json({ message: "invalid case_id" })
    }
    if (req.body?.emergency_id !== undefined && !emergency_id) {
      return res.status(400).json({ message: "invalid emergency_id" })
    }

    if (Number.isNaN(amount)) {
      return res.status(400).json({ message: "amount is required" })
    }

    const hasCampaign = Boolean(campaign_id)
    const hasCase = Boolean(case_id)
    const hasEmergency = Boolean(emergency_id)
    const targetsCount = Number(hasCampaign) + Number(hasCase) + Number(hasEmergency)
    if (targetsCount !== 1) {
      return res
        .status(400)
        .json({ message: "exactly one of campaign_id or case_id or emergency_id is required" })
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "amount must be > 0" })
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ message: "invalid payment_method" })
    }

    if (!ALLOWED_PAYMENT_STATUSES.includes(payment_status)) {
      return res.status(400).json({ message: "invalid payment_status" })
    }

    let donor_id = req.user?.id
    if (req.user?.role === "admin" && req.body?.donor_id !== undefined) {
      donor_id = toId(req.body.donor_id)
    }

    if (!toId(donor_id)) {
      return res.status(400).json({ message: "invalid donor_id" })
    }

    if (hasCampaign) {
      const campaign = await collections
        .campaigns()
        .findOne({ id: campaign_id }, { projection: { _id: 0, id: 1, status: 1 } })

      if (!campaign) {
        return res.status(404).json({ message: "campaign not found" })
      }

      if (campaign.status !== "active") {
        return res.status(400).json({ message: "only active campaigns accept donations" })
      }
    } else {
      if (hasCase) {
        const caseRow = await collections
          .cases()
          .findOne({ id: case_id }, { projection: { _id: 0, id: 1, status: 1 } })

        if (!caseRow) {
          return res.status(404).json({ message: "case not found" })
        }

        if (!["approved", "active"].includes(caseRow.status)) {
          return res.status(400).json({ message: "only approved or active cases accept donations" })
        }
      } else {
        const emergencyFund = await collections
          .emergencyFund()
          .findOne({ id: emergency_id }, { projection: { _id: 0, id: 1, enabled: 1 } })

        if (!emergencyFund) {
          return res.status(404).json({ message: "emergency fund not found" })
        }
        if (!emergencyFund.enabled) {
          return res.status(400).json({ message: "emergency fund is disabled" })
        }
      }
    }

    const now = new Date()
    const id = await nextSequence("donations")

    await collections.donations().insertOne({
      id,
      ...(hasCampaign ? { campaign_id } : {}),
      ...(hasCase ? { case_id } : {}),
      ...(hasEmergency ? { emergency_id } : {}),
      donor_id,
      amount,
      payment_method,
      payment_status,
      created_at: now,
      updated_at: now,
    })

    if (hasEmergency) {
      await collections
        .emergencyFund()
        .updateOne({ id: emergency_id }, { $inc: { raised_amount: amount }, $set: { updated_at: now } })
    }

    const created = await collections.donations().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: hasEmergency ? "emergency_donation_created" : hasCase ? "donation_created" : "donations_create",
      entity_type: "donation",
      entity_id: id,
      meta: {
        amount,
        donor_id,
        payment_status,
        ...(hasCampaign && { campaign_id }),
        ...(hasCase && { case_id }),
        ...(hasEmergency && { emergency_id }),
      },
      actor_id: donor_id,
    })

    return res.status(201).json(await decorateDonation(created))
  } catch (err) {
    return res.status(500).json({ message: "failed to create donation", error: err.message })
  }
}

export async function listDonations(req, res) {
  try {
    const campaign_id = req.query?.campaign_id ? toId(req.query.campaign_id) : null
    const case_id = req.query?.case_id ? toId(req.query.case_id) : null
    const emergency_id = req.query?.emergency_id ? toId(req.query.emergency_id) : null
    const donor_id = req.query?.donor_id ? toId(req.query.donor_id) : null
    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)

    if (req.query?.campaign_id && !campaign_id) {
      return res.status(400).json({ message: "invalid campaign_id filter" })
    }

    if (req.query?.donor_id && !donor_id) {
      return res.status(400).json({ message: "invalid donor_id filter" })
    }

    if (req.query?.case_id && !case_id) {
      return res.status(400).json({ message: "invalid case_id filter" })
    }

    if (req.query?.emergency_id && !emergency_id) {
      return res.status(400).json({ message: "invalid emergency_id filter" })
    }

    const filter = {
      ...(campaign_id && { campaign_id }),
      ...(case_id && { case_id }),
      ...(emergency_id && { emergency_id }),
      ...(donor_id && { donor_id }),
      ...inDateRangeFilter("created_at", from, to),
    }

    const rows = await collections
      .donations()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .toArray()

    const decorated = await Promise.all(rows.map(decorateDonation))
    return res.json(decorated)
  } catch (err) {
    return res.status(500).json({ message: "failed to list donations", error: err.message })
  }
}

export async function listMyDonations(req, res) {
  try {
    const pageRaw = Number(req.query?.page)
    const limitRaw = Number(req.query?.limit)
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10
    const skip = (page - 1) * limit

    const filter = { donor_id: req.user?.id }
    const total = await collections.donations().countDocuments(filter)
    const rows = await collections
      .donations()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await Promise.all(rows.map(decorateDonation))
    return res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list my donations", error: err.message })
  }
}

export async function listCaseDonationsAdmin(req, res) {
  try {
    const case_id = toId(req.params.id)
    if (!case_id) return res.status(400).json({ message: "invalid case id" })

    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)
    const pageRaw = Number(req.query?.page)
    const limitRaw = Number(req.query?.limit)
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10
    const skip = (page - 1) * limit

    const caseRow = await collections.cases().findOne({ id: case_id }, { projection: { _id: 0, id: 1 } })
    if (!caseRow) return res.status(404).json({ message: "case not found" })

    const filter = {
      case_id,
      ...inDateRangeFilter("created_at", from, to),
    }

    const total = await collections.donations().countDocuments(filter)
    const rows = await collections
      .donations()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await Promise.all(rows.map(decorateDonation))
    return res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list case donations", error: err.message })
  }
}
