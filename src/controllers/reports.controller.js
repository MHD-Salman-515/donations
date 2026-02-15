import { collections } from "../config/db.js"

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function parseDateRange(query) {
  const from = normalizeText(query?.from)
  const to = normalizeText(query?.to)
  return { from, to }
}

function buildDateFilter(field, from, to) {
  const filter = {}
  if (from) filter.$gte = new Date(from)
  if (to) filter.$lte = new Date(to)
  return Object.keys(filter).length ? { [field]: filter } : {}
}

export async function getSummary(req, res) {
  try {
    const { from, to } = parseDateRange(req.query)
    const match = buildDateFilter("created_at", from, to)

    const donationAggRows = await collections
      .donations()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDonationsAmount: { $sum: "$amount" },
            totalDonationsCount: { $sum: 1 },
            donorIds: { $addToSet: "$donor_id" },
          },
        },
        {
          $project: {
            _id: 0,
            totalDonationsAmount: { $ifNull: ["$totalDonationsAmount", 0] },
            totalDonationsCount: { $ifNull: ["$totalDonationsCount", 0] },
            uniqueDonorsCount: { $size: "$donorIds" },
          },
        },
      ])
      .toArray()

    const campaignAggRows = await collections
      .campaigns()
      .aggregate([
        {
          $group: {
            _id: null,
            activeCampaignsCount: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            pendingCampaignsCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
          },
        },
        { $project: { _id: 0, activeCampaignsCount: 1, pendingCampaignsCount: 1 } },
      ])
      .toArray()

    return res.json({
      totalDonationsAmount: Number(donationAggRows[0]?.totalDonationsAmount || 0),
      totalDonationsCount: Number(donationAggRows[0]?.totalDonationsCount || 0),
      uniqueDonorsCount: Number(donationAggRows[0]?.uniqueDonorsCount || 0),
      activeCampaignsCount: Number(campaignAggRows[0]?.activeCampaignsCount || 0),
      pendingCampaignsCount: Number(campaignAggRows[0]?.pendingCampaignsCount || 0),
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to load summary", error: err.message })
  }
}

export async function donationsByMonth(req, res) {
  try {
    const { from, to } = parseDateRange(req.query)
    const match = buildDateFilter("created_at", from, to)

    const rows = await collections
      .donations()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              y: { $year: "$created_at" },
              m: { $month: "$created_at" },
            },
            total: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: "$_id.y" },
                "-",
                {
                  $cond: [
                    { $lt: ["$_id.m", 10] },
                    { $concat: ["0", { $toString: "$_id.m" }] },
                    { $toString: "$_id.m" },
                  ],
                },
              ],
            },
            total: 1,
          },
        },
        { $sort: { month: 1 } },
      ])
      .toArray()

    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: "failed to load donations by month", error: err.message })
  }
}

export async function donationsByCategory(req, res) {
  try {
    const { from, to } = parseDateRange(req.query)
    const match = buildDateFilter("created_at", from, to)

    const rows = await collections
      .donations()
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "campaigns",
            localField: "campaign_id",
            foreignField: "id",
            as: "campaign",
          },
        },
        { $unwind: "$campaign" },
        {
          $group: {
            _id: "$campaign.category",
            total: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            total: 1,
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray()

    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: "failed to load donations by category", error: err.message })
  }
}

export async function topCampaigns(req, res) {
  try {
    const { from, to } = parseDateRange(req.query)
    const match = buildDateFilter("created_at", from, to)

    const rows = await collections
      .donations()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: "$campaign_id",
            total: { $sum: "$amount" },
            donors: { $addToSet: "$donor_id" },
          },
        },
        {
          $lookup: {
            from: "campaigns",
            localField: "_id",
            foreignField: "id",
            as: "campaign",
          },
        },
        { $unwind: "$campaign" },
        {
          $project: {
            _id: 0,
            campaign_id: "$_id",
            title: "$campaign.title",
            total: 1,
            donors_count: { $size: "$donors" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ])
      .toArray()

    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: "failed to load top campaigns", error: err.message })
  }
}
