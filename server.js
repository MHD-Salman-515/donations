import "dotenv/config"
import mongoose from "mongoose"
import { PORT, validateRuntimeEnv } from "./src/config/env.js"
import app from "./src/app.js"
import { connectToDatabase } from "./src/config/db.js"

async function bootstrap() {
  try {
    const { mongoUri } = validateRuntimeEnv()

    await mongoose.connect(mongoUri)
    console.log("Mongoose connected")

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
