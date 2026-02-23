const ALLOWED_CASE_TYPES = [
  "medical",
  "reconstruction",
  "humanitarian",
  "orphan_sponsorship",
  "elderly_support",
]

const ALLOWED_CASE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "active",
  "completed",
  "paused",
]

const ALLOWED_CASE_CREATE_STATUSES = ["draft", "submitted"]
const ALLOWED_CASE_EDITABLE_STATUSES = ["draft", "submitted"]
const ALLOWED_CASE_PRIORITIES = ["low", "normal", "high", "urgent"]
const ALLOWED_PRIVACY_MODES = ["public", "masked"]

const ALLOWED_CASE_DOCUMENT_TYPES = [
  "medical_report",
  "id_doc",
  "proof",
  "before_photo",
  "after_photo",
  "other",
]

const ALLOWED_CASE_UPDATE_KINDS = [
  "medical_progress",
  "field_report",
  "before_after",
  "monthly_report",
  "general",
]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function toPositiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function parseDateOrNull(value) {
  if (value === undefined || value === null || value === "") return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function parseMaskedDisplay(raw = {}) {
  const aliasNameRaw = raw?.alias_name
  const hideImagesRaw = raw?.hide_images

  const alias_name =
    aliasNameRaw === undefined || aliasNameRaw === null
      ? null
      : normalizeText(aliasNameRaw) || null

  const hide_images = hideImagesRaw === undefined ? false : Boolean(hideImagesRaw)

  return { alias_name, hide_images }
}

function parseLocation(raw) {
  if (raw === undefined || raw === null) return { value: null, error: null }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { value: null, error: "location must be an object" }
  }

  const coordinates = raw.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return { value: null, error: "location.coordinates must be [lng, lat]" }
  }

  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { value: null, error: "invalid longitude" }
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { value: null, error: "invalid latitude" }
  }

  return {
    value: {
      type: "Point",
      coordinates: [lng, lat],
      city: normalizeText(raw.city),
      area: normalizeText(raw.area),
      address_text: normalizeText(raw.address_text),
    },
    error: null,
  }
}

export function parsePagination(query, defaultLimit = 10, maxLimit = 100) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const safeLimit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, maxLimit)
      : defaultLimit
  return { page, limit: safeLimit, skip: (page - 1) * safeLimit }
}

export function validateCreateCaseBody(body) {
  const type = normalizeText(body?.type)
  const title = normalizeText(body?.title)
  const description = normalizeText(body?.description)
  const category = normalizeText(body?.category)
  const currency = normalizeText(body?.currency)
  const status = body?.status === undefined ? "draft" : normalizeText(body.status)
  const priority = body?.priority ? normalizeText(body.priority) : "normal"
  const privacy_mode = body?.privacy_mode ? normalizeText(body.privacy_mode) : "public"
  const target_amount = toNumber(body?.target_amount)
  const start_date = parseDateOrNull(body?.start_date)
  const end_date = parseDateOrNull(body?.end_date)

  if (
    !type ||
    !title ||
    !description ||
    !category ||
    !currency ||
    Number.isNaN(target_amount)
  ) {
    return { ok: false, message: "type, title, description, category, target_amount, currency are required" }
  }
  if (!ALLOWED_CASE_TYPES.includes(type)) return { ok: false, message: "invalid type" }
  if (!ALLOWED_CASE_CREATE_STATUSES.includes(status)) return { ok: false, message: "invalid status" }
  if (!ALLOWED_CASE_PRIORITIES.includes(priority)) return { ok: false, message: "invalid priority" }
  if (!ALLOWED_PRIVACY_MODES.includes(privacy_mode)) return { ok: false, message: "invalid privacy_mode" }
  if (target_amount <= 0) return { ok: false, message: "target_amount must be > 0" }
  if (body?.start_date !== undefined && !start_date) return { ok: false, message: "invalid start_date" }
  if (body?.end_date !== undefined && !end_date) return { ok: false, message: "invalid end_date" }

  const parsedLocation = parseLocation(body?.location)
  if (parsedLocation.error) return { ok: false, message: parsedLocation.error }

  return {
    ok: true,
    value: {
      type,
      title,
      description,
      category,
      target_amount,
      currency,
      status,
      priority,
      privacy_mode,
      masked_display: parseMaskedDisplay(body?.masked_display),
      location: parsedLocation.value,
      start_date,
      end_date,
    },
  }
}

