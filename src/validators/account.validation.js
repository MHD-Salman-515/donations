import { normalizeLang } from "../utils/i18n.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_UPDATE_FIELDS = new Set(["name", "email", "preferredLanguage"])

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

export function validateAccountUpdateBody(body) {
  const payload = body && typeof body === "object" && !Array.isArray(body) ? body : {}
  const keys = Object.keys(payload)

  if (!keys.length) {
    return { ok: false, message: "no valid fields to update" }
  }

  const forbiddenFields = keys.filter((key) => !ALLOWED_UPDATE_FIELDS.has(key))
  if (forbiddenFields.length) {
    return { ok: false, message: `forbidden fields: ${forbiddenFields.join(", ")}` }
  }

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = normalizeText(payload.name)
    if (!name) return { ok: false, message: "invalid name" }
    updates.name = name
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    const email = normalizeText(payload.email).toLowerCase()
    if (!email || !EMAIL_REGEX.test(email)) {
      return { ok: false, message: "invalid email format" }
    }
    updates.email = email
  }

  if (Object.prototype.hasOwnProperty.call(payload, "preferredLanguage")) {
    const preferredLanguage = normalizeLang(payload.preferredLanguage)
    if (!preferredLanguage) {
      return { ok: false, message: "invalid preferredLanguage" }
    }
    updates.preferredLanguage = preferredLanguage
  }

  if (!Object.keys(updates).length) {
    return { ok: false, message: "no valid fields to update" }
  }

  return { ok: true, value: updates }
}

export function validateChangePasswordBody(body) {
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""

  if (!currentPassword) {
    return { ok: false, message: "currentPassword is required" }
  }
  if (!newPassword) {
    return { ok: false, message: "newPassword is required" }
  }
  if (newPassword.length < 6) {
    return { ok: false, message: "newPassword must be at least 6 chars" }
  }

  return { ok: true, value: { currentPassword, newPassword } }
}
