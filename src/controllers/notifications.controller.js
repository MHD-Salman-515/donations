import { collections } from "../config/db.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function getMyNotifications(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const rows = await collections
      .notifications()
      .find({ user_id: userId }, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .toArray()

    return res.json({ data: rows, meta: { total: rows.length } })
  } catch (err) {
    return res.status(500).json({ message: "failed to get notifications", error: err.message })
  }
}

export async function markNotificationRead(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid notification id" })

    const result = await collections
      .notifications()
      .updateOne({ id, user_id: userId }, { $set: { is_read: true } })

    if (!result.matchedCount) return res.status(404).json({ message: "notification not found" })

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: "failed to mark notification read", error: err.message })
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    await collections
      .notifications()
      .updateMany({ user_id: userId, is_read: false }, { $set: { is_read: true } })

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: "failed to mark all notifications read", error: err.message })
  }
}

export async function saveDeviceToken(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const device_token = typeof req.body?.device_token === "string" ? req.body.device_token.trim() : ""
    if (!device_token) return res.status(400).json({ message: "device_token is required" })

    await collections
      .users()
      .updateOne({ id: userId }, { $set: { device_token, updated_at: new Date() } })

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: "failed to save device token", error: err.message })
  }
}
