import { collections } from "../config/db.js"
import { normalizeSectionKey } from "../utils/mainSections.js"

const DEFAULT_PUBLIC_PROJECTION = {
  _id: 0,
  key: 1,
  title: 1,
  slug: 1,
  icon: 1,
  theme: 1,
  summary: 1,
  order: 1,
}

export async function listMainSections(req, res) {
  try {
    const rows = await collections
      .mainSections()
      .find({ isActive: true }, { projection: DEFAULT_PUBLIC_PROJECTION })
      .sort({ order: 1, key: 1 })
      .toArray()

    return res.json({ data: rows, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to list main sections", error: err.message })
  }
}

export async function getMainSectionByKey(req, res) {
  try {
    const key = normalizeSectionKey(req.params?.key)
    if (!key) return res.status(400).json({ message: "invalid key" })

    const row = await collections.mainSections().findOne({ key, isActive: true }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ message: "section not found" })

    return res.json({ data: row, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to get main section", error: err.message })
  }
}
