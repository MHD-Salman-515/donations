const ALLOWED_SUPPORT_TYPES = ["quick", "custom"]
const ALLOWED_SUPPORT_STATUSES = ["visible", "hidden", "flagged"]
const ALLOWED_REPORT_REASONS = ["spam", "abuse", "suspicious", "other"]

const URL_REGEX = /(https?:\/\/|www\.)\S+/i
const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/i
const IBAN_LIKE_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i
const AUTO_FLAG_REGEX = /\b(whatsapp|telegram|send money|bank transfer|wire)\b/i

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

export function validateCreateSupportBody(body) {
  const type = normalizeText(body?.type)
  const quick_key = normalizeText(body?.quick_key)
  const message = normalizeText(body?.message)

  if (!ALLOWED_SUPPORT_TYPES.includes(type)) {
    return { ok: false, message: "invalid type" }
  }

  const hasQuick = Boolean(quick_key)
  const hasMessage = Boolean(message)
  if ((hasQuick && hasMessage) || (!hasQuick && !hasMessage)) {
    return { ok: false, message: "exactly one of quick_key or message is required" }
  }

  if (type === "quick" && !hasQuick) {
    return { ok: false, message: "quick_key is required for quick type" }
  }

  if (type === "custom") {
    if (!hasMessage) return { ok: false, message: "message is required for custom type" }
    if (message.length < 5 || message.length > 150) {
      return { ok: false, message: "message length must be between 5 and 150" }
    }
    if (URL_REGEX.test(message) || PHONE_REGEX.test(message) || IBAN_LIKE_REGEX.test(message)) {
      return { ok: false, message: "message contains blocked content" }
    }
  }

  const auto_flag = type === "custom" ? AUTO_FLAG_REGEX.test(message.toLowerCase()) : false
  return {
    ok: true,
    value: {
      type,
      quick_key: hasQuick ? quick_key : null,
      message: hasMessage ? message : null,
      moderation: { auto_flag, reason: auto_flag ? "auto_moderation" : null },
      status: auto_flag ? "flagged" : "visible",
    },
  }
}

export function validateReportBody(body) {
  const reason = normalizeText(body?.reason)
  const note = normalizeText(body?.note)

  if (!ALLOWED_REPORT_REASONS.includes(reason)) {
    return { ok: false, message: "invalid reason" }
  }
  if (note && note.length > 300) {
    return { ok: false, message: "note is too long" }
  }

  return { ok: true, value: { reason, note: note || null } }
}

export function validateAdminSupportPatchBody(body) {
  const status = normalizeText(body?.status)
  const moderation_reason = normalizeText(body?.moderation_reason)

  if (!["visible", "hidden"].includes(status)) {
    return { ok: false, message: "invalid status" }
  }

  return {
    ok: true,
    value: {
      status,
      moderation_reason: moderation_reason || null,
    },
  }
}

export function validateAdminSupportFilters(query) {
  const status = normalizeText(query?.status)
  const campaign_id = query?.campaign_id === undefined ? null : toId(query.campaign_id)
  const q = normalizeText(query?.q)

  if (status && !ALLOWED_SUPPORT_STATUSES.includes(status)) {
    return { ok: false, message: "invalid status filter" }
  }
  if (query?.campaign_id !== undefined && !campaign_id) {
    return { ok: false, message: "invalid campaign_id filter" }
  }

  return {
    ok: true,
    value: {
      status,
      campaign_id,
      q,
    },
  }
}
