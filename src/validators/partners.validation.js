const ALLOWED_STATUSES = ["active", "inactive"]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeOrNull(value) {
  const v = normalizeText(value)
  return v || null
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
  const pageRaw = Number(query?.page)
  const limitRaw = Number(query?.limit)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

export function validateCreatePartnerBody(body) {
  const name = normalizeText(body?.name)
  const description = normalizeText(body?.description)
  const logo_url_raw = normalizeText(body?.logo_url)
  const status = body?.status ? normalizeText(body.status) : "active"

  if (!name || name.length < 3 || name.length > 80) {
    return { ok: false, message: "name must be between 3 and 80 characters" }
  }
  if (description && description.length > 500) {
    return { ok: false, message: "description must be at most 500 characters" }
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    return { ok: false, message: "invalid status" }
  }

  const logo_url = logo_url_raw || null
  if (logo_url && !isValidUrl(logo_url)) {
    return { ok: false, message: "invalid logo_url" }
  }

  const contact_email = normalizeOrNull(body?.contact?.email)
  const contact_phone = normalizeOrNull(body?.contact?.phone)
  const contact_website = normalizeOrNull(body?.contact?.website)
  if (contact_email && !isValidEmail(contact_email)) {
    return { ok: false, message: "invalid contact email" }
  }
  if (contact_website && !isValidUrl(contact_website)) {
    return { ok: false, message: "invalid contact website" }
  }

  return {
    ok: true,
    value: {
      name,
      description: description || null,
      logo_url,
      contact: {
        email: contact_email,
        phone: contact_phone,
        website: contact_website,
      },
      location: {
        city: normalizeOrNull(body?.location?.city),
        country: normalizeOrNull(body?.location?.country),
      },
      status,
    },
  }
}

export function validateUpdatePartnerBody(body) {
  const updates = {}

  if (body?.name !== undefined) {
    const name = normalizeText(body.name)
    if (!name || name.length < 3 || name.length > 80) {
      return { ok: false, message: "name must be between 3 and 80 characters" }
    }
    updates.name = name
  }

  if (body?.description !== undefined) {
    const description = normalizeText(body.description)
    if (description && description.length > 500) {
      return { ok: false, message: "description must be at most 500 characters" }
    }
    updates.description = description || null
  }

  if (body?.logo_url !== undefined) {
    const logo_url = normalizeText(body.logo_url) || null
    if (logo_url && !isValidUrl(logo_url)) {
      return { ok: false, message: "invalid logo_url" }
    }
    updates.logo_url = logo_url
  }

  if (body?.contact !== undefined) {
    const contact_email = normalizeOrNull(body?.contact?.email)
    const contact_phone = normalizeOrNull(body?.contact?.phone)
    const contact_website = normalizeOrNull(body?.contact?.website)
    if (contact_email && !isValidEmail(contact_email)) {
      return { ok: false, message: "invalid contact email" }
    }
    if (contact_website && !isValidUrl(contact_website)) {
      return { ok: false, message: "invalid contact website" }
    }
    updates.contact = {
      email: contact_email,
      phone: contact_phone,
      website: contact_website,
    }
  }

  if (body?.location !== undefined) {
    updates.location = {
      city: normalizeOrNull(body?.location?.city),
      country: normalizeOrNull(body?.location?.country),
    }
  }

  if (body?.status !== undefined) {
    const status = normalizeText(body.status)
    if (!ALLOWED_STATUSES.includes(status)) {
      return { ok: false, message: "invalid status" }
    }
    updates.status = status
  }

  if (!Object.keys(updates).length) {
    return { ok: false, message: "no valid fields to update" }
  }

  return { ok: true, value: updates }
}

export function validatePartnerStatusBody(body) {
  const status = normalizeText(body?.status)
  if (!ALLOWED_STATUSES.includes(status)) {
    return { ok: false, message: "invalid status" }
  }
  return { ok: true, value: { status } }
}

export function validatePartnerListFilters(query, { admin = false } = {}) {
  const q = normalizeText(query?.q)
  const status = normalizeText(query?.status)
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return { ok: false, message: "invalid status filter" }
  }

  const filter = {}
  if (admin) {
    if (status) filter.status = status
  } else {
    filter.status = "active"
  }
  if (q) filter.name = { $regex: q, $options: "i" }

  return { ok: true, value: { filter } }
}

export function validatePartnerLinkBody(body) {
  if (!Object.prototype.hasOwnProperty.call(body || {}, "partner_id")) {
    return { ok: false, message: "partner_id is required" }
  }

  if (body.partner_id === null) {
    return { ok: true, value: { partner_id: null } }
  }

  const partnerId = Number(body.partner_id)
  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    return { ok: false, message: "invalid partner_id" }
  }

  return { ok: true, value: { partner_id: partnerId } }
}
