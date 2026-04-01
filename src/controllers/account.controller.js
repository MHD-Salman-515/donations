import bcrypt from "bcryptjs"
import { collections } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  validateAccountUpdateBody,
  validateChangePasswordBody,
} from "../validators/account.validation.js"

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isDuplicateEmailError(err) {
  return err?.code === 11000
}

function ownProfileProjection() {
  return {
    _id: 0,
    id: 1,
    name: 1,
    email: 1,
    role: 1,
    status: 1,
    preferredLanguage: 1,
    created_at: 1,
  }
}

export async function getMyAccount(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const user = await collections.users().findOne({ id: userId }, { projection: ownProfileProjection() })
    if (!user) return res.status(404).json({ message: "user not found" })

    return res.json(user)
  } catch (err) {
    return res.status(500).json({ message: "failed to get account profile", error: err.message })
  }
}

export async function updateMyAccount(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const valid = validateAccountUpdateBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const updates = { ...valid.value, updated_at: new Date() }
    const result = await collections.users().updateOne({ id: userId }, { $set: updates })
    if (!result.matchedCount) return res.status(404).json({ message: "user not found" })

    const user = await collections.users().findOne({ id: userId }, { projection: ownProfileProjection() })

    await logAudit(null, req, {
      action: "account_profile_update",
      entity_type: "user",
      entity_id: userId,
      meta: { changed: Object.keys(valid.value) },
    })

    return res.json(user)
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return res.status(409).json({ message: "email already exists" })
    }
    return res.status(500).json({ message: "failed to update account profile", error: err.message })
  }
}

export async function changeMyPassword(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const valid = validateChangePasswordBody(req.body || {})
    if (!valid.ok) return res.status(400).json({ message: valid.message })

    const user = await collections.users().findOne(
      { id: userId },
      { projection: { _id: 0, id: 1, password_hash: 1 } }
    )
    if (!user) return res.status(404).json({ message: "user not found" })

    const matches = await bcrypt.compare(valid.value.currentPassword, user.password_hash || "")
    if (!matches) return res.status(401).json({ message: "current password is incorrect" })

    const password_hash = await bcrypt.hash(valid.value.newPassword, 10)
    await collections.users().updateOne(
      { id: userId },
      { $set: { password_hash, updated_at: new Date() } }
    )

    await logAudit(null, req, {
      action: "account_password_change",
      entity_type: "user",
      entity_id: userId,
    })

    return res.json({ message: "password updated" })
  } catch (err) {
    return res.status(500).json({ message: "failed to change password", error: err.message })
  }
}
