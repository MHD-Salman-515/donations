import "dotenv/config"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL

const DB_NAME = process.env.DB_NAME || "donations_db"

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is required")
  process.exit(1)
}

// Real Syrian city coordinates [longitude, latitude]
const CITIES = [
  { city: "دمشق",     coordinates: [36.2765, 33.5138] },
  { city: "حلب",      coordinates: [37.1612, 36.2021] },
  { city: "حمص",      coordinates: [36.7213, 34.7324] },
  { city: "اللاذقية", coordinates: [35.7776, 35.5318] },
  { city: "حماة",     coordinates: [36.7573, 35.1318] },
  { city: "دير الزور",coordinates: [40.1418, 35.3366] },
  { city: "طرطوس",   coordinates: [35.8869, 34.8954] },
  { city: "إدلب",     coordinates: [36.6340, 35.9300] },
  { city: "درعا",     coordinates: [36.1030, 32.6240] },
  { city: "الرقة",    coordinates: [38.9981, 35.9500] },
]

function geoLocation(idx) {
  const c = CITIES[idx % CITIES.length]
  return { type: "Point", coordinates: c.coordinates, city: c.city, country: "سوريا" }
}

async function seedMainSections(db, now) {
  await db.collection("main_sections").deleteMany({})

  const sections = [
    {
      key: "medical",
      title: { ar: "القسم الطبي", en: "Medical" },
      summary: { ar: "دعم المرضى وتغطية تكاليف العمليات والأدوية والعلاج لمن لا يستطيع تحمّل النفقات.", en: "Supporting patients by covering surgery, medication, and treatment costs for those in need." },
      icon: "heart-pulse",
      color: "#EF4444",
      badge: "طبي",
      order: 1,
      isActive: true,
      categories: [
        { name: "علاج كيميائي" },
        { name: "جراحة" },
        { name: "أدوية مزمنة" },
        { name: "غسيل كلوي" },
        { name: "علاج إشعاعي" },
        { name: "أطراف اصطناعية" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "education",
      title: { ar: "قسم التعليم", en: "Education" },
      summary: { ar: "مساعدة الطلاب والأيتام بالرسوم الدراسية والقرطاسية والمنح لضمان استمرار التعليم.", en: "Helping students and orphans with tuition, stationery, and scholarships to ensure education continues." },
      icon: "graduation-cap",
      color: "#3B82F6",
      badge: "تعليم",
      order: 2,
      isActive: true,
      categories: [
        { name: "رسوم دراسية" },
        { name: "قرطاسية" },
        { name: "منح جامعية" },
        { name: "تعليم مهني" },
        { name: "دعم أيتام" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "relief",
      title: { ar: "قسم الإغاثة", en: "Relief" },
      summary: { ar: "مساعدات غذائية وشتوية طارئة للأسر المتضررة والنازحين داخل سوريا.", en: "Emergency food and winter aid for affected families and displaced persons inside Syria." },
      icon: "hand-heart",
      color: "#F59E0B",
      badge: "إغاثة",
      order: 3,
      isActive: true,
      categories: [
        { name: "سلة غذائية" },
        { name: "كسوة شتوية" },
        { name: "مواد إيواء" },
        { name: "وقود تدفئة" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "reconstruction",
      title: { ar: "قسم إعادة الإعمار", en: "Reconstruction" },
      summary: { ar: "دعم ترميم المنازل المتضررة وإعادة البناء الجزئي مع توثيق قبل وبعد وتقارير ميدانية.", en: "Supporting home restoration and partial rebuilding with before/after documentation and field reports." },
      icon: "home-modern",
      color: "#22C55E",
      badge: "إعمار",
      order: 4,
      isActive: true,
      categories: [
        { name: "ترميم منزل" },
        { name: "إعادة بناء" },
        { name: "تأهيل مدرسة" },
        { name: "بنية تحتية" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "orphans",
      title: { ar: "كفالة الأيتام", en: "Orphan Sponsorship" },
      summary: { ar: "كفالة شهرية طويلة الأمد للأيتام مع خصوصية عالية وتقارير شهرية واضحة للكافلين.", en: "Long-term monthly sponsorship for orphans with high privacy and clear monthly reports for sponsors." },
      icon: "shield-heart",
      color: "#A855F7",
      badge: "أيتام",
      order: 5,
      isActive: true,
      categories: [
        { name: "كفالة شهرية" },
        { name: "تعليم يتيم" },
        { name: "رعاية صحية" },
        { name: "مصروف يومي" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "shelter",
      title: { ar: "المأوى والسكن", en: "Shelter & Housing" },
      summary: { ar: "تأمين السكن المؤقت ودعم إيجار المنازل للأسر النازحة والمحتاجة.", en: "Providing temporary shelter and rental support for displaced and needy families." },
      icon: "building-house",
      color: "#06B6D4",
      badge: "مأوى",
      order: 6,
      isActive: true,
      categories: [
        { name: "إيجار سكن" },
        { name: "سكن مؤقت" },
        { name: "أثاث أساسي" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "elderly",
      title: { ar: "رعاية كبار السن", en: "Elderly Care" },
      summary: { ar: "رعاية شهرية لكبار السن تشمل الأدوية والغذاء والتدفئة وزيارات متابعة بهدف العيش بكرامة.", en: "Monthly care for the elderly including medicine, food, heating, and follow-up visits for dignified living." },
      icon: "heart-handshake",
      color: "#F97316",
      badge: "كبار السن",
      order: 7,
      isActive: true,
      categories: [
        { name: "أدوية" },
        { name: "غذاء شهري" },
        { name: "تدفئة" },
        { name: "رعاية صحية" },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      key: "humanitarian",
      title: { ar: "المساعدات الإنسانية", en: "Humanitarian Aid" },
      summary: { ar: "حملات جماعية لتوزيع الغذاء والكسوة والدعم الاجتماعي حسب المناطق مع توثيق بالصور.", en: "Collective campaigns for distributing food, clothing, and social support by region with photo documentation." },
      icon: "globe-alt",
      color: "#EC4899",
      badge: "إنساني",
      order: 8,
      isActive: true,
      categories: [
        { name: "توزيع غذاء" },
        { name: "كسوة عامة" },
        { name: "دعم نفسي" },
        { name: "مستلزمات أساسية" },
      ],
      created_at: now,
      updated_at: now,
    },
  ]

  await db.collection("main_sections").insertMany(sections)
  console.log(`✓ Main sections: ${sections.length}`)
}

async function run() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  const now = new Date()

  // ── 1. CLEAR ─────────────────────────────────────────────────────────────
  const toClear = [
    "users", "campaigns", "donations", "cases", "case_documents", "case_updates",
    "audit_logs", "refresh_tokens", "advertisements", "campaign_support_messages",
    "support_reports", "emergency_fund", "partners", "store_applications",
    "store_products", "orders", "notifications", "counters",
  ]
  for (const col of toClear) await db.collection(col).deleteMany({})
  await db.collection("settings").deleteMany({})
  console.log("✓ Cleared all collections")

  // ── 2. PASSWORD ───────────────────────────────────────────────────────────
  const password_hash = await bcrypt.hash("Test1234!", 10)
  console.log("✓ Password hashed")

  // ── 3. USERS (20) ─────────────────────────────────────────────────────────
  //   1 admin | 7 donors | 7 beneficiaries | 5 store-partner users
  const usersRaw = [
    { id: 1,  name: "أحمد الإداري",            email: "admin@alkhair.org",   role: "admin"       },
    { id: 2,  name: "محمد سامر الأحمد",        email: "donor1@test.com",     role: "donor"       },
    { id: 3,  name: "فاطمة الزهراء الناصر",    email: "donor2@test.com",     role: "donor"       },
    { id: 4,  name: "خالد عمر السيد",          email: "donor3@test.com",     role: "donor"       },
    { id: 5,  name: "سارة يوسف الحسن",        email: "donor4@test.com",     role: "donor"       },
    { id: 6,  name: "عمر فادي الرشيد",         email: "donor5@test.com",     role: "donor"       },
    { id: 7,  name: "نور محمد إبراهيم",        email: "donor6@test.com",     role: "donor"       },
    { id: 8,  name: "علي وسيم الجمال",         email: "donor7@test.com",     role: "donor"       },
    { id: 9,  name: "أم محمد الحلبية",         email: "ben1@test.com",       role: "beneficiary" },
    { id: 10, name: "يوسف خالد الدرعاوي",     email: "ben2@test.com",       role: "beneficiary" },
    { id: 11, name: "رانيا سامر العمر",        email: "ben3@test.com",       role: "beneficiary" },
    { id: 12, name: "حسن أحمد الحموي",        email: "ben4@test.com",       role: "beneficiary" },
    { id: 13, name: "سلمى فارس الدمشقية",    email: "ben5@test.com",       role: "beneficiary" },
    { id: 14, name: "طارق محمد الحمصي",      email: "ben6@test.com",       role: "beneficiary" },
    { id: 15, name: "لينا عماد الشامية",      email: "ben7@test.com",       role: "beneficiary" },
    { id: 16, name: "متجر الأمل",             email: "store1@test.com",     role: "donor"       },
    { id: 17, name: "متجر الخير",             email: "store2@test.com",     role: "donor"       },
    { id: 18, name: "متجر الزيتون",           email: "store3@test.com",     role: "donor"       },
    { id: 19, name: "متجر الياسمين",          email: "store4@test.com",     role: "donor"       },
    { id: 20, name: "متجر البركة",            email: "store5@test.com",     role: "donor"       },
  ]

  await db.collection("users").insertMany(usersRaw.map(u => ({
    ...u,
    password_hash,
    status: "active",
    preferredLanguage: "ar",
    failed_login_attempts: 0,
    locked_until: null,
    two_fa_enabled: false,
    otp_code: null,
    otp_expires_at: null,
    identity_verified: false,
    verification_status: "unverified",
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Users: ${usersRaw.length}`)

  // ── 4. PARTNERS (5) ───────────────────────────────────────────────────────
  const partnersRaw = [
    { id: 1, userId: 16, name: "متجر الأمل للملابس",              category: "clothing"     },
    { id: 2, userId: 17, name: "متجر الخير للمواد الغذائية",      category: "food"         },
    { id: 3, userId: 18, name: "متجر الزيتون للإلكترونيات",       category: "electronics"  },
    { id: 4, userId: 19, name: "متجر الياسمين للمصنوعات اليدوية", category: "handmade"     },
    { id: 5, userId: 20, name: "متجر البركة للكتب",               category: "books"        },
  ]

  await db.collection("partners").insertMany(partnersRaw.map(p => ({
    id: p.id,
    name: p.name,
    user_id: p.userId,
    partner_type: "store",
    status: "active",
    business_category: p.category,
    donation_mode: "percentage",
    donation_value: 10,
    default_target_type: "case",
    default_target_id: null,
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Partners: ${partnersRaw.length}`)

  // ── 5. CAMPAIGNS (20) ─────────────────────────────────────────────────────
  // 7 medical | 5 education | 5 relief | 3 reconstruction
  // 15 active | 3 paused | 2 completed
  const campaignsRaw = [
    // Medical (7)
    { id:1,  type:"medical",        status:"active",    target:30000, raised:18500, cityIdx:1,
      ar:"علاج الأطفال المرضى في حلب",             en:"Treating Sick Children in Aleppo",
      dAr:"توفير الرعاية الطبية الطارئة للأطفال الذين يعانون من أمراض خطيرة في حلب.",
      dEn:"Providing emergency medical care for children suffering from serious illnesses in Aleppo.",
      start:new Date("2025-01-15"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800" },
    { id:2,  type:"medical",        status:"completed", target:50000, raised:50000, cityIdx:0,
      ar:"دعم مستشفى الميدان في دمشق",             en:"Support Al-Midan Hospital in Damascus",
      dAr:"تأمين الأدوية والمستلزمات الطبية لمستشفى الميدان في دمشق.",
      dEn:"Securing medicines and medical supplies for Al-Midan Hospital in Damascus.",
      start:new Date("2024-06-01"), end:new Date("2024-12-31"),
      img:"https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800" },
    { id:3,  type:"medical",        status:"active",    target:40000, raised:22000, cityIdx:2,
      ar:"دعم مرضى السرطان في حمص",               en:"Support Cancer Patients in Homs",
      dAr:"مساعدة مرضى السرطان على تغطية تكاليف العلاج الكيميائي.",
      dEn:"Helping cancer patients cover the costs of chemotherapy.",
      start:new Date("2025-02-01"), end:new Date("2025-11-30"),
      img:"https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800" },
    { id:4,  type:"medical",        status:"active",    target:25000, raised:9800,  cityIdx:3,
      ar:"توفير الأطراف الاصطناعية لجرحى الحرب",   en:"Prosthetics for War Injured",
      dAr:"مشروع لتوفير أطراف اصطناعية للمصابين الذين فقدوا أطرافهم جراء الحرب.",
      dEn:"A project to provide prosthetic limbs for those who lost their limbs due to war.",
      start:new Date("2025-03-01"), end:new Date("2026-03-01"),
      img:"https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800" },
    { id:5,  type:"medical",        status:"active",    target:15000, raised:6200,  cityIdx:4,
      ar:"دعم مرضى الكلى في حماة",                en:"Support Kidney Patients in Hama",
      dAr:"تمويل جلسات الغسيل الكلوي للمرضى المحتاجين في حماة.",
      dEn:"Funding dialysis sessions for needy patients in Hama.",
      start:new Date("2025-01-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800" },
    { id:6,  type:"medical",        status:"paused",    target:20000, raised:7500,  cityIdx:7,
      ar:"رعاية الأمهات الحوامل في إدلب",          en:"Maternal Care in Idlib",
      dAr:"توفير الرعاية الصحية للنساء الحوامل وما بعد الولادة في إدلب.",
      dEn:"Providing prenatal and postnatal healthcare for women in Idlib.",
      start:new Date("2025-04-01"), end:new Date("2025-10-01"),
      img:"https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800" },
    { id:7,  type:"medical",        status:"completed", target:12000, raised:12000, cityIdx:8,
      ar:"توفير لقاحات الأطفال في درعا",            en:"Children Vaccination in Daraa",
      dAr:"حملة لتوفير اللقاحات الأساسية للأطفال دون سن الخامسة في محافظة درعا.",
      dEn:"A campaign to provide essential vaccines for children under five in Daraa.",
      start:new Date("2024-09-01"), end:new Date("2025-01-31"),
      img:"https://images.unsplash.com/photo-1576671081837-49000212a370?w=800" },
    // Education (5)
    { id:8,  type:"education",      status:"active",    target:45000, raised:28000, cityIdx:1,
      ar:"بناء مدرسة في ريف حلب",                  en:"Build a School in Rural Aleppo",
      dAr:"إنشاء مدرسة ابتدائية لخدمة الأطفال في قرى ريف حلب.",
      dEn:"Establishing a primary school to serve children in Aleppo's rural villages.",
      start:new Date("2025-01-01"), end:new Date("2026-01-01"),
      img:"https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800" },
    { id:9,  type:"education",      status:"active",    target:20000, raised:11000, cityIdx:0,
      ar:"منح دراسية للطلاب المتفوقين",             en:"Scholarships for Outstanding Students",
      dAr:"تقديم منح دراسية للطلاب المتفوقين من الأسر المحتاجة لمواصلة تعليمهم الجامعي.",
      dEn:"Providing scholarships for outstanding students from needy families for university education.",
      start:new Date("2025-02-01"), end:new Date("2025-08-31"),
      img:"https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800" },
    { id:10, type:"education",      status:"active",    target:8000,  raised:3200,  cityIdx:2,
      ar:"توزيع المستلزمات المدرسية",               en:"Distribution of School Supplies",
      dAr:"توزيع حقائب وأدوات مدرسية على الأطفال في المناطق المتضررة.",
      dEn:"Distributing school bags and supplies to children in affected areas.",
      start:new Date("2025-08-01"), end:new Date("2025-09-30"),
      img:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800" },
    { id:11, type:"education",      status:"paused",    target:18000, raised:4500,  cityIdx:6,
      ar:"مركز تعلم في طرطوس",                     en:"Learning Center in Tartus",
      dAr:"إنشاء مركز تعليمي لمحو الأمية وتعليم الكبار في طرطوس.",
      dEn:"Establishing a literacy and adult education center in Tartus.",
      start:new Date("2025-05-01"), end:new Date("2025-11-01"),
      img:"https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800" },
    { id:12, type:"education",      status:"active",    target:22000, raised:8800,  cityIdx:5,
      ar:"مكتبة رقمية للمناطق النائية",             en:"Digital Library for Remote Areas",
      dAr:"توفير أجهزة لوحية ومحتوى تعليمي رقمي للمناطق النائية.",
      dEn:"Providing tablets and digital educational content to remote areas.",
      start:new Date("2025-03-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800" },
    // Relief (5)
    { id:13, type:"relief",         status:"active",    target:15000, raised:14200, cityIdx:0,
      ar:"سلل غذائية لشهر رمضان",                  en:"Food Baskets for Ramadan",
      dAr:"توزيع سلال غذائية على الأسر المحتاجة خلال شهر رمضان المبارك.",
      dEn:"Distributing food baskets to needy families during the holy month of Ramadan.",
      start:new Date("2025-02-28"), end:new Date("2025-04-01"),
      img:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800" },
    { id:14, type:"relief",         status:"active",    target:35000, raised:16000, cityIdx:3,
      ar:"دعم النازحين في اللاذقية",               en:"Supporting Displaced People in Latakia",
      dAr:"تقديم المساعدات الإنسانية الطارئة للنازحين في محافظة اللاذقية.",
      dEn:"Providing emergency humanitarian aid to displaced persons in Latakia governorate.",
      start:new Date("2025-01-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800" },
    { id:15, type:"relief",         status:"paused",    target:10000, raised:3000,  cityIdx:4,
      ar:"كسوة الشتاء للمحتاجين",                  en:"Winter Clothing for the Needy",
      dAr:"توزيع الملابس الشتوية الدافئة على الأسر المحتاجة قبل فصل الشتاء.",
      dEn:"Distributing warm winter clothing to needy families before the winter season.",
      start:new Date("2025-10-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1608613304810-2d4dd52511a2?w=800" },
    { id:16, type:"relief",         status:"active",    target:28000, raised:19500, cityIdx:5,
      ar:"إغاثة متضرري الفيضانات",                 en:"Flood Victims Relief",
      dAr:"تقديم الإغاثة الطارئة لمتضرري الفيضانات في المناطق المنكوبة.",
      dEn:"Providing emergency relief to flood victims in affected areas.",
      start:new Date("2025-01-15"), end:new Date("2025-06-30"),
      img:"https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800" },
    { id:17, type:"relief",         status:"active",    target:18000, raised:5400,  cityIdx:7,
      ar:"مياه نظيفة لقرى الريف",                  en:"Clean Water for Rural Villages",
      dAr:"مشروع لتوفير مياه الشرب النقية للقرى المحرومة من شبكات المياه.",
      dEn:"A project to provide clean drinking water to villages lacking water networks.",
      start:new Date("2025-04-01"), end:new Date("2025-10-31"),
      img:"https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=800" },
    // Reconstruction (3)
    { id:18, type:"reconstruction", status:"active",    target:50000, raised:12000, cityIdx:2,
      ar:"إعادة بناء منازل في حمص القديمة",         en:"Rebuilding Homes in Old Homs",
      dAr:"إعادة بناء وترميم المنازل المتضررة في أحياء حمص القديمة.",
      dEn:"Rebuilding and restoring damaged homes in old Homs neighborhoods.",
      start:new Date("2025-01-01"), end:new Date("2026-06-30"),
      img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800" },
    { id:19, type:"reconstruction", status:"active",    target:32000, raised:8000,  cityIdx:5,
      ar:"ترميم المدارس في ريف دير الزور",          en:"Restoring Schools in Rural Deir ez-Zor",
      dAr:"ترميم وتأهيل المدارس المتضررة في الأرياف لاستئناف العملية التعليمية.",
      dEn:"Restoring and rehabilitating damaged schools in rural areas to resume education.",
      start:new Date("2025-02-01"), end:new Date("2026-02-01"),
      img:"https://images.unsplash.com/photo-1562774053-701939374585?w=800" },
    { id:20, type:"reconstruction", status:"active",    target:45000, raised:11000, cityIdx:9,
      ar:"إعادة تأهيل البنية التحتية في الرقة",     en:"Rehabilitating Infrastructure in Raqqa",
      dAr:"إعادة تأهيل شبكات المياه والكهرباء في مدينة الرقة.",
      dEn:"Rehabilitating water and electricity networks in Raqqa city.",
      start:new Date("2025-03-01"), end:new Date("2026-09-01"),
      img:"https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800" },
  ]

  await db.collection("campaigns").insertMany(campaignsRaw.map(c => ({
    id: c.id,
    title: c.ar,
    description: c.dAr,
    title_i18n: { ar: c.ar, en: c.en },
    description_i18n: { ar: c.dAr, en: c.dEn },
    type: c.type,
    category: c.type,
    status: c.status,
    priority: "normal",
    target_amount: c.target,
    raised_amount: c.raised,
    currency: "USD",
    image_url: c.img,
    location: { city: CITIES[c.cityIdx % 10].city, country: "سوريا" },
    start_date: c.start,
    end_date: c.end,
    rejection_reason: null,
    created_by: 1,
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Campaigns: ${campaignsRaw.length}`)

  // ── 6. CASES (20) ────────────────────────────────────────────────────────
  // Statuses: 10 active | 5 submitted | 3 under_review | 2 approved
  // Priorities: 5 urgent | 8 high | 7 normal
  const CASE_STATUSES   = ["active","active","active","active","active","active","active","active","active","active","submitted","submitted","submitted","submitted","submitted","under_review","under_review","under_review","approved","approved"]
  const CASE_PRIORITIES = ["urgent","urgent","urgent","urgent","urgent","high","high","high","high","high","high","high","high","normal","normal","normal","normal","normal","normal","normal"]
  const BEN_IDS         = [9,10,11,12,13,14,15,9,10,11,12,13,14,15,9,10,11,12,13,14]

  const casesRaw = [
    { id:1,  type:"medical",      cityIdx:1, target:12000, raised:5200,  ar:"احتياج طارئ لعملية قلب مفتوح",            en:"Urgent Need for Open Heart Surgery",          dAr:"طفل يحتاج إلى عملية قلب مفتوح عاجلة ولا تتوفر تكاليف العملية.",               dEn:"A child needs urgent open heart surgery but cannot afford the costs.",            img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:2,  type:"medical",      cityIdx:0, target:5000,  raised:1800,  ar:"علاج ابني من مرض السكري",                 en:"Treating My Son's Diabetes",                  dAr:"أحتاج لمساعدة في تأمين أنسولين ومستلزمات السكري لابني المريض.",              dEn:"I need help securing insulin and diabetes supplies for my sick son.",             img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:3,  type:"education",    cityIdx:2, target:8000,  raised:3400,  ar:"مساعدة لإتمام الدراسة الجامعية",          en:"Help to Complete University Studies",          dAr:"طالبة متفوقة تحتاج مساعدة مالية لإتمام دراستها الجامعية.",                   dEn:"An outstanding student needs financial help to complete her university studies.", img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800" },
    { id:4,  type:"relief",       cityIdx:7, target:3000,  raised:1200,  ar:"أسرة نازحة تحتاج مأوى",                   en:"Displaced Family Needs Shelter",              dAr:"أسرة من خمسة أفراد نزحت وتحتاج تأمين سكن مؤقت ومستلزمات أساسية.",           dEn:"A family of five displaced and needs temporary shelter and basic supplies.",      img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800" },
    { id:5,  type:"medical",      cityIdx:3, target:15000, raised:9800,  ar:"دعم مريضة بسرطان الثدي",                  en:"Support a Breast Cancer Patient",             dAr:"امرأة تحارب سرطان الثدي وتحتاج لتمويل جلسات العلاج الكيميائي.",              dEn:"A woman battling breast cancer needs funding for chemotherapy sessions.",          img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:6,  type:"housing",      cityIdx:4, target:7000,  raised:2100,  ar:"ترميم منزل متضرر من الزلزال",             en:"Repairing Earthquake-Damaged Home",           dAr:"منزل تضرر جزئياً من الزلزال ويحتاج لأعمال ترميم عاجلة.",                    dEn:"A home partially damaged by the earthquake needs urgent restoration work.",       img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800" },
    { id:7,  type:"education",    cityIdx:5, target:10000, raised:4200,  ar:"مدرسة خاصة للأطفال ذوي الاحتياجات",      en:"Special School for Children with Disabilities",dAr:"مبادرة لإنشاء فصل دراسي خاص للأطفال ذوي الاحتياجات الخاصة.",               dEn:"An initiative to create a special classroom for children with special needs.",    img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800" },
    { id:8,  type:"medical",      cityIdx:6, target:9000,  raised:2500,  ar:"كلفة عملية جراحية عاجلة في العمود الفقري",en:"Cost of Urgent Spinal Surgery",              dAr:"شاب يحتاج لعملية جراحية عاجلة في العمود الفقري ولا يملك التكاليف.",         dEn:"A young man needs urgent spinal surgery but cannot afford the costs.",            img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:9,  type:"relief",       cityIdx:8, target:2400,  raised:800,   ar:"غذاء لأسرة كبيرة في ضائقة",              en:"Food for Large Family in Hardship",           dAr:"أسرة من عشرة أفراد تعاني من شح الغذاء وتحتاج للدعم الشهري.",               dEn:"A family of ten suffering from food scarcity and needs monthly support.",         img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800" },
    { id:10, type:"medical",      cityIdx:9, target:25000, raised:11000, ar:"علاج طفل من مرض نادر",                    en:"Treating a Child with a Rare Disease",        dAr:"طفل مصاب بمرض نادر يحتاج علاجاً مكلفاً غير متوفر في سوريا.",               dEn:"A child with a rare disease needs expensive treatment not available in Syria.",    img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    // Submitted (5)
    { id:11, type:"housing",      cityIdx:0, target:4800,  raised:0,     ar:"إيجار منزل للعائلة النازحة",              en:"House Rental for Displaced Family",           dAr:"أسرة نازحة تحتاج لمساعدة في دفع إيجار المنزل لمدة سنة.",                   dEn:"A displaced family needs help paying house rent for one year.",                   img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800" },
    { id:12, type:"education",    cityIdx:1, target:3600,  raised:0,     ar:"رسوم مدرسية للأطفال الخمسة",             en:"School Fees for Five Children",               dAr:"أم أرملة تحتاج مساعدة في تسديد رسوم مدرسة أطفالها الخمسة.",                dEn:"A widowed mother needs help paying school fees for her five children.",           img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800" },
    { id:13, type:"medical",      cityIdx:2, target:6000,  raised:0,     ar:"علاج الأسنان للمحتاجين",                  en:"Dental Treatment for Needy",                  dAr:"حملة لتوفير علاج الأسنان المجاني للأشخاص المحتاجين.",                       dEn:"A campaign to provide free dental treatment for needy people.",                   img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:14, type:"relief",       cityIdx:3, target:2000,  raised:0,     ar:"حطب للتدفئة في الشتاء",                  en:"Firewood for Winter Heating",                 dAr:"عائلات تحتاج حطباً ووقوداً للتدفئة في فصل الشتاء البارد.",                 dEn:"Families need firewood and fuel to stay warm in the cold winter season.",         img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800" },
    { id:15, type:"housing",      cityIdx:4, target:5500,  raised:0,     ar:"مساعدة لأسرة بلا مأوى",                  en:"Help for a Homeless Family",                  dAr:"أسرة فقدت منزلها في الحريق وتحتاج إلى إيجاد مسكن بديل.",                   dEn:"A family lost their home in a fire and needs to find alternative housing.",       img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800" },
    // Under review (3)
    { id:16, type:"medical",      cityIdx:5, target:3600,  raised:0,     ar:"أدوية مزمنة لمريض كبير السن",            en:"Chronic Medications for Elderly Patient",     dAr:"مريض كبير في السن يحتاج لأدوية مزمنة شهرية لا يستطيع توفيرها.",           dEn:"An elderly patient needs monthly chronic medications they cannot afford.",         img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:17, type:"education",    cityIdx:6, target:14000, raised:0,     ar:"تأهيل مهني للشباب العاطل عن العمل",      en:"Vocational Training for Unemployed Youth",    dAr:"برنامج لتدريب الشباب العاطل عن العمل على مهن تمكنهم من كسب الرزق.",        dEn:"A program to train unemployed youth in skills that help them earn a living.",     img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800" },
    { id:18, type:"relief",       cityIdx:7, target:8000,  raised:0,     ar:"صناديق الإغاثة الطارئة",                 en:"Emergency Relief Boxes",                      dAr:"توزيع صناديق الإغاثة بالاحتياجات الأساسية للأسر المنكوبة.",                dEn:"Distributing emergency relief boxes with basic necessities to affected families.", img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800" },
    // Approved (2)
    { id:19, type:"medical",      cityIdx:8, target:6500,  raised:1500,  ar:"عملية قسطرة قلبية",                       en:"Cardiac Catheterization Procedure",           dAr:"مريض يحتاج لإجراء قسطرة قلبية وتكاليف العملية خارج إمكانياته.",           dEn:"A patient needs a cardiac catheterization procedure beyond their means.",          img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800" },
    { id:20, type:"education",    cityIdx:9, target:1200,  raised:400,   ar:"كمبيوتر محمول للطالب المتفوق",            en:"Laptop for Outstanding Student",              dAr:"طالب في الهندسة بحاجة لحاسوب محمول لمواصلة دراسته وأبحاثه.",              dEn:"An engineering student needs a laptop to continue his studies and research.",     img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800" },
  ]

  await db.collection("cases").insertMany(casesRaw.map((c, i) => {
    const isPrivate = i % 4 === 0
    const status = CASE_STATUSES[i]
    return {
      id: c.id,
      type: c.type,
      title: c.ar,
      description: c.dAr,
      title_i18n: { ar: c.ar, en: c.en },
      description_i18n: { ar: c.dAr, en: c.dEn },
      category: c.type,
      target_amount: c.target,
      raised_amount: c.raised,
      currency: "USD",
      image_url: c.img,
      status,
      priority: CASE_PRIORITIES[i],
      beneficiary_id: BEN_IDS[i],
      created_by: BEN_IDS[i],
      assigned_admin_id: status === "under_review" ? 1 : null,
      rejection_reason: null,
      privacy_mode: isPrivate ? "masked" : "public",
      masked_display: isPrivate
        ? { alias_name: `مستفيد #${c.id}`, hide_images: true }
        : { alias_name: null, hide_images: false },
      location: geoLocation(c.cityIdx),
      partner_id: null,
      start_date: new Date("2025-01-01"),
      end_date: new Date("2025-12-31"),
      created_at: now,
      updated_at: now,
    }
  }))
  console.log(`✓ Cases: ${casesRaw.length}`)

  // ── 7. STORE PRODUCTS (20) — 4 per partner ───────────────────────────────
  const productsRaw = [
    // Partner 1 — clothing
    { partnerId:1, title:"قميص قطني سوري",            price:25,  cost:15, stock:80,  img:"https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" },
    { partnerId:1, title:"عباءة تقليدية دمشقية",      price:45,  cost:28, stock:50,  img:"https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" },
    { partnerId:1, title:"جلابية رجالية حلبية",       price:35,  cost:22, stock:60,  img:"https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" },
    { partnerId:1, title:"طاقية صوفية محلية",         price:12,  cost:7,  stock:100, img:"https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" },
    // Partner 2 — food
    { partnerId:2, title:"صابون زيت الزيتون الحلبي", price:8,   cost:4,  stock:200, img:"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800" },
    { partnerId:2, title:"معجون الفستق الحلبي",       price:18,  cost:11, stock:120, img:"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800" },
    { partnerId:2, title:"زيت زيتون سوري بكر",       price:22,  cost:14, stock:90,  img:"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800" },
    { partnerId:2, title:"شاي أعشاب طبيعية محلية",   price:10,  cost:6,  stock:150, img:"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800" },
    // Partner 3 — electronics
    { partnerId:3, title:"شاحن محمول 10000mAh",      price:35,  cost:22, stock:40,  img:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800" },
    { partnerId:3, title:"سماعات لاسلكية بلوتوث",    price:55,  cost:35, stock:30,  img:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800" },
    { partnerId:3, title:"كابل شحن متعدد الأطراف",   price:12,  cost:7,  stock:100, img:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800" },
    { partnerId:3, title:"حامل هاتف مغناطيسي للسيارة",price:15, cost:9,  stock:70,  img:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800" },
    // Partner 4 — handmade
    { partnerId:4, title:"وسادة مطرزة يدوياً",       price:40,  cost:25, stock:25,  img:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800" },
    { partnerId:4, title:"سجادة حرفية صغيرة",        price:65,  cost:42, stock:15,  img:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800" },
    { partnerId:4, title:"علبة خشبية منقوشة يدوياً", price:30,  cost:18, stock:35,  img:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800" },
    { partnerId:4, title:"لوحة فنية تراثية يدوية",   price:50,  cost:32, stock:20,  img:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800" },
    // Partner 5 — books
    { partnerId:5, title:"كتاب تعليم العربية للأطفال",price:12, cost:7,  stock:200, img:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800" },
    { partnerId:5, title:"رواية عربية معاصرة",       price:15,  cost:9,  stock:150, img:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800" },
    { partnerId:5, title:"كتاب الطبخ السوري التقليدي",price:20, cost:12, stock:100, img:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800" },
    { partnerId:5, title:"قصص أطفال مصورة",          price:10,  cost:6,  stock:180, img:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800" },
  ]

  await db.collection("store_products").insertMany(productsRaw.map((p, i) => ({
    id: i + 1,
    title: p.title,
    description: `${p.title} — منتج محلي عالي الجودة`,
    price: p.price,
    cost_price: p.cost,
    stock: p.stock,
    image_url: p.img,
    status: "active",
    partner_id: p.partnerId,
    donation_mode: "custom",
    donation_type: "percentage",
    donation_value: 10,
    target_type: "case",
    target_id: (i % 5) + 1, // cycles through active case ids 1-5
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Store products: ${productsRaw.length}`)

  // ── 8. DONATIONS (20) ────────────────────────────────────────────────────
  // 3 with is_anonymous: true | mix of card/bank/cash | all paid
  const PMETHODS = ["card", "bank", "cash"]
  const donationsRaw = [
    { donorId:2, campaignId:1,  amount:200                    },
    { donorId:3, caseId:1,      amount:150, anon:true          },
    { donorId:4, campaignId:3,  amount:350                    },
    { donorId:5, caseId:2,      amount:75                     },
    { donorId:6, campaignId:8,  amount:500                    },
    { donorId:7, caseId:5,      amount:250, anon:true          },
    { donorId:8, campaignId:13, amount:100                    },
    { donorId:2, caseId:3,      amount:180                    },
    { donorId:3, campaignId:14, amount:120                    },
    { donorId:4, caseId:4,      amount:300, anon:true          },
    { donorId:5, campaignId:2,  amount:400                    },
    { donorId:6, caseId:6,      amount:85                     },
    { donorId:7, campaignId:16, amount:225                    },
    { donorId:8, caseId:7,      amount:175                    },
    { donorId:2, campaignId:4,  amount:90                     },
    { donorId:3, caseId:8,      amount:450                    },
    { donorId:4, campaignId:9,  amount:130                    },
    { donorId:5, caseId:9,      amount:65                     },
    { donorId:6, campaignId:17, amount:280                    },
    { donorId:7, caseId:10,     amount:320                    },
  ]

  await db.collection("donations").insertMany(donationsRaw.map((d, i) => ({
    id: i + 1,
    donor_id: d.donorId,
    ...(d.campaignId ? { campaign_id: d.campaignId } : {}),
    ...(d.caseId    ? { case_id:     d.caseId     } : {}),
    amount: d.amount,
    payment_method: PMETHODS[i % 3],
    payment_status: "paid",
    is_anonymous: d.anon === true,
    created_at: new Date(2025, i % 10, (i % 28) + 1),
    updated_at: now,
  })))
  console.log(`✓ Donations: ${donationsRaw.length}`)

  // ── 9. EMERGENCY FUND ─────────────────────────────────────────────────────
  await db.collection("emergency_fund").insertOne({
    id: 1,
    title: "صندوق الطوارئ الإنساني",
    title_i18n: { ar: "صندوق الطوارئ الإنساني", en: "Humanitarian Emergency Fund" },
    description: "صندوق طارئ لدعم المتضررين في الأزمات الإنسانية الطارئة وتقديم المساعدة الفورية.",
    description_i18n: {
      ar: "صندوق طارئ لدعم المتضررين في الأزمات الإنسانية الطارئة وتقديم المساعدة الفورية.",
      en: "Emergency fund to support those affected by urgent humanitarian crises and provide immediate assistance.",
    },
    enabled: true,
    target_amount: 100000,
    raised_amount: 35000,
    currency: "USD",
    start_date: new Date("2025-01-01"),
    end_date: null,
    created_at: now,
    updated_at: now,
  })
  console.log("✓ Emergency fund: 1")

  // ── 10. SETTINGS ──────────────────────────────────────────────────────────
  await db.collection("settings").insertOne({
    id: 1,
    site_name: "منصة الخير",
    currency: "USD",
    default_language: "ar",
    maintenance_mode: false,
    donations_enabled: true,
    contact_email: "info@alkhair.org",
    created_at: now,
    updated_at: now,
  })
  console.log("✓ Settings: 1")

  // ── 11. ADVERTISEMENTS (5) ────────────────────────────────────────────────
  const adsRaw = [
    { ar:"حملة الخير الرمضانية",          en:"Ramadan Charity Campaign",            category:"seasonal"   },
    { ar:"تبرع لبناء مستشفى",             en:"Donate to Build a Hospital",          category:"medical"    },
    { ar:"ادعم تعليم طفل",                en:"Support a Child's Education",         category:"education"  },
    { ar:"متجرنا الخيري مفتوح الآن",      en:"Our Charity Store is Now Open",       category:"store"      },
    { ar:"صندوق الطوارئ — ساهم الآن",    en:"Emergency Fund — Contribute Now",     category:"emergency"  },
  ]

  await db.collection("advertisements").insertMany(adsRaw.map((a, i) => ({
    id: i + 1,
    title: a.ar,
    title_i18n: { ar: a.ar, en: a.en },
    description: null,
    image_url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800",
    link_url: null,
    category: a.category,
    status: "active",
    start_date: new Date("2025-01-01"),
    end_date: new Date("2025-12-31"),
    created_by: 1,
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Advertisements: ${adsRaw.length}`)

  // ── 12. MAIN SECTIONS ─────────────────────────────────────────────────────
  await seedMainSections(db, now)

  // ── 13. RESET COUNTERS ────────────────────────────────────────────────────
  const counters = {
    users: 20, campaigns: 20, cases: 20, donations: 20,
    partners: 5, store_products: 20, advertisements: 5, emergency_fund: 1,
    case_documents: 0, case_updates: 0, orders: 0, audit_logs: 0,
    refresh_tokens: 0, store_applications: 0, notifications: 0,
    campaign_support_messages: 0, support_reports: 0,
  }
  for (const [name, seq] of Object.entries(counters)) {
    await db.collection("counters").updateOne({ _id: name }, { $set: { seq } }, { upsert: true })
  }
  console.log("✓ Counters reset")

  // ── 13. SUMMARY ───────────────────────────────────────────────────────────
  console.log("\n========== Seed Summary ==========")
  const summary = [
    "users","partners","campaigns","cases","store_products",
    "donations","emergency_fund","advertisements","settings","main_sections",
  ]
  for (const col of summary) {
    const count = await db.collection(col).countDocuments()
    console.log(`  ${col.padEnd(20)} ${count}`)
  }
  console.log("===================================\n")

  await client.close()
  console.log("✅ Seed completed successfully")
  console.log("   All users password: Test1234!")
}

run().catch(async (err) => {
  console.error("❌ Seed failed:", err.message)
  process.exit(1)
})
