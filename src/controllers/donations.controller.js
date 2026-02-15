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
  const [campaign, donor] = await Promise.all([
    collections.campaigns().findOne({ id: d.campaign_id }, { projection: { _id: 0, title: 1 } }),
    collections.users().findOne({ id: d.donor_id }, { projection: { _id: 0, name: 1, email: 1 } }),
  ])

  return {
    ...d,
    campaign_title: campaign?.title || null,
    donor_name: donor?.name || null,
    donor_email: donor?.email || null,
  }
}

export async function createDonation(req, res) {
  try {
    const campaign_id = toId(req.body?.campaign_id)
    const amount = parseAmount(req.body?.amount)
    const payment_method = normalizeText(req.body?.payment_method)
    const payment_status = normalizeText(req.body?.payment_status)

    if (!campaign_id || Number.isNaN(amount)) {
      return res.status(400).json({ message: "campaign_id and amount are required" })
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

    const campaign = await collections.campaigns().findOne({ id: campaign_id }, { projection: { _id: 0, id: 1, status: 1 } })

    if (!campaign) {
      return res.status(404).json({ message: "campaign not found" })
    }

    if (campaign.status !== "active") {
      return res.status(400).json({ message: "only active campaigns accept donations" })
    }

    const now = new Date()
    const id = await nextSequence("donations")

    await collections.donations().insertOne({
      id,
      campaign_id,
      donor_id,
      amount,
      payment_method,
      payment_status,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.donations().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "donations_create",
      entity_type: "donation",
      entity_id: id,
      meta: { amount, campaign_id, donor_id, payment_status },
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
    const donor_id = req.query?.donor_id ? toId(req.query.donor_id) : null
    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)

    if (req.query?.campaign_id && !campaign_id) {
      return res.status(400).json({ message: "invalid campaign_id filter" })
    }

    if (req.query?.donor_id && !donor_id) {
      return res.status(400).json({ message: "invalid donor_id filter" })
    }

    const filter = {
      ...(campaign_id && { campaign_id }),
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
