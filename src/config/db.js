import { MongoClient } from "mongodb"
import { DB_NAME, getMongoUri } from "./env.js"

const REQUIRED_COLLECTIONS = [
  "users",
  "campaigns",
  "donations",
  "audit_logs",
  "refresh_tokens",
  "settings",
  "advertisements",
  "cases",
  "case_documents",
  "case_updates",
  "emergency_fund",
  "campaign_support_messages",
  "support_reports",
  "partners",
  "main_sections",
  "store_applications",
  "store_products",
  "orders",
  "notifications",
]

let client
let database

function isDuplicateKeyError(err) {
  return err?.code === 11000
}

function getDb() {
  if (!database) {
    throw new Error("Database connection is not initialized")
  }
  return database
}

export const collections = {
  users: () => getDb().collection("users"),
  campaigns: () => getDb().collection("campaigns"),
  donations: () => getDb().collection("donations"),
  auditLogs: () => getDb().collection("audit_logs"),
  refreshTokens: () => getDb().collection("refresh_tokens"),
  settings: () => getDb().collection("settings"),
  advertisements: () => getDb().collection("advertisements"),
  cases: () => getDb().collection("cases"),
  caseDocuments: () => getDb().collection("case_documents"),
  caseUpdates: () => getDb().collection("case_updates"),
  emergencyFund: () => getDb().collection("emergency_fund"),
  campaignSupportMessages: () => getDb().collection("campaign_support_messages"),
  supportReports: () => getDb().collection("support_reports"),
  partners: () => getDb().collection("partners"),
  mainSections: () => getDb().collection("main_sections"),
  storeApplications: () => getDb().collection("store_applications"),
  storeProducts: () => getDb().collection("store_products"),
  orders: () => getDb().collection("orders"),
  notifications: () => getDb().collection("notifications"),
  counters: () => getDb().collection("counters"),
}

async function seedCounterIfMissing(counterName, collectionName) {
  const counter = await collections.counters().findOne({ _id: counterName })
  if (counter) return

  const maxDoc = await getDb()
    .collection(collectionName)
    .find({}, { projection: { id: 1 } })
    .sort({ id: -1 })
    .limit(1)
    .next()

  const seq = Number(maxDoc?.id || 0)
  await collections.counters().updateOne(
    { _id: counterName },
    { $setOnInsert: { seq } },
    { upsert: true }
  )
}

async function ensureCounters() {
  await Promise.all([
    seedCounterIfMissing("users", "users"),
    seedCounterIfMissing("campaigns", "campaigns"),
    seedCounterIfMissing("donations", "donations"),
    seedCounterIfMissing("audit_logs", "audit_logs"),
    seedCounterIfMissing("refresh_tokens", "refresh_tokens"),
    seedCounterIfMissing("advertisements", "advertisements"),
    seedCounterIfMissing("cases", "cases"),
    seedCounterIfMissing("case_documents", "case_documents"),
    seedCounterIfMissing("case_updates", "case_updates"),
    seedCounterIfMissing("emergency_fund", "emergency_fund"),
    seedCounterIfMissing("campaign_support_messages", "campaign_support_messages"),
    seedCounterIfMissing("support_reports", "support_reports"),
    seedCounterIfMissing("partners", "partners"),
    seedCounterIfMissing("store_applications", "store_applications"),
    seedCounterIfMissing("store_products", "store_products"),
    seedCounterIfMissing("orders", "orders"),
    seedCounterIfMissing("notifications", "notifications"),
  ])
}

export async function nextSequence(counterName, options = {}) {
  const { session } = options
  const result = await collections.counters().findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", ...(session && { session }) }
  )

  const doc = result?.value ?? result
  return Number(doc?.seq || 1)
}

export async function runInTransaction(work, options = {}) {
  if (!client) {
    throw new Error("Database client is not initialized")
  }

  const session = client.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      result = await work(session)
    }, options)
    return result
  } finally {
    await session.endSession()
  }
}

