import { collections } from "../config/db.js"

function toPositiveInt(value, fallback) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function safeParseMeta(value) {
  if (value == null) return null
  if (typeof value === "object") return value
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildDateFilter(field, from, to) {
  const filter = {}
  if (from) filter.$gte = new Date(from)
  if (to) filter.$lte = new Date(to)
  return Object.keys(filter).length ? { [field]: filter } : {}
}

export async function listAuditLogs(req, res) {
  try {
    const actor_id = req.query?.actor_id
    const action = req.query?.action
    const entity_type = req.query?.entity_type
    const entity_id = req.query?.entity_id
    const from = req.query?.from
    const to = req.query?.to
    const page = toPositiveInt(req.query?.page, 1)
    const limit = Math.min(toPositiveInt(req.query?.limit, 10), 50)
    const skip = (page - 1) * limit

    const filter = {
      ...(actor_id !== undefined && actor_id !== "" && { actor_id: Number(actor_id) }),
      ...(action && { action }),
      ...(entity_type && { entity_type }),
      ...(entity_id !== undefined && entity_id !== "" && { entity_id: Number(entity_id) }),
      ...buildDateFilter("created_at", from, to),
    }

    const total = await collections.auditLogs().countDocuments(filter)
    const pages = Math.ceil(total / limit) || 1

    const rows = await collections
      .auditLogs()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((v) => v !== null && v !== undefined))]
    const actors = actorIds.length
      ? await collections
          .users()
          .find({ id: { $in: actorIds } }, { projection: { _id: 0, id: 1, name: 1, email: 1 } })
          .toArray()
      : []
    const actorMap = new Map(actors.map((a) => [a.id, a]))

    const data = rows.map((row) => ({
      ...row,
      actor_name: actorMap.get(row.actor_id)?.name || null,
      actor_email: actorMap.get(row.actor_id)?.email || null,
      meta: safeParseMeta(row.meta),
    }))

    return res.json({
      data,
      meta: { page, limit, total, pages },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to list audit logs", error: err.message })
  }
}
