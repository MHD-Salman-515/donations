import { collections } from "../config/db.js"

export function normalizeSectionKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function findMainSectionByKey(key, { activeOnly = false, projection = { _id: 0 } } = {}) {
  const normalizedKey = normalizeSectionKey(key)
  if (!normalizedKey) return null

  return collections.mainSections().findOne(
    { key: normalizedKey, ...(activeOnly ? { isActive: true } : {}) },
    { projection }
  )
}

export async function isValidActiveCaseType(typeKey) {
  const row = await findMainSectionByKey(typeKey, { activeOnly: true, projection: { _id: 0, key: 1 } })
  return Boolean(row)
}

export async function isKnownCaseType(typeKey) {
  const row = await findMainSectionByKey(typeKey, { projection: { _id: 0, key: 1 } })
  return Boolean(row)
}