async function createIndexSafe(collectionName, spec, options = {}, duplicateHelp = "") {
  try {
    await getDb().collection(collectionName).createIndex(spec, options)
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const hint = duplicateHelp
        ? ` Fix existing duplicates first. Suggestion: ${duplicateHelp}`
        : ""
      console.warn(`Index warning on ${collectionName}: duplicate key detected.${hint}`)
      return
    }

    if (err?.codeName === "IndexOptionsConflict") {
      console.warn(`Index warning on ${collectionName}: existing index options conflict.`)
      return
    }

    throw err
  }
}

async function ensureIndexes() {
  // TODO(phase5): Consider additional analytics indexes for mixed campaign/case/emergency reporting.
  await createIndexSafe(
    "users",
    { id: 1 },
    { unique: true, name: "users_id_unique" },
    "db.users.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "campaigns",
    { id: 1 },
    { unique: true, name: "campaigns_id_unique" },
    "db.campaigns.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "donations",
    { id: 1 },
    { unique: true, name: "donations_id_unique" },
    "db.donations.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "audit_logs",
    { id: 1 },
    { unique: true, name: "audit_logs_id_unique" },
    "db.audit_logs.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "refresh_tokens",
    { id: 1 },
    { unique: true, name: "refresh_tokens_id_unique" },
    "db.refresh_tokens.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "refresh_tokens",
    { token_hash: 1 },
    { unique: true, name: "refresh_tokens_token_hash_unique" },
    "db.refresh_tokens.aggregate([{ $group: { _id: '$token_hash', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "refresh_tokens",
    { user_id: 1, revoked: 1, expires_at: 1 },
    { name: "refresh_tokens_user_revoked_expires" }
  )
  await createIndexSafe(
    "cases",
    { id: 1 },
    { unique: true, name: "cases_id_unique" },
    "db.cases.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "case_documents",
    { id: 1 },
    { unique: true, name: "case_documents_id_unique" },
    "db.case_documents.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "case_updates",
    { id: 1 },
    { unique: true, name: "case_updates_id_unique" },
    "db.case_updates.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "campaign_support_messages",
    { id: 1 },
    { unique: true, name: "campaign_support_messages_id_unique" },
    "db.campaign_support_messages.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "support_reports",
    { id: 1 },
    { unique: true, name: "support_reports_id_unique" },
    "db.support_reports.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "partners",
    { id: 1 },
    { unique: true, name: "partners_id_unique" },
    "db.partners.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "users",
    { email: 1 },
    { unique: true, name: "users_email_unique" },
    "db.users.aggregate([{ $group: { _id: '$email', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "settings",
    { id: 1 },
    { unique: true, name: "settings_id_unique" },
    "db.settings.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "advertisements",
    { id: 1 },
    { unique: true, name: "advertisements_id_unique" },
    "db.advertisements.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "advertisements",
    { status: 1, start_date: 1, end_date: 1 },
    { name: "advertisements_status_start_end" }
  )
  await createIndexSafe(
    "donations",
    { case_id: 1, created_at: -1 },
    { name: "donations_case_id_created_at_desc" }
  )
  await createIndexSafe(
    "donations",
    { donor_id: 1, created_at: -1 },
    { name: "donations_donor_id_created_at_desc" }
  )
  await createIndexSafe(
    "donations",
    { emergency_id: 1, created_at: -1 },
    { name: "donations_emergency_created_at" }
  )
  await createIndexSafe(
    "emergency_fund",
    { id: 1 },
    { unique: true, name: "emergency_fund_id_unique" },
    "db.emergency_fund.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "cases",
    { status: 1, type: 1 },
    { name: "cases_status_type" }
  )
  await createIndexSafe(
    "cases",
    { beneficiary_id: 1, created_at: -1 },
    { name: "cases_beneficiary_created_at_desc" }
  )
  await createIndexSafe(
    "cases",
    { priority: 1, status: 1 },
    { name: "cases_priority_status" }
  )
  await createIndexSafe(
    "cases",
    { location: "2dsphere" },
    { name: "cases_location_2dsphere" }
  )
  await createIndexSafe(
    "case_documents",
    { case_id: 1, created_at: -1 },
    { name: "case_documents_case_id_created_at_desc" }
  )
  await createIndexSafe(
    "case_documents",
    { case_id: 1, type: 1 },
    { name: "case_documents_case_id_type" }
  )
  await createIndexSafe(
    "case_updates",
    { case_id: 1, created_at: -1 },
    { name: "case_updates_case_id_created_at_desc" }
  )
  await createIndexSafe(
    "campaign_support_messages",
    { campaign_id: 1, created_at: -1 },
    { name: "campaign_support_messages_campaign_created_at_desc" }
  )
  await createIndexSafe(
    "campaign_support_messages",
    { actor_user_id: 1, campaign_id: 1, created_at: -1 },
    { name: "campaign_support_messages_actor_campaign_created_at_desc" }
  )
  await createIndexSafe(
    "campaign_support_messages",
    { status: 1, created_at: -1 },
    { name: "campaign_support_messages_status_created_at_desc" }
  )
  await createIndexSafe(
    "support_reports",
    { support_id: 1, created_at: -1 },
    { name: "support_reports_support_created_at_desc" }
  )
  await createIndexSafe(
    "support_reports",
    { reporter_user_id: 1, created_at: -1 },
    { name: "support_reports_reporter_created_at_desc" }
  )
  await createIndexSafe(
    "partners",
    { status: 1, created_at: -1 },
    { name: "partners_status_created_at_desc" }
  )
  await createIndexSafe(
    "partners",
    { name: 1 },
    { name: "partners_name_idx" }
  )
  await createIndexSafe(
    "partners",
    { partner_type: 1, status: 1, created_at: -1 },
    { name: "partners_type_status_created_at_desc" }
  )
  await createIndexSafe(
    "partners",
    { user_id: 1, partner_type: 1, status: 1 },
    { name: "partners_user_type_status_idx" }
  )
  await createIndexSafe(
    "partners",
    { user_id: 1 },
    { name: "partners_user_id_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { id: 1 },
    { unique: true, name: "store_applications_id_unique" },
    "db.store_applications.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "store_applications",
    { status: 1 },
    { name: "store_applications_status_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { email: 1 },
    { name: "store_applications_email_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { created_at: -1 },
    { name: "store_applications_created_at_desc" }
  )
  await createIndexSafe(
    "store_applications",
    { city: 1 },
    { name: "store_applications_city_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { business_category: 1 },
    { name: "store_applications_business_category_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { partner_id: 1 },
    { name: "store_applications_partner_id_idx" }
  )
  await createIndexSafe(
    "store_applications",
    { applicant_user_id: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ["pending", "approved"] } },
      name: "store_applications_user_pending_or_approved_unique",
    }
  )
  await createIndexSafe(
    "store_products",
    { id: 1 },
    { unique: true, name: "store_products_id_unique" },
    "db.store_products.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "store_products",
    { partner_id: 1 },
    { name: "store_products_partner_id_idx" }
  )
  await createIndexSafe(
    "store_products",
    { status: 1 },
    { name: "store_products_status_idx" }
  )
  await createIndexSafe(
    "store_products",
    { title: "text" },
    { name: "store_products_title_text_idx" }
  )
  await createIndexSafe(
    "store_products",
    { created_at: -1 },
    { name: "store_products_created_at_desc" }
  )
  await createIndexSafe(
    "orders",
    { id: 1 },
    { unique: true, name: "orders_id_unique" },
    "db.orders.aggregate([{ $group: { _id: '$id', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "orders",
    { user_id: 1, created_at: -1 },
    { name: "orders_user_created_at_desc" }
  )
  await createIndexSafe(
    "orders",
    { partner_id: 1, created_at: -1 },
    { name: "orders_partner_created_at_desc" }
  )
  await createIndexSafe(
    "orders",
    { product_id: 1, created_at: -1 },
    { name: "orders_product_created_at_desc" }
  )
  await createIndexSafe(
    "orders",
    { status: 1, created_at: -1 },
    { name: "orders_status_created_at_desc" }
  )
  await createIndexSafe(
    "main_sections",
    { key: 1 },
    { unique: true, name: "main_sections_key_unique" },
    "db.main_sections.aggregate([{ $group: { _id: '$key', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }])"
  )
  await createIndexSafe(
    "main_sections",
    { isActive: 1, order: 1 },
    { name: "main_sections_active_order" }
  )
}

async function ensurePartnersUserIdNonUnique() {
  const indexes = await collections.partners().indexes()
  const uniqueUserIdIndexes = indexes.filter((idx) => {
    if (!idx?.unique) return false
    const keys = Object.keys(idx.key || {})
    return keys.length === 1 && keys[0] === "user_id" && idx.key.user_id === 1
  })

  for (const idx of uniqueUserIdIndexes) {
    await collections.partners().dropIndex(idx.name)
    console.warn(`Index warning on partners: dropped legacy unique index '${idx.name}' on user_id`)
  }
}

async function seedDefaultSettings() {
  const settingsCount = await collections.settings().countDocuments({})
  if (settingsCount > 0) return

  const now = new Date()
  await collections.settings().insertOne({
    id: 1,
    site_name: "Donations Platform",
    currency: "USD",
    default_language: "en",
    maintenance_mode: false,
    donations_enabled: true,
    contact_email: "admin@example.com",
    created_at: now,
    updated_at: now,
  })
}

async function seedAdsIfEnabled() {
  const enabled = String(process.env.SEED_ADS || "").toLowerCase() === "true"
  if (!enabled) return

  const count = await collections.advertisements().countDocuments({})
  if (count > 0) return

  const now = new Date()
  const adId = await nextSequence("advertisements")
  await collections.advertisements().insertOne({
    id: adId,
    title: "Welcome Banner",
    description: "Seeded default advertisement",
    image_url: null,
    link_url: null,
    category: "general",
    status: "inactive",
    start_date: null,
    end_date: null,
    created_by: null,
    created_at: now,
    updated_at: now,
  })
}

async function seedEmergencyFundIfMissing() {
  const existing = await collections.emergencyFund().findOne({ id: 1 })
  if (existing) return

  const now = new Date()
  await collections.emergencyFund().insertOne({
    id: 1,
    title: "Emergency Fund",
    description: "Urgent humanitarian support fund",
    enabled: true,
    target_amount: 100000,
    raised_amount: 0,
    currency: "USD",
    start_date: null,
    end_date: null,
    created_at: now,
    updated_at: now,
  })
}

export async function connectToDatabase() {
  if (database) return database

  const uri = getMongoUri()
  if (!uri) {
    throw new Error("Missing MongoDB connection URI. Set MONGODB_URI (or MONGO_URI/MONGO_URL/DATABASE_URL).")
  }

  client = new MongoClient(uri)
  await client.connect()
  database = client.db(DB_NAME || "donations_db")

  await Promise.all(REQUIRED_COLLECTIONS.map((name) => database.collection(name)))
  await ensureCounters()
  await ensurePartnersUserIdNonUnique()
  await ensureIndexes()
  await seedDefaultSettings()
  await seedAdsIfEnabled()
  await seedEmergencyFundIfMissing()

  console.log(`Connected to MongoDB Atlas (db: ${DB_NAME || "donations_db"})`)
  return database
}

export async function closeDatabaseConnection() {
  if (!client) return
  await client.close()
  client = undefined
  database = undefined
}

export const db = {
  collection: (name) => getDb().collection(name),
}
