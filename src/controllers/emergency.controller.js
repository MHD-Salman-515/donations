import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  buildDateFilter,
  parsePagination,
  validateEmergencyDonateBody,
  validateEmergencyUpdateBody,
} from "../validators/emergency.validation.js"

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

async function getEmergencyFundDoc(id = 1) {
  return collections.emergencyFund().findOne({ id }, { projection: { _id: 0 } })
}

async function decorateDonationRow(row) {
  const donor = await collections
    .users()
    .findOne({ id: row.donor_id }, { projection: { _id: 0, id: 1, name: 1, email: 1 } })

  return {
    ...row,
    donor_name: donor?.name || null,
    donor_email: donor?.email || null,
  }
}

export async function getPublicEmergencyFund(req, res) {
  try {
    const doc = await getEmergencyFundDoc(1)
    if (!doc) return res.status(404).json({ message: "emergency fund not found" })
    return res.json({ data: doc, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to load emergency fund", error: err.message })
  }
}

export async function getAdminEmergencyFund(req, res) {
  try {
    const doc = await getEmergencyFundDoc(1)
    if (!doc) return res.status(404).json({ message: "emergency fund not found" })
    return res.json({ data: doc, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to load emergency fund", error: err.message })
  }
}

export async function updateAdminEmergencyFund(req, res) {
  try {
    const valid = validateEmergencyUpdateBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const updates = { ...valid.value, updated_at: new Date() }
    await collections.emergencyFund().updateOne(
      { id: 1 },
      {
        $set: updates,
        $setOnInsert: {
          id: 1,
          raised_amount: 0,
          created_at: new Date(),
        },
      },
      { upsert: true }
    )

    const doc = await getEmergencyFundDoc(1)
    return res.json({ data: doc, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to update emergency fund", error: err.message })
  }
}

export async function donateToEmergency(req, res) {
  try {
    const valid = validateEmergencyDonateBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const emergencyFund = await getEmergencyFundDoc(valid.value.emergency_id)
    if (!emergencyFund) return res.status(404).json({ message: "emergency fund not found" })
    if (!emergencyFund.enabled) return res.status(400).json({ message: "emergency fund is disabled" })

    const now = new Date()
    const id = await nextSequence("donations")
    const donor_id = req.user?.id

    await collections.donations().insertOne({
      id,
      emergency_id: valid.value.emergency_id,
      donor_id,
      amount: valid.value.amount,
      payment_method: valid.value.payment_method,
      payment_status: valid.value.payment_status,
      created_at: now,
      updated_at: now,
    })

    await collections
      .emergencyFund()
      .updateOne({ id: valid.value.emergency_id }, { $inc: { raised_amount: valid.value.amount }, $set: { updated_at: now } })

    await logAudit(null, req, {
      action: "emergency_donation_created",
      entity_type: "donation",
      entity_id: id,
      meta: { amount: valid.value.amount },
      actor_id: donor_id,
    })

    const created = await collections.donations().findOne({ id }, { projection: { _id: 0 } })
    const data = await decorateDonationRow(created)
    return res.status(201).json({ data, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to donate to emergency fund", error: err.message })
  }
}

export async function myEmergencyDonations(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)
    const dateFilter = buildDateFilter("created_at", from, to)
    if (dateFilter.error) return res.status(400).json({ message: dateFilter.error })

    const filter = {
      donor_id: req.user?.id,
      emergency_id: { $exists: true },
      ...dateFilter.value,
    }

    const total = await collections.donations().countDocuments(filter)
    const rows = await collections
      .donations()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await Promise.all(rows.map(decorateDonationRow))
    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } })
  } catch (err) {
    return res.status(500).json({ message: "failed to list my emergency donations", error: err.message })
  }
}

export async function adminEmergencyDonations(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const from = normalizeText(req.query?.from)
    const to = normalizeText(req.query?.to)
    const dateFilter = buildDateFilter("created_at", from, to)
    if (dateFilter.error) return res.status(400).json({ message: dateFilter.error })

    const filter = { emergency_id: { $exists: true }, ...dateFilter.value }
    const total = await collections.donations().countDocuments(filter)
    const rows = await collections
      .donations()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await Promise.all(rows.map(decorateDonationRow))
    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } })
  } catch (err) {
    return res.status(500).json({ message: "failed to list emergency donations", error: err.message })
  }
}
