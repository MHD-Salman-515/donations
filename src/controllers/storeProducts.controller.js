import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  validateCreateStoreProductBody,
  validatePublicStoreProductsFilters,
  validateStoreProductStatusBody,
  validateUpdateStoreProductBody,
} from "../validators/storeProducts.validation.js"

function toId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function targetExists(target_type, target_id) {
  if (target_type === "campaign") {
    const row = await collections.campaigns().findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
    return Boolean(row)
  }
  if (target_type === "case") {
    const row = await collections.cases().findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
    return Boolean(row)
  }

  const row = await collections
    .emergencyFund()
    .findOne({ id: target_id }, { projection: { _id: 0, id: 1 } })
  return Boolean(row)
}

function resolveDonationSummary(product, storePartner) {
  if (product.donation_mode === "custom") {
    return {
      mode: "custom",
      donation_type: product.donation_type,
      donation_value: product.donation_value,
      target_type: product.target_type,
      target_id: product.target_id,
      source: "product",
    }
  }

  return {
    mode: "inherit",
    donation_type: storePartner?.donation_mode || null,
    donation_value: storePartner?.donation_value ?? null,
    target_type: storePartner?.default_target_type || null,
    target_id: storePartner?.default_target_id ?? null,
    source: "store_defaults",
  }
}

function toProductOutput(product, storePartner) {
  return {
    ...product,
    donation: resolveDonationSummary(product, storePartner),
  }
}

async function enrichWithPartners(products) {
  const partnerIds = [...new Set(products.map((item) => item.partner_id).filter(Boolean))]
  if (!partnerIds.length) return products.map((p) => ({ ...p, partner: null, donation: resolveDonationSummary(p, null) }))

  const partners = await collections
    .partners()
    .find({ id: { $in: partnerIds } }, { projection: { _id: 0, id: 1, name: 1, city: 1, business_category: 1, donation_mode: 1, donation_value: 1, default_target_type: 1, default_target_id: 1, partner_type: 1, status: 1 } })
    .toArray()

  const partnerMap = new Map(partners.map((p) => [p.id, p]))
  return products.map((p) => {
    const partner = partnerMap.get(p.partner_id) || null
    return {
      ...p,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            city: partner.city || null,
            business_category: partner.business_category || null,
            partner_type: partner.partner_type || null,
            status: partner.status || null,
          }
        : null,
      donation: resolveDonationSummary(p, partner),
    }
  })
}

