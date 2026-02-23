import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "name is required"], trim: true },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password_hash: { type: String, required: [true, "password_hash is required"] },
    role: { type: String, default: "donor" },
    status: { type: String, default: "active" },
    preferredLanguage: {
      type: String,
      enum: {
        values: ["ar", "en"],
        message: "preferredLanguage must be either 'ar' or 'en'",
      },
      default: "ar",
    },
  },
  { timestamps: true, strict: "throw" }
)

const User = mongoose.models.User || mongoose.model("User", userSchema)

export default User
