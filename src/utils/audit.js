import { collections, nextSequence } from "../config/db.js"

export function getClientIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"]
  if (typeof xForwardedFor === "string" && xForwardedFor.trim()) {
    return xForwardedFor.split(",")[0].trim()
  }
  return req.socket?.remoteAddress || null
}

export async function logAudit(
  _db,
  req,
  { action, entity_type, entity_id = null, meta = null, actor_id = null }
) {
  try {
    const resolvedActorId = actor_id ?? req.user?.id ?? null
    const ip = getClientIp(req)
    const user_agent = req.headers["user-agent"] || null
    const now = new Date()

    await collections.auditLogs().insertOne({
      id: await nextSequence("audit_logs"),
      actor_id: resolvedActorId,
      action,
      entity_type,
      entity_id,
      meta,
      ip,
      user_agent,
      created_at: now,
    })
  } catch {
    // Audit logging should never block the API response path.
  }
}

export const audit = logAudit
