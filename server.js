import "dotenv/config"
import { PORT } from "./src/config/env.js"
import app from "./src/app.js"
import { connectToDatabase } from "./src/config/db.js"

async function bootstrap() {
  try {
    await connectToDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`)
    })
  } catch (err) {
    console.error("Failed to start server:", err.message)
    process.exit(1)
  }
}

bootstrap()
