function getEnv(key, fallback = "") {
  const value = process.env[key]
  if (value === undefined || value === null || value === "") return fallback
  return value
}

function getNumberEnv(key, fallback) {
  const value = Number(getEnv(key, fallback))
  return Number.isFinite(value) ? value : Number(fallback)
}

function getListEnv(key, fallbackList = []) {
  const raw = getEnv(key, "")
  if (!raw) return fallbackList
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export { getEnv, getNumberEnv, getListEnv }

export const PORT = getNumberEnv("PORT", 5000)
export const NODE_ENV = getEnv("NODE_ENV", "development")
export const DB_NAME = getEnv("DB_NAME", "donations_db")
export const MONGODB_URI = getEnv("MONGODB_URI", "")
export const CORS_ORIGIN_LIST = getListEnv("CORS_ORIGIN", [
  "http://localhost:5173",
  "http://localhost:3000",
])
export const RATE_LIMIT_WINDOW_MS = getNumberEnv("RATE_LIMIT_WINDOW_MS", 60000)
export const RATE_LIMIT_MAX = getNumberEnv("RATE_LIMIT_MAX", 60)

export function getMongoUri() {
  return (
    getEnv("MONGODB_URI", "") ||
    getEnv("MONGO_URI", "") ||
    getEnv("MONGO_URL", "") ||
    getEnv("DATABASE_URL", "")
  )
}

export function validateRuntimeEnv() {
  const errors = []
  const mongoUri = getMongoUri()
  const jwtSecret = getEnv("JWT_SECRET", "")

  if (!mongoUri) {
    errors.push("MONGODB_URI (or MONGO_URI/MONGO_URL/DATABASE_URL) is required")
  }

  if (!jwtSecret) {
    errors.push("JWT_SECRET is required")
  } else {
    if (jwtSecret === "change_me_to_a_long_random_secret") {
      errors.push("JWT_SECRET must not use the example placeholder value")
    }
    if (jwtSecret.length < 16) {
      errors.push("JWT_SECRET must be at least 16 characters")
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration: ${errors.join("; ")}`)
  }

  return { mongoUri, jwtSecret }
}