export function validateUpdateCaseBody(body) {
  const updates = {}

  if (body?.type !== undefined) {
    const type = normalizeText(body.type)
    if (!ALLOWED_CASE_TYPES.includes(type)) return { ok: false, message: "invalid type" }
    updates.type = type
  }
  if (body?.title !== undefined) {
    const title = normalizeText(body.title)
    if (!title) return { ok: false, message: "invalid title" }
    updates.title = title
  }
  if (body?.description !== undefined) {
    const description = normalizeText(body.description)
    if (!description) return { ok: false, message: "invalid description" }
    updates.description = description
  }
  if (body?.category !== undefined) {
    const category = normalizeText(body.category)
    if (!category) return { ok: false, message: "invalid category" }
    updates.category = category
  }
  if (body?.currency !== undefined) {
    const currency = normalizeText(body.currency)
    if (!currency) return { ok: false, message: "invalid currency" }
    updates.currency = currency
  }
  if (body?.status !== undefined) {
    const status = normalizeText(body.status)
    if (!ALLOWED_CASE_CREATE_STATUSES.includes(status)) return { ok: false, message: "invalid status" }
    updates.status = status
  }
  if (body?.priority !== undefined) {
    const priority = normalizeText(body.priority)
    if (!ALLOWED_CASE_PRIORITIES.includes(priority)) return { ok: false, message: "invalid priority" }
    updates.priority = priority
  }
  if (body?.privacy_mode !== undefined) {
    const privacy_mode = normalizeText(body.privacy_mode)
    if (!ALLOWED_PRIVACY_MODES.includes(privacy_mode)) return { ok: false, message: "invalid privacy_mode" }
    updates.privacy_mode = privacy_mode
  }
  if (body?.target_amount !== undefined) {
    const target_amount = toNumber(body.target_amount)
    if (Number.isNaN(target_amount) || target_amount <= 0) {
      return { ok: false, message: "target_amount must be > 0" }
    }
    updates.target_amount = target_amount
  }
  if (body?.masked_display !== undefined) {
    updates.masked_display = parseMaskedDisplay(body.masked_display)
  }
  if (body?.location !== undefined) {
    const parsedLocation = parseLocation(body.location)
    if (parsedLocation.error) return { ok: false, message: parsedLocation.error }
    updates.location = parsedLocation.value
  }
  if (body?.start_date !== undefined) {
    const start_date = parseDateOrNull(body.start_date)
    if (!start_date) return { ok: false, message: "invalid start_date" }
    updates.start_date = start_date
  }
  if (body?.end_date !== undefined) {
    const end_date = parseDateOrNull(body.end_date)
    if (!end_date) return { ok: false, message: "invalid end_date" }
    updates.end_date = end_date
  }

  if (!Object.keys(updates).length) {
    return { ok: false, message: "no valid fields to update" }
  }

  return { ok: true, value: updates }
}

export function validateCreateCaseDocumentBody(body) {
  const type = normalizeText(body?.type)
  const file_url = normalizeText(body?.file_url)
  const mime_type = normalizeText(body?.mime_type)
  const size_bytes = toPositiveInt(body?.size_bytes)

  if (!type || !file_url || !mime_type || !size_bytes) {
    return { ok: false, message: "type, file_url, mime_type, size_bytes are required" }
  }
  if (!ALLOWED_CASE_DOCUMENT_TYPES.includes(type)) return { ok: false, message: "invalid document type" }
  if (!isValidUrl(file_url)) return { ok: false, message: "invalid file_url" }

  return { ok: true, value: { type, file_url, mime_type, size_bytes } }
}

export function validateAdminStatusPatchBody(body) {
  const status = normalizeText(body?.status)
  const rejection_reason = normalizeText(body?.rejection_reason) || null
  const allowed = ["under_review", "approved", "rejected", "active", "paused", "completed"]

  if (!allowed.includes(status)) return { ok: false, message: "invalid status" }
  if (status === "rejected" && !rejection_reason) {
    return { ok: false, message: "rejection_reason is required for rejected status" }
  }

  return { ok: true, value: { status, rejection_reason } }
}

export function validateAdminPriorityPatchBody(body) {
  const priority = normalizeText(body?.priority)
  if (!ALLOWED_CASE_PRIORITIES.includes(priority)) return { ok: false, message: "invalid priority" }
  return { ok: true, value: { priority } }
}

export function validateVerifyCaseDocumentBody(body) {
  if (typeof body?.verified !== "boolean") {
    return { ok: false, message: "verified must be boolean" }
  }
  return { ok: true, value: { verified: body.verified } }
}

export function validateCreateCaseUpdateBody(body) {
  const kind = normalizeText(body?.kind)
  const content = normalizeText(body?.content)
  const media_urls = Array.isArray(body?.media_urls)
    ? body.media_urls.map((item) => normalizeText(item)).filter(Boolean)
    : []

  if (!kind || !content) return { ok: false, message: "kind and content are required" }
  if (!ALLOWED_CASE_UPDATE_KINDS.includes(kind)) return { ok: false, message: "invalid kind" }

  for (const url of media_urls) {
    if (!isValidUrl(url)) return { ok: false, message: "invalid media_urls entry" }
  }

  return { ok: true, value: { kind, content, media_urls } }
}

export function validatePublicMapQuery(query) {
  const hasBbox =
    query?.minLng !== undefined &&
    query?.minLat !== undefined &&
    query?.maxLng !== undefined &&
    query?.maxLat !== undefined

  const hasCenterRadius =
    query?.centerLng !== undefined &&
    query?.centerLat !== undefined &&
    query?.radiusKm !== undefined

  if (!hasBbox && !hasCenterRadius) {
    return { ok: false, message: "provide bbox (minLng,minLat,maxLng,maxLat) or centerLng,centerLat,radiusKm" }
  }

  if (hasBbox) {
    const minLng = Number(query.minLng)
    const minLat = Number(query.minLat)
    const maxLng = Number(query.maxLng)
    const maxLat = Number(query.maxLat)

    if (
      !Number.isFinite(minLng) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLng) ||
      !Number.isFinite(maxLat)
    ) {
      return { ok: false, message: "invalid bbox values" }
    }

    return { ok: true, value: { mode: "bbox", minLng, minLat, maxLng, maxLat } }
  }

  const centerLng = Number(query.centerLng)
  const centerLat = Number(query.centerLat)
  const radiusKm = Number(query.radiusKm)
  if (!Number.isFinite(centerLng) || !Number.isFinite(centerLat) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return { ok: false, message: "invalid center/radius values" }
  }

  return { ok: true, value: { mode: "radius", centerLng, centerLat, radiusKm } }
}

export {
  ALLOWED_CASE_TYPES,
  ALLOWED_CASE_STATUSES,
  ALLOWED_CASE_EDITABLE_STATUSES,
  ALLOWED_CASE_PRIORITIES,
  ALLOWED_PRIVACY_MODES,
}
