import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  parsePagination,
  validateCreateOrderBody,
  validateResolvedDonationConfig,
} from "../validators/orders.validation.js"

function toPositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
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

function resolveDonationConfig(product, partner) {
  if (product.donation_mode === "custom") {
    return {
      mode: "custom",
      donation_type: product.donation_type,
      donation_value: product.donation_value,
      target_type: product.target_type,
      target_id: product.target_id,
    }
  }

  return {
    mode: "inherit",
    donation_type: partner?.donation_mode || null,
    donation_value: partner?.donation_value ?? null,
    target_type: partner?.default_target_type || null,
    target_id: partner?.default_target_id ?? null,
  }
}

function calculateDonationAmount({ donation_type, donation_value, profit, quantity }) {
  if (donation_type === "percentage") {
    return Number((profit * (donation_value / 100)).toFixed(2))
  }
  return Number((donation_value * quantity).toFixed(2))
}

export async function createOrder(req, res) {
  try {
    const user_id = Number(req.user?.id)
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return res.status(401).json({ ok: false, message: "unauthorized" })
    }

    const valid = validateCreateOrderBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ ok: false, message: valid.message })

    const product = await collections
      .storeProducts()
      .findOne({ id: valid.value.product_id }, { projection: { _id: 0 } })
    if (!product) return res.status(404).json({ ok: false, message: "product not found" })
    if (product.status !== "active") {
      return res.status(400).json({ ok: false, message: "only active products can be ordered" })
    }

    const partner = await collections
      .partners()
      .findOne(
        { id: product.partner_id, partner_type: "store", status: "active" },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            donation_mode: 1,
            donation_value: 1,
            default_target_type: 1,
            default_target_id: 1,
          },
        }
      )
    if (!partner) {
      return res.status(400).json({ ok: false, message: "linked store is not active" })
    }

    const donationConfigRaw = resolveDonationConfig(product, partner)
    const donationConfigValid = validateResolvedDonationConfig(donationConfigRaw)
    if (!donationConfigValid.ok) {
      return res.status(400).json({ ok: false, message: donationConfigValid.message })
    }

    const donationConfig = donationConfigValid.value
    const targetIsValid = await targetExists(donationConfig.target_type, donationConfig.target_id)
    if (!targetIsValid) {
      return res.status(404).json({ ok: false, message: "donation target not found" })
    }

    const price = toPositiveNumber(product.price)
    const cost_price = Number(product.cost_price)
    if (price === null || !Number.isFinite(cost_price) || cost_price < 0 || cost_price > price) {
      return res.status(400).json({ ok: false, message: "invalid product pricing configuration" })
    }

    const quantity = valid.value.quantity
    const total_amount = Number((price * quantity).toFixed(2))
    const profit_amount = Number(((price - cost_price) * quantity).toFixed(2))
    const donation_amount = calculateDonationAmount({
      donation_type: donationConfig.donation_type,
      donation_value: donationConfig.donation_value,
      profit: profit_amount,
      quantity,
    })

    if (!Number.isFinite(donation_amount) || donation_amount < 0) {
      return res.status(400).json({ ok: false, message: "invalid donation calculation" })
    }

    const now = new Date()
    const stockResult = await collections.storeProducts().updateOne(
      { id: product.id, status: "active", stock: { $gte: quantity } },
      { $inc: { stock: -quantity }, $set: { updated_at: now } }
    )
    if (!stockResult.matchedCount) {
      return res.status(400).json({ ok: false, message: "insufficient stock" })
    }

    let order_id = null
    let donation_id = null
    try {
      const updatedProduct = await collections
        .storeProducts()
        .findOne({ id: product.id }, { projection: { _id: 0, id: 1, stock: 1, status: 1 } })
      if (updatedProduct?.stock === 0 && updatedProduct?.status !== "out_of_stock") {
        await collections
          .storeProducts()
          .updateOne({ id: product.id }, { $set: { status: "out_of_stock", updated_at: new Date() } })
      }

      order_id = await nextSequence("orders")
      const orderDoc = {
        id: order_id,
        user_id,
        partner_id: partner.id,
        product_id: product.id,
        quantity,
        price,
        total_amount,
        profit_amount,
        donation_amount,
        donation_type: donationConfig.donation_type,
        target_type: donationConfig.target_type,
        target_id: donationConfig.target_id,
        status: "completed",
        created_at: now,
      }
      await collections.orders().insertOne(orderDoc)

      donation_id = await nextSequence("donations")
      const donationDoc = {
        id: donation_id,
        donor_id: user_id,
        amount: donation_amount,
        payment_method: "card",
        payment_status: "paid",
        order_id,
        created_at: now,
        updated_at: now,
        ...(donationConfig.target_type === "campaign" ? { campaign_id: donationConfig.target_id } : {}),
        ...(donationConfig.target_type === "case" ? { case_id: donationConfig.target_id } : {}),
        ...(donationConfig.target_type === "emergency" ? { emergency_id: donationConfig.target_id } : {}),
      }
      await collections.donations().insertOne(donationDoc)

      if (donationConfig.target_type === "emergency") {
        await collections.emergencyFund().updateOne(
          { id: donationConfig.target_id },
          { $inc: { raised_amount: donation_amount }, $set: { updated_at: now } }
        )
      }

      await logAudit(null, req, {
        action: "order_create",
        entity_type: "order",
        entity_id: order_id,
        meta: {
          product_id: product.id,
          quantity,
          total_amount,
          donation_amount,
        },
        actor_id: user_id,
      })

      await logAudit(null, req, {
        action: "order_donation_created",
        entity_type: "donation",
        entity_id: donation_id,
        meta: {
          order_id,
          target_type: donationConfig.target_type,
          target_id: donationConfig.target_id,
          donation_amount,
        },
        actor_id: user_id,
      })

      return res.status(201).json({
        ok: true,
        data: {
          order: orderDoc,
          donation: {
            id: donation_id,
            amount: donation_amount,
            donation_type: donationConfig.donation_type,
            target_type: donationConfig.target_type,
            target_id: donationConfig.target_id,
            mode: donationConfigRaw.mode,
          },
        },
        meta: null,
      })
    } catch (writeErr) {
      if (donation_id !== null) {
        await collections.donations().deleteOne({ id: donation_id })
      }
      if (order_id !== null) {
        await collections.orders().deleteOne({ id: order_id })
      }

      const rollbackTime = new Date()
      await collections
        .storeProducts()
        .updateOne({ id: product.id }, { $inc: { stock: quantity }, $set: { updated_at: rollbackTime } })

      const rollbackProduct = await collections
        .storeProducts()
        .findOne({ id: product.id }, { projection: { _id: 0, stock: 1, status: 1 } })
      if (rollbackProduct?.stock > 0 && rollbackProduct?.status === "out_of_stock") {
        await collections
          .storeProducts()
          .updateOne({ id: product.id }, { $set: { status: "active", updated_at: new Date() } })
      }

      throw writeErr
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to create order", error: err.message })
  }
}

