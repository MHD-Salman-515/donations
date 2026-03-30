import { collections, nextSequence } from "../config/db.js"
import { pickI18n } from "../utils/i18n.js"
import { logAudit } from "../utils/audit.js"

function normalizeI18nInput(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: `${fieldName} must include ar/en values` }
  }

  const ar = typeof value.ar === "string" ? value.ar.trim() : ""
  const en = typeof value.en === "string" ? value.en.trim() : ""
  if (!ar || !en) {
    return { ok: false, message: `${fieldName}.ar and ${fieldName}.en are required` }
  }

  return { ok: true, value: { ar, en } }
}

function toI18nField(row, key) {
  const candidate = row?.[`${key}_i18n`]
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const ar = typeof candidate.ar === "string" ? candidate.ar : ""
    const en = typeof candidate.en === "string" ? candidate.en : ""
    if (ar || en) return { ar: ar || en, en: en || ar }
  }

  const fallback = typeof row?.[key] === "string" ? row[key].trim() : ""
  return { ar: fallback, en: fallback }
}

function parseGoalAmount(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN
  return n
}

export async function listCampaigns(req, res) {
  try {
    const campaigns = await collections
      .campaigns()
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: -1, id: -1 })
      .toArray()

    const data = campaigns.map((campaign) => {
      const normalized = {
        id: campaign.id,
        title: toI18nField(campaign, "title"),
        description: toI18nField(campaign, "description"),
        goalAmount: Number(campaign.target_amount ?? campaign.goalAmount ?? 0),
        status: campaign.status || null,
        category: campaign.category || null,
        created_at: campaign.created_at || null,
        updated_at: campaign.updated_at || null,
      }
      return pickI18n(normalized, ["title", "description"], req.lang)
    })

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: "failed to list campaigns", error: error.message })
  }
}

export async function createCampaign(req, res) {
  try {
    const titleValid = normalizeI18nInput(req.body?.title, "title")
    if (!titleValid.ok) return res.status(400).json({ message: titleValid.message })

    const descriptionValid = normalizeI18nInput(req.body?.description, "description")
    if (!descriptionValid.ok) return res.status(400).json({ message: descriptionValid.message })

    const goalAmount = parseGoalAmount(req.body?.goalAmount)
    if (Number.isNaN(goalAmount) || goalAmount < 0) {
      return res.status(400).json({ message: "goalAmount must be greater than or equal to 0" })
    }

    const now = new Date()
    const id = await nextSequence("campaigns")

    await collections.campaigns().insertOne({
      id,
      title: titleValid.value.ar,
      description: descriptionValid.value.ar,
      title_i18n: titleValid.value,
      description_i18n: descriptionValid.value,
      target_amount: goalAmount,
      category: "general",
      image_url: null,
      start_date: null,
      end_date: null,
      status: "pending",
      rejection_reason: null,
      created_by: Number(req.user?.id) || null,
      created_at: now,
      updated_at: now,
    })

    await logAudit(null, req, {
      action: "campaigns_i18n_create",
      entity_type: "campaign",
      entity_id: id,
      meta: { source: "i18n_endpoint", goalAmount },
      actor_id: Number(req.user?.id) || null,
    })

    const data = pickI18n(
      {
        id,
        title: titleValid.value,
        description: descriptionValid.value,
        goalAmount,
        status: "pending",
        category: "general",
        created_at: now,
        updated_at: now,
      },
      ["title", "description"],
      req.lang
    )
    return res.status(201).json({ data })
  } catch (error) {
    return res.status(500).json({ message: "failed to create campaign", error: error.message })
  }
}
