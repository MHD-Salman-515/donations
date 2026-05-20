import { collections, nextSequence } from "./db.js"
import { sendPushNotification } from "./onesignal.js"

export async function saveNotification(userId, title, message, type, entity_id = null) {
  try {
    const id = await nextSequence("notifications")
    await collections.notifications().insertOne({
      id,
      user_id: userId,
      title,
      message,
      type,
      entity_id,
      is_read: false,
      created_at: new Date(),
    })
  } catch (err) {
    console.error("saveNotification failed:", err.message)
  }
}

export async function notify(userId, title, message, type, entityId = null) {
  await Promise.allSettled([
    saveNotification(userId, title, message, type, entityId),
    sendPushNotification([userId], title, message, { type, entity_id: entityId }),
  ])
}
