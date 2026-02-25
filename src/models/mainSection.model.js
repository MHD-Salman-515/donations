import mongoose from "mongoose"

const LocalizedTextSchema = new mongoose.Schema(
  {
    ar: { type: String, trim: true, default: "" },
    en: { type: String, trim: true, default: "" },
  },
  { _id: false }
)

const ThemeSchema = new mongoose.Schema(
  {
    color: { type: String, trim: true, default: null },
    badge: { type: String, trim: true, default: null },
  },
  { _id: false }
)

const AccessSchema = new mongoose.Schema(
  {
    viewRoles: { type: [String], default: [] },
    manageRoles: { type: [String], default: [] },
    allowedAdminIds: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
)

const MainSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: LocalizedTextSchema, default: () => ({ ar: "", en: "" }) },
    slug: { type: String, trim: true, default: null },
    icon: { type: String, trim: true, default: null },
    theme: { type: ThemeSchema, default: () => ({ color: null, badge: null }) },
    summary: { type: LocalizedTextSchema, default: () => ({ ar: "", en: "" }) },
    supportModes: { type: [String], default: [] },
    categories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    table: { type: [mongoose.Schema.Types.Mixed], default: [] },
    requirements: { type: [mongoose.Schema.Types.Mixed], default: [] },
    documentation: { type: [mongoose.Schema.Types.Mixed], default: [] },
    followUp: { type: mongoose.Schema.Types.Mixed, default: null },
    display: { type: mongoose.Schema.Types.Mixed, default: null },
    examples: { type: [mongoose.Schema.Types.Mixed], default: [] },
    kpis: { type: [mongoose.Schema.Types.Mixed], default: [] },
    access: { type: AccessSchema, default: () => ({ viewRoles: [], manageRoles: [], allowedAdminIds: [] }) },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    collection: "main_sections",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: true,
  }
)

const MainSection = mongoose.models.MainSection || mongoose.model("MainSection", MainSectionSchema)

export default MainSection
