import bcrypt from "bcryptjs"
import { collections } from "../config/db.js"
import { logAudit } from "../utils/audit.js"
import {
  validateAccountUpdateBody,
  validateChangePasswordBody,
} from "../validators/account.validation.js"
import { uploadBuffer } from "../config/cloudinary.js"
import { notify } from "../config/notifications.js"

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

export async function submitIdentityVerification(req, res) {
  try {
    const userId = toId(req.user?.id)
    if (!userId) return res.status(401).json({ message: "unauthorized" })

    const national_id = typeof req.body?.national_id === "string" ? req.body.national_id.trim() : ""
    if (!national_id || national_id.length < 5) {
      return res.status(400).json({ message: "national_id is required (min 5 chars)" })
    }

    if (!req.file) return res.status(400).json({ message: "id card image is required" })

    const uploaded = await uploadBuffer(req.file.buffer, {
      folder: "identity_docs",
      resource_type: "auto",
    })

    await collections.users().updateOne(
      { id: userId },
      {
        $set: {
          national_id,
          id_card_image_url: uploaded.secure_url,
          identity_verified: false,
          verification_status: "pending",
          updated_at: new Date(),
        },
      }
    )

    const user = await collections.users().findOne(
      { id: userId },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          preferredLanguage: 1,
          national_id: 1,
          id_card_image_url: 1,
          identity_verified: 1,
          verification_status: 1,
          created_at: 1,
        },
      }
    )

    await logAudit(null, req, {
      action: "identity_verification_submitted",
      entity_type: "user",
      entity_id: userId,
      meta: { national_id },
    })

    ;(async () => {
      try {
        const admins = await collections
          .users()
          .find({ role: "admin", status: "active" }, { projection: { _id: 0, id: 1 } })
          .toArray()
        await Promise.allSettled(
          admins.map((a) =>
            notify(
              a.id,
              "طلب توثيق هوية جديد",
              `قدّم ${user.name || ""} طلب توثيق هوية`,
              "identity_request",
              userId
            )
          )
        )
      } catch (_) {}
    })()

    return res.json({ data: user, meta: null })
  } catch (err) {
    return res.status(500).json({ message: "failed to submit identity verification", error: err.message })
  }
}
