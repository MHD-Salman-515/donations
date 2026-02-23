import { normalizeLang } from "../utils/i18n.js"

const DEFAULT_LANG = "en"

function parseAcceptLanguage(headerValue) {
  if (!headerValue || typeof headerValue !== "string") return null

  const parts = headerValue.split(",")
  for (const part of parts) {
    const candidate = part.split(";")[0]?.trim()
    const lang = normalizeLang(candidate)
    if (lang) return lang
  }

  return null
}

export function detectLanguage(req, _res, next) {
  const headerLang = normalizeLang(req.headers["x-lang"]) || parseAcceptLanguage(req.headers["accept-language"])
  const userLang = normalizeLang(req.user?.preferredLanguage)

  req.lang = headerLang || userLang || DEFAULT_LANG
  next()
}