export async function createStoreProduct(req, res) {
  try {
    const valid = validateCreateStoreProductBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    if (valid.value.donation_mode === "custom") {
      const exists = await targetExists(valid.value.target_type, valid.value.target_id)
      if (!exists) return res.status(404).json({ ok: false, message: "target not found" })
    }

    const now = new Date()
    const id = await nextSequence("store_products")
    const partner_id = req.storePartner.id
    await collections.storeProducts().insertOne({
      id,
      partner_id,
      ...valid.value,
      created_at: now,
      updated_at: now,
    })

    const created = await collections.storeProducts().findOne({ id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_product_create",
      entity_type: "store_product",
      entity_id: id,
      meta: { partner_id, donation_mode: created.donation_mode },
      actor_id: req.user?.id || null,
    })

    return res.status(201).json({ ok: true, data: toProductOutput(created, req.storePartner), meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to create store product", error: err.message })
  }
}

export async function listMyStoreProducts(req, res) {
  try {
    const pageRaw = Number(req.query?.page)
    const limitRaw = Number(req.query?.limit)
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10
    const skip = (page - 1) * limit

    const filter = { partner_id: req.storePartner.id }
    const total = await collections.storeProducts().countDocuments(filter)
    const rows = await collections
      .storeProducts()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return res.json({
      ok: true,
      data: rows.map((row) => toProductOutput(row, req.storePartner)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list store products", error: err.message })
  }
}

export async function getMyStoreProduct(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid product id" })

    const row = await collections
      .storeProducts()
      .findOne({ id, partner_id: req.storePartner.id }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ ok: false, message: "product not found" })

    return res.json({ ok: true, data: toProductOutput(row, req.storePartner), meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to get store product", error: err.message })
  }
}

export async function updateMyStoreProduct(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid product id" })

    const current = await collections
      .storeProducts()
      .findOne({ id, partner_id: req.storePartner.id }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ ok: false, message: "product not found" })

    const valid = validateUpdateStoreProductBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const updates = { ...valid.value }
    const next = { ...current, ...updates }

    if (next.price <= 0) return res.status(400).json({ ok: false, message: "price must be > 0" })
    if (next.cost_price < 0) return res.status(400).json({ ok: false, message: "cost_price must be >= 0" })
    if (next.cost_price > next.price) {
      return res.status(400).json({ ok: false, message: "cost_price must not exceed price" })
    }

    if (!Number.isInteger(next.stock) || next.stock < 0) {
      return res.status(400).json({ ok: false, message: "stock must be an integer >= 0" })
    }

    if (next.donation_mode === "custom") {
      if (!next.donation_type || !next.donation_value || !next.target_type || !next.target_id) {
        return res.status(400).json({
          ok: false,
          message:
            "for custom donation_mode: donation_type, donation_value, target_type, target_id are required",
        })
      }
      const targetValid = await targetExists(next.target_type, next.target_id)
      if (!targetValid) return res.status(404).json({ ok: false, message: "target not found" })
    }

    if (next.donation_mode === "inherit") {
      updates.donation_type = null
      updates.donation_value = null
      updates.target_type = null
      updates.target_id = null
    }

    if (next.stock === 0) {
      updates.status = "out_of_stock"
    } else if (
      Object.prototype.hasOwnProperty.call(updates, "stock") &&
      current.status === "out_of_stock"
    ) {
      updates.status = "active"
    }

    updates.updated_at = new Date()
    await collections.storeProducts().updateOne({ id, partner_id: req.storePartner.id }, { $set: updates })

    const updated = await collections
      .storeProducts()
      .findOne({ id, partner_id: req.storePartner.id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_product_update",
      entity_type: "store_product",
      entity_id: id,
      meta: { changed: Object.keys(valid.value) },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: toProductOutput(updated, req.storePartner), meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to update store product", error: err.message })
  }
}

export async function setMyStoreProductStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid product id" })

    const valid = validateStoreProductStatusBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const current = await collections
      .storeProducts()
      .findOne({ id, partner_id: req.storePartner.id }, { projection: { _id: 0 } })
    if (!current) return res.status(404).json({ ok: false, message: "product not found" })

    const nextStatus =
      valid.value.status === "active" && current.stock === 0 ? "out_of_stock" : valid.value.status

    await collections.storeProducts().updateOne(
      { id, partner_id: req.storePartner.id },
      { $set: { status: nextStatus, updated_at: new Date() } }
    )

    const updated = await collections
      .storeProducts()
      .findOne({ id, partner_id: req.storePartner.id }, { projection: { _id: 0 } })

    await logAudit(null, req, {
      action: "store_product_status",
      entity_type: "store_product",
      entity_id: id,
      meta: { from_status: current.status, to_status: nextStatus },
      actor_id: req.user?.id || null,
    })

    return res.json({ ok: true, data: toProductOutput(updated, req.storePartner), meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to update store product status", error: err.message })
  }
}

export async function listPublicStoreProducts(req, res) {
  try {
    const valid = validatePublicStoreProductsFilters(req.query || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const { q, city, business_category, donation_mode, min_price, max_price, page, limit, skip } = valid.value
    const partnerFilter = {
      partner_type: "store",
      status: "active",
      ...(city && { $or: [{ city }, { "location.city": city }] }),
      ...(business_category && { business_category }),
    }
    const partners = await collections
      .partners()
      .find(partnerFilter, { projection: { _id: 0, id: 1 } })
      .toArray()
    const partnerIdFilter = partners.map((p) => p.id)
    if (!partnerIdFilter.length) {
      return res.json({ ok: true, data: [], meta: { page, limit, total: 0, totalPages: 1 } })
    }

    const filter = {
      status: "active",
      ...(q && { title: { $regex: q, $options: "i" } }),
      ...(donation_mode && { donation_mode }),
      partner_id: { $in: partnerIdFilter },
      ...((min_price !== null || max_price !== null) && {
        price: {
          ...(min_price !== null ? { $gte: min_price } : {}),
          ...(max_price !== null ? { $lte: max_price } : {}),
        },
      }),
    }

    const total = await collections.storeProducts().countDocuments(filter)
    const rows = await collections
      .storeProducts()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const data = await enrichWithPartners(rows)
    return res.json({
      ok: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list public store products", error: err.message })
  }
}

export async function getPublicStoreProduct(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: "invalid product id" })

    const row = await collections.storeProducts().findOne({ id, status: "active" }, { projection: { _id: 0 } })
    if (!row) return res.status(404).json({ ok: false, message: "product not found" })
    const partner = await collections
      .partners()
      .findOne({ id: row.partner_id, partner_type: "store", status: "active" }, { projection: { _id: 0, id: 1 } })
    if (!partner) return res.status(404).json({ ok: false, message: "product not found" })

    const [item] = await enrichWithPartners([row])
    return res.json({ ok: true, data: item, meta: null })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to get public store product", error: err.message })
  }
}
