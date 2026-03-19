const ALLOWED_STATUSES = ["active", "inactive", "out_of_stock"]
const ALLOWED_DONATION_MODES = ["inherit", "custom"]
const ALLOWED_DONATION_TYPES = ["percentage", "fixed"]
const ALLOWED_TARGET_TYPES = ["campaign", "case", "emergency"]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toPositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toNonNegativeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function toNonNegativeInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

function toId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

function parseOptionalUrl(value) {
  if (value === undefined) return undefined
  const parsed = normalizeText(value)
  if (!parsed) return null
  try {
    const u = new URL(parsed)
    if (!["http:", "https:"].includes(u.protocol)) return "__INVALID__"
    return parsed
  } catch {
    return "__INVALID__"
  }
}

export function validateCreateStoreProductBody(body) {
  const title = normalizeText(body?.title)
  const description = normalizeText(body?.description) || null
  const price = toPositiveNumber(body?.price)
  const cost_price = toNonNegativeNumber(body?.cost_price)
  const stock = toNonNegativeInt(body?.stock)
  const image_url = parseOptionalUrl(body?.image_url)
  const donation_mode = normalizeText(body?.donation_mode)
  const statusRaw = body?.status === undefined ? "active" : normalizeText(body?.status)

  if (!title || price === null || cost_price === null || stock === null || !donation_mode) {
    return {
      ok: false,
      message: "title, price, cost_price, stock, donation_mode are required",
    }
  }
  if (image_url === "__INVALID__") return { ok: false, message: "invalid image_url" }
  if (!ALLOWED_DONATION_MODES.includes(donation_mode)) {
    return { ok: false, message: "invalid donation_mode" }
  }
  if (!ALLOWED_STATUSES.includes(statusRaw)) return { ok: false, message: "invalid status" }
  if (cost_price > price) return { ok: false, message: "cost_price must not exceed price" }

  let status = statusRaw
  if (stock === 0) status = "out_of_stock"

  let donation_type = null
  let donation_value = null
  let target_type = null
  let target_id = null

  if (donation_mode === "custom") {
    donation_type = normalizeText(body?.donation_type)
    donation_value = toPositiveNumber(body?.donation_value)
    target_type = normalizeText(body?.target_type)
    target_id = toId(body?.target_id)

    if (
      !ALLOWED_DONATION_TYPES.includes(donation_type) ||
      donation_value === null ||
      !ALLOWED_TARGET_TYPES.includes(target_type) ||
      !target_id
    ) {
      return {
        ok: false,
        message:
          "for custom donation_mode: donation_type, donation_value, target_type, target_id are required",
      }
    }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      price,
      cost_price,
      stock,
      status,
      image_url: image_url === undefined ? null : image_url,
      donation_mode,
      donation_type,
      donation_value,
      target_type,
      target_id,
    },
  }
}

export function validateUpdateStoreProductBody(body) {
  const updates = {}

  if (body?.status !== undefined) {
    return { ok: false, message: "use PATCH /api/store/products/:id/status to update status" }
  }
  if (body?.title !== undefined) {
    const title = normalizeText(body.title)
    if (!title) return { ok: false, message: "invalid title" }
    updates.title = title
  }
  if (body?.description !== undefined) {
    updates.description = normalizeText(body.description) || null
  }
  if (body?.price !== undefined) {
    const price = toPositiveNumber(body.price)
    if (price === null) return { ok: false, message: "price must be > 0" }
    updates.price = price
  }
  if (body?.cost_price !== undefined) {
    const cost_price = toNonNegativeNumber(body.cost_price)
    if (cost_price === null) return { ok: false, message: "cost_price must be >= 0" }
    updates.cost_price = cost_price
  }
  if (body?.stock !== undefined) {
    const stock = toNonNegativeInt(body.stock)
    if (stock === null) return { ok: false, message: "stock must be an integer >= 0" }
    updates.stock = stock
  }
  if (body?.image_url !== undefined) {
    const image_url = parseOptionalUrl(body.image_url)
    if (image_url === "__INVALID__") return { ok: false, message: "invalid image_url" }
    updates.image_url = image_url
  }
  if (body?.donation_mode !== undefined) {
    const donation_mode = normalizeText(body.donation_mode)
    if (!ALLOWED_DONATION_MODES.includes(donation_mode)) {
      return { ok: false, message: "invalid donation_mode" }
    }
    updates.donation_mode = donation_mode
  }
  if (body?.donation_type !== undefined) {
    const donation_type = normalizeText(body.donation_type)
    if (!ALLOWED_DONATION_TYPES.includes(donation_type)) {
      return { ok: false, message: "invalid donation_type" }
    }
    updates.donation_type = donation_type
  }
  if (body?.donation_value !== undefined) {
    const donation_value = toPositiveNumber(body.donation_value)
    if (donation_value === null) return { ok: false, message: "donation_value must be > 0" }
    updates.donation_value = donation_value
  }
  if (body?.target_type !== undefined) {
    const target_type = normalizeText(body.target_type)
    if (!ALLOWED_TARGET_TYPES.includes(target_type)) {
      return { ok: false, message: "invalid target_type" }
    }
    updates.target_type = target_type
  }
  if (body?.target_id !== undefined) {
    const target_id = toId(body.target_id)
    if (!target_id) return { ok: false, message: "invalid target_id" }
    updates.target_id = target_id
  }

  if (!Object.keys(updates).length) {
    return { ok: false, message: "no valid fields to update" }
  }

  return { ok: true, value: updates }
}

export function validateStoreProductStatusBody(body) {
  const status = normalizeText(body?.status)
  if (!ALLOWED_STATUSES.includes(status)) return { ok: false, message: "invalid status" }
  return { ok: true, value: { status } }
}

export function validatePublicStoreProductsFilters(query) {
  const q = normalizeText(query?.q)
  const city = normalizeText(query?.city)
  const business_category = normalizeText(query?.business_category)
  const donation_mode = normalizeText(query?.donation_mode)
  const min_price = query?.min_price === undefined ? null : toNonNegativeNumber(query?.min_price)
  const max_price = query?.max_price === undefined ? null : toNonNegativeNumber(query?.max_price)

  if (donation_mode && !ALLOWED_DONATION_MODES.includes(donation_mode)) {
    return { ok: false, message: "invalid donation_mode filter" }
  }
  if (query?.min_price !== undefined && min_price === null) {
    return { ok: false, message: "invalid min_price" }
  }
  if (query?.max_price !== undefined && max_price === null) {
    return { ok: false, message: "invalid max_price" }
  }
  if (min_price !== null && max_price !== null && min_price > max_price) {
    return { ok: false, message: "min_price cannot be greater than max_price" }
  }

  return {
    ok: true,
    value: {
      q,
      city,
      business_category,
      donation_mode,
      min_price,
      max_price,
      ...parsePagination(query, 10, 50),
    },
  }
}