export async function listMyOrders(req, res) {
  try {
    const user_id = Number(req.user?.id)
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return res.status(401).json({ ok: false, message: "unauthorized" })
    }

    const { page, limit, skip } = parsePagination(req.query, 10, 50)
    const filter = { user_id }

    const total = await collections.orders().countDocuments(filter)
    const rows = await collections
      .orders()
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))]
    const partnerIds = [...new Set(rows.map((r) => r.partner_id).filter(Boolean))]

    const [products, partners] = await Promise.all([
      productIds.length
        ? collections
            .storeProducts()
            .find({ id: { $in: productIds } }, { projection: { _id: 0, id: 1, title: 1, image_url: 1 } })
            .toArray()
        : [],
      partnerIds.length
        ? collections
            .partners()
            .find({ id: { $in: partnerIds } }, { projection: { _id: 0, id: 1, name: 1, partner_type: 1 } })
            .toArray()
        : [],
    ])

    const productMap = new Map(products.map((p) => [p.id, p]))
    const partnerMap = new Map(partners.map((p) => [p.id, p]))
    const data = rows.map((row) => ({
      ...row,
      product: productMap.get(row.product_id) || null,
      store: partnerMap.get(row.partner_id) || null,
    }))

    return res.json({
      ok: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: "failed to list orders", error: err.message })
  }
}
