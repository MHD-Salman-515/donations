function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeText(item)).filter(Boolean)
}

function normalizeLocalizedText(value, fieldName, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) return { error: `${fieldName} is required` }
    return { value: null }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: `${fieldName} must be an object` }
  }

  const ar = normalizeText(value.ar)
  const en = normalizeText(value.en)
  if (required && !ar && !en) return { error: `${fieldName}.ar or ${fieldName}.en is required` }

  return { value: { ar, en } }
}

function normalizeObject(value, fieldName, { allowArray = false } = {}) {
  if (value === undefined) return { value: undefined }
  if (value === null) return { value: null }
  if (typeof value !== "object") return { error: `${fieldName} must be an object` }
  if (!allowArray && Array.isArray(value)) return { error: `${fieldName} must be an object` }
  return { value }
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeOrder(value) {
  if (value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function normalizeCommonPayload(body, { isCreate = false } = {}) {
  const out = {}

  if (isCreate || body?.key !== undefined) {
    const key = normalizeKey(body?.key)
    if (!key) return { ok: false, message: "key is required" }
    out.key = key
  }

  if (isCreate || body?.title !== undefined) {
    const title = normalizeLocalizedText(body?.title, "title", { required: isCreate })
    if (title.error) return { ok: false, message: title.error }
    out.title = title.value
  }

  if (body?.slug !== undefined) out.slug = normalizeText(body.slug) || null
  if (body?.icon !== undefined) out.icon = normalizeText(body.icon) || null

  if (body?.theme !== undefined) {
    const theme = normalizeObject(body.theme, "theme")
    if (theme.error) return { ok: false, message: theme.error }
    out.theme = theme.value
  }

  if (body?.summary !== undefined || isCreate) {
    const summary = normalizeLocalizedText(body?.summary, "summary")
    if (summary.error) return { ok: false, message: summary.error }
    out.summary = summary.value
  }

  if (body?.supportModes !== undefined) {
    if (!Array.isArray(body.supportModes)) return { ok: false, message: "supportModes must be an array" }
    out.supportModes = normalizeTextArray(body.supportModes)
  }

  const arrayFields = ["categories", "table", "requirements", "documentation", "examples", "kpis"]
  for (const field of arrayFields) {
    if (body?.[field] !== undefined) {
      if (!Array.isArray(body[field])) return { ok: false, message: `${field} must be an array` }
      out[field] = body[field]
    }
  }

  for (const field of ["followUp", "display"]) {
    if (body?.[field] !== undefined) {
      const parsed = normalizeObject(body[field], field)
      if (parsed.error) return { ok: false, message: parsed.error }
      out[field] = parsed.value
    }
  }

  if (body?.access !== undefined) {
    const access = normalizeObject(body.access, "access")
    if (access.error) return { ok: false, message: access.error }
    out.access = access.value
  }

  if (body?.order !== undefined || isCreate) {
    const order = normalizeOrder(body?.order)
    if (Number.isNaN(order)) return { ok: false, message: "order must be a number" }
    out.order = order
  }

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { ok: false, message: "isActive must be boolean" }
    out.isActive = body.isActive
  }

  return { ok: true, value: out }
}

export function validateCreateMainSectionBody(body) {
  return normalizeCommonPayload(body, { isCreate: true })
}

export function validateUpdateMainSectionBody(body) {
  const valid = normalizeCommonPayload(body || {}, { isCreate: false })
  if (!valid.ok) return valid
  if (!Object.keys(valid.value).length) return { ok: false, message: "no valid fields to update" }
  if (Object.prototype.hasOwnProperty.call(valid.value, "key")) {
    return { ok: false, message: "key cannot be changed" }
  }
  return valid
}

export function validateReorderMainSectionsBody(body) {
  const rawItems = Array.isArray(body) ? body : body?.items
  if (!Array.isArray(rawItems) || !rawItems.length) {
    return { ok: false, message: "reorder payload must be a non-empty array" }
  }

  const seen = new Set()
  const items = []
  for (const row of rawItems) {
    const key = normalizeKey(row?.key)
    const order = Number(row?.order)
    if (!key || !Number.isFinite(order)) {
      return { ok: false, message: "each reorder item must include key and numeric order" }
    }
    if (seen.has(key)) return { ok: false, message: "duplicate key in reorder payload" }
    seen.add(key)
    items.push({ key, order })
  }

  return { ok: true, value: { items } }
}
