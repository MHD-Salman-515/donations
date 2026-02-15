import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"

const ALLOWED_CATEGORIES = ["education", "health", "relief", "construction", "general"]

const ALLOWED_STATUSES = ["pending", "active", "rejected", "completed", "paused", "canceled"]

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function parseAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
}

async function withCreator(campaign) {
  const creator = campaign.created_by
    ? await collections.users().findOne(
        { id: campaign.created_by },
        { projection: { _id: 0, name: 1, email: 1 } }
      )
    : null

  return {
    ...campaign,
    creator_name: creator?.name || null,
    creator_email: creator?.email || null,
  }
}

export async function listCampaigns(req, res) {
  try {
    const status = normalizeText(req.query.status)
    const category = normalizeText(req.query.category)
    const q = normalizeText(req.query.q)

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

    const campaigns = await collections
      .campaigns()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .toArray()

    const rows = await Promise.all(campaigns.map(withCreator))
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: "failed to list campaigns", error: err.message })
  }
}

export async function getCampaign(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid campaign id" })

    const campaign = await collections.campaigns().findOne({ id }, { projection: { _id: 0 } })

    if (!campaign) return res.status(404).json({ message: "campaign not found" })
    return res.json(await withCreator(campaign))
  } catch (err) {
    return res.status(500).json({ message: "failed to get campaign", error: err.message })
  }
}

export async function createCampaign(req, res) {
  try {
    const title = normalizeText(req.body?.title)
    const description = normalizeText(req.body?.description)
    const target_amount = parseAmount(req.body?.target_amount)
    const category = req.body?.category ? normalizeText(req.body.category) : "general"
    const image_url = req.body?.image_url ?? null
    const start_date = req.body?.start_date ? new Date(req.body.start_date) : null
    const end_date = req.body?.end_date ? new Date(req.body.end_date) : null
    const created_by = req.user?.id

    if (!title || !description || Number.isNaN(target_amount)) {
      return res.status(400).json({ message: "title, description, target_amount are required" })
    }

    if (target_amount < 0) {
      return res.status(400).json({ message: "target_amount must be >= 0" })
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "invalid category" })
    }

    if (!created_by) {
      return res.status(401).json({ message: "unauthorized" })
    }

    const now = new Date()
    const id = await nextSequence("campaigns")

    await collections.campaigns().insertOne({
      id,
      title,
      description,
      target_amount,
      category,
      image_url,
      start_date,
      end_date,
      status: "pending",
      rejection_reason: null,
      created_by,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.campaigns().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "campaigns_create",
      entity_type: "campaign",
      entity_id: id,
      meta: { status: "pending", category, target_amount },
      actor_id: created_by,
    })

    return res.status(201).json(await withCreator(created))
  } catch (err) {
    return res.status(500).json({ message: "failed to create campaign", error: err.message })
  }
}

export async function updateCampaign(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid campaign id" })

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : null
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : null
    const category = typeof req.body?.category === "string" ? req.body.category.trim() : null
    const image_url = req.body?.image_url ?? null
    const start_date = req.body?.start_date !== undefined ? new Date(req.body.start_date) : null
    const end_date = req.body?.end_date !== undefined ? new Date(req.body.end_date) : null

    let target_amount = null
    if (req.body?.target_amount !== undefined) {
      target_amount = parseAmount(req.body.target_amount)
      if (Number.isNaN(target_amount)) {
        return res.status(400).json({ message: "invalid target_amount" })
      }
      if (target_amount < 0) {
        return res.status(400).json({ message: "target_amount must be >= 0" })
      }
    }

    if (category !== null && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "invalid category" })
    }

    if (req.body?.status !== undefined) {
      const status = normalizeText(req.body.status)
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: "invalid status" })
      }
      return res
        .status(400)
        .json({ message: "use PATCH /api/campaigns/:id/status to update status" })
    }

    const updates = { updated_at: new Date() }
    if (title !== null) updates.title = title
    if (description !== null) updates.description = description
    if (target_amount !== null) updates.target_amount = target_amount
    if (category !== null) updates.category = category
    if (image_url !== null) updates.image_url = image_url
    if (start_date !== null) updates.start_date = start_date
    if (end_date !== null) updates.end_date = end_date

    const result = await collections.campaigns().updateOne({ id }, { $set: updates })

    if (!result.matchedCount) {
      return res.status(404).json({ message: "campaign not found" })
    }

    const updated = await collections.campaigns().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "campaigns_update",
      entity_type: "campaign",
      entity_id: id,
      meta: {
        changed: {
          ...(title !== null && { title }),
          ...(description !== null && { description }),
          ...(target_amount !== null && { target_amount }),
          ...(category !== null && { category }),
          ...(image_url !== null && { image_url }),
          ...(start_date !== null && { start_date }),
          ...(end_date !== null && { end_date }),
        },
      },
    })

    return res.json(await withCreator(updated))
  } catch (err) {
    return res.status(500).json({ message: "failed to update campaign", error: err.message })
  }
}

export async function setCampaignStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid campaign id" })

    const status = normalizeText(req.body?.status)
    const rejection_reason = normalizeText(req.body?.rejection_reason)

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    if (status === "rejected" && !rejection_reason) {
      return res.status(400).json({ message: "rejection_reason is required for rejected status" })
    }

    const reasonValue = status === "rejected" ? rejection_reason : null

    const result = await collections.campaigns().updateOne(
      { id },
      {
        $set: {
          status,
          rejection_reason: reasonValue,
          updated_at: new Date(),
        },
      }
    )

    if (!result.matchedCount) {
      return res.status(404).json({ message: "campaign not found" })
    }

    const updated = await collections.campaigns().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "campaigns_status",
      entity_type: "campaign",
      entity_id: id,
      meta: { status, ...(reasonValue !== null && { rejection_reason: reasonValue }) },
    })

    return res.json(await withCreator(updated))
  } catch (err) {
    return res.status(500).json({ message: "failed to update campaign status", error: err.message })
  }
}

export async function deleteCampaign(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid campaign id" })

    const result = await collections.campaigns().deleteOne({ id })
    if (!result.deletedCount) return res.status(404).json({ message: "campaign not found" })

    await logAudit(null, req, {
      action: "campaigns_delete",
      entity_type: "campaign",
      entity_id: id,
    })

    return res.json({ message: "campaign deleted" })
  } catch (err) {
    return res.status(500).json({ message: "failed to delete campaign", error: err.message })
  }
}
