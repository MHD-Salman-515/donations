import { MongoClient } from "mongodb"
import { DB_NAME } from "./env.js"

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
  ])
}

export async function nextSequence(counterName) {
  const result = await collections.counters().findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  )

  const doc = result?.value ?? result
  return Number(doc?.seq || 1)
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
  // TODO(phase4): Consider additional analytics indexes for mixed campaign/case donation reporting.
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

export async function connectToDatabase() {
  if (database) return database

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("Missing MONGODB_URI. Set it in environment variables.")
  }

  client = new MongoClient(uri)
  await client.connect()
  database = client.db(DB_NAME || "donations_db")

  await Promise.all(REQUIRED_COLLECTIONS.map((name) => database.collection(name)))
  await ensureCounters()
  await ensureIndexes()
  await seedDefaultSettings()
  await seedAdsIfEnabled()

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
