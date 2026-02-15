import bcrypt from "bcryptjs"
import { collections, nextSequence } from "../config/db.js"
import { logAudit } from "../utils/audit.js"

const ALLOWED_ROLES = ["admin", "donor", "beneficiary"]
const ALLOWED_STATUSES = ["active", "inactive"]

function toId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isDuplicateEmailError(err) {
  return err?.code === 11000
}

function publicUserProjection() {
  return {
    _id: 0,
    id: 1,
    name: 1,
    email: 1,
    role: 1,
    status: 1,
    created_at: 1,
  }
}

export async function listUsers(req, res) {
  try {
    const rows = await collections
      .users()
      .find({}, { projection: publicUserProjection() })
      .sort({ id: -1 })
      .toArray()
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: "failed to list users", error: err.message })
  }
}

export async function getUser(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid user id" })

    const user = await collections
      .users()
      .findOne({ id }, { projection: publicUserProjection() })

    if (!user) return res.status(404).json({ message: "user not found" })
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ message: "failed to get user", error: err.message })
  }
}

export async function createUser(req, res) {
  try {
    const rawName = req.body?.name
    const rawEmail = req.body?.email
    const password = req.body?.password
    const rawRole = req.body?.role
    const rawStatus = req.body?.status

    const name = typeof rawName === "string" ? rawName.trim() : ""
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""
    const role = rawRole || "donor"
    const status = rawStatus || "active"

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" })
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "invalid role" })
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const now = new Date()
    const id = await nextSequence("users")

    await collections.users().insertOne({
      id,
      name,
      email,
      password_hash,
      role,
      status,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    })

    const user = await collections.users().findOne({ id }, { projection: publicUserProjection() })

    await logAudit(null, req, {
      action: "users_create",
      entity_type: "user",
      entity_id: id,
      meta: { role, status },
    })

    return res.status(201).json(user)
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return res.status(409).json({ message: "email already exists" })
    }
    return res.status(500).json({ message: "failed to create user", error: err.message })
  }
}

export async function updateUser(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid user id" })

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : null
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null
    const role = req.body?.role ?? null
    const status = req.body?.status ?? null

    if (role !== null && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "invalid role" })
    }

    if (status !== null && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    const updates = {}
    if (name !== null) updates.name = name
    if (email !== null) updates.email = email
    if (role !== null) updates.role = role
    if (status !== null) updates.status = status
    updates.updated_at = new Date()

    const result = await collections.users().updateOne({ id }, { $set: updates })

    if (!result.matchedCount) return res.status(404).json({ message: "user not found" })

    const user = await collections.users().findOne({ id }, { projection: publicUserProjection() })

    await logAudit(null, req, {
      action: "users_update",
      entity_type: "user",
      entity_id: id,
      meta: {
        changed: {
          ...(name !== null && { name }),
          ...(email !== null && { email }),
          ...(role !== null && { role }),
          ...(status !== null && { status }),
        },
      },
    })

    return res.json(user)
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return res.status(409).json({ message: "email already exists" })
    }
    return res.status(500).json({ message: "failed to update user", error: err.message })
  }
}

export async function setUserStatus(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid user id" })

    const status = req.body?.status
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "invalid status" })
    }

    const result = await collections.users().updateOne(
      { id },
      { $set: { status, updated_at: new Date() } }
    )
    if (!result.matchedCount) return res.status(404).json({ message: "user not found" })

    const user = await collections.users().findOne({ id }, { projection: publicUserProjection() })

    await logAudit(null, req, {
      action: "users_status",
      entity_type: "user",
      entity_id: id,
      meta: { status },
    })

    return res.json(user)
  } catch (err) {
    return res
      .status(500)
      .json({ message: "failed to update user status", error: err.message })
  }
}

export async function deleteUser(req, res) {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ message: "invalid user id" })

    const result = await collections.users().deleteOne({ id })
    if (!result.deletedCount) return res.status(404).json({ message: "user not found" })

    await logAudit(null, req, {
      action: "users_delete",
      entity_type: "user",
      entity_id: id,
    })

    return res.json({ message: "user deleted" })
  } catch (err) {
    return res.status(500).json({ message: "failed to delete user", error: err.message })
  }
}
