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
