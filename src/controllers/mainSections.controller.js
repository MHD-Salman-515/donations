import { collections } from "../config/db.js"
import { normalizeSectionKey } from "../utils/mainSections.js"

const DEFAULT_PUBLIC_PROJECTION = {
  _id: 0,
  key: 1,
  title: 1,
  slug: 1,
  icon: 1,
  theme: 1,
  summary: 1,
  order: 1,
}

function pickLang(value, lang) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  if (!Object.prototype.hasOwnProperty.call(value, "ar") && !Object.prototype.hasOwnProperty.call(value, "en")) {
    return value
  }
  return value?.[lang] ?? value?.ar ?? value?.en ?? ""
}

function transformMainSectionForPublic(section, lang) {
  if (!section || typeof section !== "object") return section

  const transformed = { ...section }

  transformed.title = pickLang(section?.title, lang)
  transformed.summary = pickLang(section?.summary, lang)

  if (section?.display && typeof section.display === "object") {
    transformed.display = { ...section.display }
    transformed.display.hero = pickLang(section.display?.hero, lang)
    transformed.display.highlights = Array.isArray(section.display?.highlights)
      ? section.display.highlights.map((item) => pickLang(item, lang))
      : section.display?.highlights
  }

  transformed.categories = Array.isArray(section?.categories)
    ? section.categories.map((category) => ({
        ...category,
        name: pickLang(category?.name, lang),
      }))
    : section?.categories

  transformed.table = Array.isArray(section?.table)
    ? section.table.map((row) => ({
        ...row,
        label: pickLang(row?.label, lang),
        value:
          row?.value &&
          typeof row.value === "object" &&
          !Array.isArray(row.value)
            ? pickLang(row.value, lang)
            : row?.value,
      }))
    : section?.table

  transformed.examples = Array.isArray(section?.examples)
    ? section.examples.map((item) => pickLang(item, lang))
    : section?.examples

  transformed.kpis = Array.isArray(section?.kpis)
    ? section.kpis.map((kpi) => ({
        ...kpi,
        label: pickLang(kpi?.label, lang),
      }))
    : section?.kpis

  // requirements titles
  transformed.requirements = Array.isArray(section?.requirements)
    ? section.requirements.map((r) => ({
        ...r,
        title: pickLang(r?.title, lang),
      }))
    : section?.requirements

  // documentation titles
  transformed.documentation = Array.isArray(section?.documentation)
    ? section.documentation.map((d) => ({
        ...d,
        title: pickLang(d?.title, lang),
      }))
    : section?.documentation

  // followUp nested titles
  if (section?.followUp && typeof section.followUp === "object") {
    transformed.followUp = { ...section.followUp }

    transformed.followUp.checklist = Array.isArray(section.followUp?.checklist)
      ? section.followUp.checklist.map((c) => ({
          ...c,
          title: pickLang(c?.title, lang),
        }))
      : section.followUp?.checklist

    transformed.followUp.stages = Array.isArray(section.followUp?.stages)
      ? section.followUp.stages.map((s) => ({
          ...s,
          title: pickLang(s?.title, lang),
        }))
      : section.followUp?.stages

    transformed.followUp.templates = Array.isArray(section.followUp?.templates)
      ? section.followUp.templates.map((t) => ({
          ...t,
          title: pickLang(t?.title, lang),
        }))
      : section.followUp?.templates
  }

  delete transformed.access

  return transformed
}

export async function listMainSections(req, res) {
  try {
    const lang = req.query.lang === "en" ? "en" : "ar"
    res.set("X-MainSections-Lang", lang)
    res.set("X-MainSections-Localized", "1")
    res.set("X-I18N-Transform", "table-value-v1")
    res.set("X-I18N-Lang", lang)
    const rows = await collections
      .mainSections()
      .find({ isActive: true }, { projection: DEFAULT_PUBLIC_PROJECTION })
      .sort({ order: 1, key: 1 })
      .toArray()

    const localizedRows = rows.map((row) => transformMainSectionForPublic(row, lang))

    return res.json({ data: localizedRows, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to list main sections", error: err.message })
  }
}

export async function getMainSectionByKey(req, res) {
  try {
    const lang = req.query.lang === "en" ? "en" : "ar"
    res.set("X-MainSections-Lang", lang)
    res.set("X-MainSections-Localized", "1")
    res.set("X-I18N-Transform", "table-value-v1")
    res.set("X-I18N-Lang", lang)
    const key = normalizeSectionKey(req.params?.key)
    if (!key) return res.status(400).json({ message: "invalid key" })

    const row = await collections.mainSections().findOne({ key, isActive: true }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ message: "section not found" })

    const localizedRow = transformMainSectionForPublic(row, lang)

    return res.json({ data: localizedRow, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to get main section", error: err.message })
  }
}
