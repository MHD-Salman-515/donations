const ALLOWED_DONATION_TYPES = ["percentage", "fixed"]
const ALLOWED_TARGET_TYPES = ["campaign", "case", "emergency"]
const ALLOWED_ORDER_STATUSES = ["pending", "completed", "cancelled"]

function toId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function toPositiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function toPositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

export function validateCreateOrderBody(body) {
  const product_id = toId(body?.product_id)
  const quantity = toPositiveInt(body?.quantity)

  if (!product_id || !quantity) {
    return { ok: false, message: "product_id and quantity are required" }
  }

  return { ok: true, value: { product_id, quantity } }
}

export function validateResolvedDonationConfig(config) {
  if (!config || typeof config !== "object") {
    return { ok: false, message: "missing donation configuration" }
  }

  const donation_type = String(config.donation_type || "").trim()
  const donation_value = toPositiveNumber(config.donation_value)
  const target_type = String(config.target_type || "").trim()
  const target_id = toId(config.target_id)

  if (!ALLOWED_DONATION_TYPES.includes(donation_type)) {
    return { ok: false, message: "invalid donation_type" }
  }
  if (donation_value === null) {
    return { ok: false, message: "invalid donation_value" }
  }
  if (!ALLOWED_TARGET_TYPES.includes(target_type)) {
    return { ok: false, message: "invalid target_type" }
  }
  if (!target_id) {
    return { ok: false, message: "invalid target_id" }
  }

  return { ok: true, value: { donation_type, donation_value, target_type, target_id } }
}

export function isValidOrderStatus(status) {
  return ALLOWED_ORDER_STATUSES.includes(status)
}

