import mongoose from "mongoose"

const requiredMsg = (lang) => `${lang} translation is required`
const minLenMsg = (lang) => `${lang} translation must be at least 1 character`

export const I18nStringSchema = new mongoose.Schema(
  {
    ar: {
      type: String,
      required: [true, requiredMsg("Arabic")],
      trim: true,
      minlength: [1, minLenMsg("Arabic")],
    },
    en: {
      type: String,
      required: [true, requiredMsg("English")],
      trim: true,
      minlength: [1, minLenMsg("English")],
    },
  },
  { _id: false, strict: "throw" }
)
