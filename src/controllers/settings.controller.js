import { collections } from "../config/db.js"
import { logAudit } from "../utils/audit.js"

function normalizeKey(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toSettingsEntries(doc) {
  if (!doc) return []
  const reserved = new Set(["_id", "id", "created_at", "updated_at"])
  return Object.keys(doc)
    .filter((key) => !reserved.has(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, value: doc[key], updated_at: doc.updated_at || null }))
}

export async function listSettings(req, res) {
  try {
    const doc = await collections.settings().findOne({ id: 1 })
    const rows = toSettingsEntries(doc)
    return res.json({ data: rows, meta: { total: rows.length } })
  } catch (err) {
    return res.status(500).json({ message: "failed to list settings", error: err.message })
  }
}

export async function getSetting(req, res) {
  try {
    const key = normalizeKey(req.params.key)
    if (!key) return res.status(400).json({ message: "invalid key" })

    const doc = await collections.settings().findOne({ id: 1 })
    if (!doc || doc[key] === undefined) {
      return res.status(404).json({ message: "setting not found" })
    }

    return res.json({ data: { key, value: doc[key], updated_at: doc.updated_at || null }, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to get setting", error: err.message })
  }
}

export async function upsertSetting(req, res) {
  try {
    const key = normalizeKey(req.params.key)
    if (!key) return res.status(400).json({ message: "invalid key" })
    if (req.body?.value === undefined) {
      return res.status(400).json({ message: "value is required" })
    }

    const value = typeof req.body.value === "string" ? req.body.value : JSON.stringify(req.body.value)
    const now = new Date()

    await collections.settings().updateOne(
      { id: 1 },
      {
        $set: { [key]: value, updated_at: now },
        $setOnInsert: { id: 1, created_at: now },
      },
      { upsert: true }
    )

    const doc = await collections.settings().findOne({ id: 1 })

    await logAudit(null, req, {
      action: "settings_upsert",
      entity_type: "setting",
      entity_id: 1,
      meta: { changed: { key } },
    })

    return res.json({ data: { key, value: doc[key], updated_at: doc.updated_at || null }, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to upsert setting", error: err.message })
  }
}
