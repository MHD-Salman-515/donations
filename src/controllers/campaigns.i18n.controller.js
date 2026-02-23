import Campaign from "../models/campaign.model.js"
import { pickI18n } from "../utils/i18n.js"

function formatValidationError(error) {
  if (!error?.errors) return error?.message || "Validation failed"

  const messages = Object.values(error.errors)
    .map((item) => item.message)
    .filter(Boolean)

  return messages.length ? messages.join(", ") : "Validation failed"
}

export async function listCampaigns(req, res) {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean()
    const data = campaigns.map((campaign) => pickI18n(campaign, ["title", "description"], req.lang))

    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ message: "failed to list campaigns", error: error.message })
  }
}

export async function createCampaign(req, res) {
  try {
    const campaign = await Campaign.create({
      title: req.body?.title,
      description: req.body?.description,
      goalAmount: req.body?.goalAmount,
    })

    const data = pickI18n(campaign.toObject(), ["title", "description"], req.lang)
    return res.status(201).json({ data })
  } catch (error) {
    if (error?.name === "ValidationError" || error?.name === "StrictModeError") {
      return res.status(400).json({ message: formatValidationError(error) })
    }

    return res.status(500).json({ message: "failed to create campaign", error: error.message })
  }
}
