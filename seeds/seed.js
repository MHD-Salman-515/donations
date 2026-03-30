import "dotenv/config"
import mongoose from "mongoose"
import User from "../src/models/user.model.js"

async function nextCampaignId(db) {
  const result = await db
    .collection("counters")
    .findOneAndUpdate(
      { _id: "campaigns" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    )
  const doc = result?.value ?? result
  return Number(doc?.seq || 1)
}

async function run() {
  const mongoUri = process.env.MONGODB_URI
  const dbName = process.env.DB_NAME || "donations_db"

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required")
  }

  await mongoose.connect(mongoUri, { dbName })

  const password_hash = "$2a$10$Qkr6A3E4tI8x6QaYk8bcbubx4EkFkQw7u7wF0D93Q5dUoYe8VQk2K"

  await User.updateOne(
    { email: "test.user@example.com" },
    {
      $set: {
        name: "Test User",
        role: "donor",
        status: "active",
        preferredLanguage: "ar",
        password_hash,
      },
    },
    { upsert: true }
  )

  const campaigns = [
    {
      title: {
        ar: "\u062d\u0645\u0644\u0629 \u062f\u0639\u0645 \u0627\u0644\u062a\u0639\u0644\u064a\u0645",
        en: "Support Education Campaign",
      },
      description: {
        ar: "\u0645\u0628\u0627\u062f\u0631\u0629 \u0644\u062f\u0639\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0628\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629.",
        en: "An initiative to support students with learning resources.",
      },
      target_amount: 5000,
    },
    {
      title: {
        ar: "\u062d\u0645\u0644\u0629 \u062f\u0639\u0645 \u0627\u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0635\u062d\u064a\u0629",
        en: "Healthcare Support Campaign",
      },
      description: {
        ar: "\u0645\u0633\u0627\u0639\u062f\u0629 \u0627\u0644\u0645\u0631\u0636\u0649 \u0628\u062a\u063a\u0637\u064a\u0629 \u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0639\u0644\u0627\u062c.",
        en: "Helping patients with treatment expenses.",
      },
      target_amount: 9000,
    },
  ]

  const campaignsCollection = mongoose.connection.db.collection("campaigns")

  for (const item of campaigns) {
    const existing = await campaignsCollection.findOne(
      { "title_i18n.en": item.title.en },
      { projection: { _id: 0, id: 1 } }
    )

    const now = new Date()
    const id = existing?.id || (await nextCampaignId(mongoose.connection.db))
    await campaignsCollection.updateOne(
      { id },
      {
        $set: {
          title: item.title.ar,
          description: item.description.ar,
          title_i18n: item.title,
          description_i18n: item.description,
          target_amount: item.target_amount,
          category: "general",
          status: "pending",
          updated_at: now,
        },
        $setOnInsert: {
          id,
          image_url: null,
          start_date: null,
          end_date: null,
          rejection_reason: null,
          created_by: null,
          created_at: now,
        },
      },
      { upsert: true }
    )
  }

  console.log("Seed completed")
  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
