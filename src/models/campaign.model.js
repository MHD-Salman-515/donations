import mongoose from "mongoose"
import { I18nStringSchema } from "./schemas/i18n-string.schema.js"

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: I18nStringSchema,
      required: [true, "title is required"],
    },
    description: {
      type: I18nStringSchema,
      required: [true, "description is required"],
    },
    goalAmount: {
      type: Number,
      required: [true, "goalAmount is required"],
      min: [0, "goalAmount must be greater than or equal to 0"],
    },
  },
  { timestamps: true, strict: "throw" }
)

const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema)

export default Campaign
