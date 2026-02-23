const ALLOWED_PAYMENT_METHODS = ["card", "bank", "cash", "paypal"]
const ALLOWED_PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function parseDateOrNull(value) {
  if (value === undefined || value === null || value === "") return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

export function buildDateFilter(field, from, to) {
  const filter = {}
  const fromDate = parseDateOrNull(from)
  const toDate = parseDateOrNull(to)
  if (from && !fromDate) return { error: "invalid from date" }
  if (to && !toDate) return { error: "invalid to date" }
  if (fromDate) filter.$gte = fromDate
  if (toDate) filter.$lte = toDate
  return { value: Object.keys(filter).length ? { [field]: filter } : {} }
}

export function validateEmergencyDonateBody(body) {
  const amount = Number(body?.amount)
  const payment_method = normalizeText(body?.payment_method)
  const payment_status = body?.payment_status ? normalizeText(body.payment_status) : "paid"
  const emergency_id = body?.emergency_id === undefined ? 1 : Number(body.emergency_id)

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "amount must be > 0" }
  }
  if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
    return { ok: false, message: "invalid payment_method" }
  }
  if (!ALLOWED_PAYMENT_STATUSES.includes(payment_status)) {
    return { ok: false, message: "invalid payment_status" }
  }
  if (!Number.isInteger(emergency_id) || emergency_id <= 0) {
    return { ok: false, message: "invalid emergency_id" }
  }

  return { ok: true, value: { amount, payment_method, payment_status, emergency_id } }
}

export function validateEmergencyUpdateBody(body) {
  const updates = {}

  if (body?.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") return { ok: false, message: "enabled must be boolean" }
    updates.enabled = body.enabled
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

  if (body?.currency !== undefined) {
    const currency = normalizeText(body.currency)
    if (!currency) return { ok: false, message: "invalid currency" }
    updates.currency = currency
  }

  if (body?.target_amount !== undefined) {
    const target_amount = Number(body.target_amount)
    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return { ok: false, message: "target_amount must be > 0" }
    }
    updates.target_amount = target_amount
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
