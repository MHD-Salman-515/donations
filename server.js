import "dotenv/config"
import mongoose from "mongoose"
import { PORT } from "./src/config/env.js"
import app from "./src/app.js"
import { connectToDatabase } from "./src/config/db.js"

async function bootstrap() {
  try {
    const mongooseUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.MONGO_URL ||
      process.env.DATABASE_URL

    if (!mongooseUri) {
      throw new Error("Missing MongoDB connection URI for Mongoose")
    }

    await mongoose.connect(mongooseUri)
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
