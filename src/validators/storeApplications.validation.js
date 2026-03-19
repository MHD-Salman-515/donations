const ALLOWED_DONATION_MODES = ["percentage", "fixed"]
const ALLOWED_TARGET_TYPES = ["campaign", "case", "emergency"]
const ALLOWED_STATUSES = ["pending", "approved", "rejected"]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateCreateStoreApplicationBody(body) {
  const store_name = normalizeText(body?.store_name)
  const owner_name = normalizeText(body?.owner_name)
  const phone = normalizeText(body?.phone)
  const email = normalizeText(body?.email).toLowerCase()
  const city = normalizeText(body?.city)
  const business_category = normalizeText(body?.business_category)
  const description = normalizeText(body?.description) || null
  const donation_mode = normalizeText(body?.donation_mode)
  const target_type = normalizeText(body?.target_type)
  const target_id = toId(body?.target_id)
  const donation_value = Number(body?.donation_value)
  const notes = normalizeText(body?.notes) || null
  const applicant_user_id =
    body?.applicant_user_id === undefined || body?.applicant_user_id === null
      ? null
      : toId(body?.applicant_user_id)

  if (
    !store_name ||
    !owner_name ||
    !phone ||
    !email ||
    !city ||
    !business_category ||
    !donation_mode ||
    !target_type ||
    !target_id ||
    !Number.isFinite(donation_value)
  ) {
    return {
      ok: false,
      message:
        "store_name, owner_name, phone, email, city, business_category, donation_mode, donation_value, target_type, target_id are required",
    }
  }

  if (!isValidEmail(email)) return { ok: false, message: "invalid email format" }
  if (!ALLOWED_DONATION_MODES.includes(donation_mode)) {
    return { ok: false, message: "invalid donation_mode" }
  }
  if (!ALLOWED_TARGET_TYPES.includes(target_type)) return { ok: false, message: "invalid target_type" }
  if (donation_value <= 0) return { ok: false, message: "donation_value must be > 0" }
  if (body?.applicant_user_id !== undefined && body?.applicant_user_id !== null && !applicant_user_id) {
    return { ok: false, message: "invalid applicant_user_id" }
  }

  return {
    ok: true,
    value: {
      store_name,
      owner_name,
      phone,
      email,
      city,
      business_category,
      description,
      donation_mode,
      donation_value,
      target_type,
      target_id,
      notes,
      applicant_user_id,
    },
  }
}

export function validateStoreApplicationsAdminFilters(query) {
  const status = normalizeText(query?.status)
  const city = normalizeText(query?.city)
  const business_category = normalizeText(query?.business_category)
  const q = normalizeText(query?.q)

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return { ok: false, message: "invalid status filter" }
  }

  return {
    ok: true,
    value: {
      status,
      city,
      business_category,
      q,
      ...parsePagination(query, 10, 50),
    },
  }
}

export function validateRejectStoreApplicationBody(body) {
  if (body?.notes !== undefined && typeof body.notes !== "string") {
    return { ok: false, message: "notes must be a string" }
  }

  return {
    ok: true,
    value: {
      notes: normalizeText(body?.notes) || null,
    },
  }
}
