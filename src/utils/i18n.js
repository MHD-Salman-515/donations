const SUPPORTED_LANGS = new Set(["ar", "en"])

export function normalizeLang(value) {
  if (!value || typeof value !== "string") return null
  const normalized = value.trim().toLowerCase().split("-")[0]
  return SUPPORTED_LANGS.has(normalized) ? normalized : null
}

export function pickLang(i18nObject, lang) {
  if (!i18nObject || typeof i18nObject !== "object") return ""
  const selectedLang = normalizeLang(lang) || "en"
  return i18nObject[selectedLang] || i18nObject.en || i18nObject.ar || ""
}

export function pickI18n(doc, fields = [], lang) {
  const base = doc && typeof doc.toObject === "function" ? doc.toObject() : { ...(doc || {}) }

  for (const field of fields) {
    base[field] = pickLang(base[field], lang)
  }

  return base
}
