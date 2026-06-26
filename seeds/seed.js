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

const CITIES = [
  { city: "دمشق",      coordinates: [36.2765, 33.5138] },
  { city: "حلب",       coordinates: [37.1612, 36.2021] },
  { city: "حمص",       coordinates: [36.7213, 34.7324] },
  { city: "اللاذقية",  coordinates: [35.7776, 35.5318] },
  { city: "حماة",      coordinates: [36.7573, 35.1318] },
  { city: "دير الزور", coordinates: [40.1418, 35.3366] },
  { city: "طرطوس",    coordinates: [35.8869, 34.8954] },
  { city: "إدلب",      coordinates: [36.6340, 35.9300] },
  { city: "درعا",      coordinates: [36.1030, 32.6240] },
  { city: "الرقة",     coordinates: [38.9981, 35.9500] },
]

function geoLocation(idx, neighborhood) {
  const c = CITIES[idx % CITIES.length]
  return {
    type: "Point",
    coordinates: c.coordinates,
    city: c.city,
    neighborhood: neighborhood || null,
    country: "سوريا",
  }
}

async function seedMainSections(db, now) {
  await db.collection("main_sections").deleteMany({})

  const sections = [
    {
      key: "medical",
      title: { ar: "القسم الطبي", en: "Medical" },
      summary: { ar: "دعم المرضى وتغطية تكاليف العمليات والأدوية والعلاج لمن لا يستطيع تحمّل النفقات.", en: "Supporting patients by covering surgery, medication, and treatment costs for those in need." },
      icon: "heart-pulse", color: "#EF4444", badge: "طبي", order: 1, isActive: true,
      categories: [{ name: "علاج كيميائي" }, { name: "جراحة" }, { name: "أدوية مزمنة" }, { name: "غسيل كلوي" }, { name: "علاج إشعاعي" }, { name: "أطراف اصطناعية" }],
      created_at: now, updated_at: now,
    },
    {
      key: "education",
      title: { ar: "قسم التعليم", en: "Education" },
      summary: { ar: "مساعدة الطلاب والأيتام بالرسوم الدراسية والقرطاسية والمنح لضمان استمرار التعليم.", en: "Helping students and orphans with tuition, stationery, and scholarships to ensure education continues." },
      icon: "graduation-cap", color: "#3B82F6", badge: "تعليم", order: 2, isActive: true,
      categories: [{ name: "رسوم دراسية" }, { name: "قرطاسية" }, { name: "منح جامعية" }, { name: "تعليم مهني" }, { name: "دعم أيتام" }],
      created_at: now, updated_at: now,
    },
    {
      key: "relief",
      title: { ar: "قسم الإغاثة", en: "Relief" },
      summary: { ar: "مساعدات غذائية وشتوية طارئة للأسر المتضررة والنازحين داخل سوريا.", en: "Emergency food and winter aid for affected families and displaced persons inside Syria." },
      icon: "hand-heart", color: "#F59E0B", badge: "إغاثة", order: 3, isActive: true,
      categories: [{ name: "سلة غذائية" }, { name: "كسوة شتوية" }, { name: "مواد إيواء" }, { name: "وقود تدفئة" }],
      created_at: now, updated_at: now,
    },
    {
      key: "reconstruction",
      title: { ar: "قسم إعادة الإعمار", en: "Reconstruction" },
      summary: { ar: "دعم ترميم المنازل المتضررة وإعادة البناء الجزئي مع توثيق قبل وبعد وتقارير ميدانية.", en: "Supporting home restoration and partial rebuilding with before/after documentation and field reports." },
      icon: "home-modern", color: "#22C55E", badge: "إعمار", order: 4, isActive: true,
      categories: [{ name: "ترميم منزل" }, { name: "إعادة بناء" }, { name: "تأهيل مدرسة" }, { name: "بنية تحتية" }],
      created_at: now, updated_at: now,
    },
    {
      key: "orphans",
      title: { ar: "كفالة الأيتام", en: "Orphan Sponsorship" },
      summary: { ar: "كفالة شهرية طويلة الأمد للأيتام مع خصوصية عالية وتقارير شهرية واضحة للكافلين.", en: "Long-term monthly sponsorship for orphans with high privacy and clear monthly reports for sponsors." },
      icon: "shield-heart", color: "#A855F7", badge: "أيتام", order: 5, isActive: true,
      categories: [{ name: "كفالة شهرية" }, { name: "تعليم يتيم" }, { name: "رعاية صحية" }, { name: "مصروف يومي" }],
      created_at: now, updated_at: now,
    },
    {
      key: "shelter",
      title: { ar: "المأوى والسكن", en: "Shelter & Housing" },
      summary: { ar: "تأمين السكن المؤقت ودعم إيجار المنازل للأسر النازحة والمحتاجة.", en: "Providing temporary shelter and rental support for displaced and needy families." },
      icon: "building-house", color: "#06B6D4", badge: "مأوى", order: 6, isActive: true,
      categories: [{ name: "إيجار سكن" }, { name: "سكن مؤقت" }, { name: "أثاث أساسي" }],
      created_at: now, updated_at: now,
    },
    {
      key: "elderly",
      title: { ar: "رعاية كبار السن", en: "Elderly Care" },
      summary: { ar: "رعاية شهرية لكبار السن تشمل الأدوية والغذاء والتدفئة وزيارات متابعة بهدف العيش بكرامة.", en: "Monthly care for the elderly including medicine, food, heating, and follow-up visits for dignified living." },
      icon: "heart-handshake", color: "#F97316", badge: "كبار السن", order: 7, isActive: true,
      categories: [{ name: "أدوية" }, { name: "غذاء شهري" }, { name: "تدفئة" }, { name: "رعاية صحية" }],
      created_at: now, updated_at: now,
    },
    {
      key: "humanitarian",
      title: { ar: "المساعدات الإنسانية", en: "Humanitarian Aid" },
      summary: { ar: "حملات جماعية لتوزيع الغذاء والكسوة والدعم الاجتماعي حسب المناطق مع توثيق بالصور.", en: "Collective campaigns for distributing food, clothing, and social support by region with photo documentation." },
      icon: "globe-alt", color: "#EC4899", badge: "إنساني", order: 8, isActive: true,
      categories: [{ name: "توزيع غذاء" }, { name: "كسوة عامة" }, { name: "دعم نفسي" }, { name: "مستلزمات أساسية" }],
      created_at: now, updated_at: now,
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
    { id: 1,  name: "أحمد الإداري",             email: "admin@alkhair.org",  role: "admin"       },
    { id: 2,  name: "محمد بشار العلي",          email: "donor1@test.com",    role: "donor"       },
    { id: 3,  name: "سوسن ماجد الحلبي",         email: "donor2@test.com",    role: "donor"       },
    { id: 4,  name: "عبد الرحمن نزار السيد",   email: "donor3@test.com",    role: "donor"       },
    { id: 5,  name: "ريم فادي الأتاسي",        email: "donor4@test.com",    role: "donor"       },
    { id: 6,  name: "وسيم جمال الدرويش",       email: "donor5@test.com",    role: "donor"       },
    { id: 7,  name: "هبة زياد القاسم",         email: "donor6@test.com",    role: "donor"       },
    { id: 8,  name: "تامر عدنان المصطفى",       email: "donor7@test.com",    role: "donor"       },
    { id: 9,  name: "أم يزن الحريري",           email: "ben1@test.com",      role: "beneficiary" },
    { id: 10, name: "خالد فيصل الدرعاوي",      email: "ben2@test.com",      role: "beneficiary" },
    { id: 11, name: "دلال سميح العثمان",        email: "ben3@test.com",      role: "beneficiary" },
    { id: 12, name: "بلال منير الحموي",         email: "ben4@test.com",      role: "beneficiary" },
    { id: 13, name: "سناء طلال الخطيب",        email: "ben5@test.com",      role: "beneficiary" },
    { id: 14, name: "إياد كريم الرفاعي",        email: "ben6@test.com",      role: "beneficiary" },
    { id: 15, name: "وداد حسن الشيخ",          email: "ben7@test.com",      role: "beneficiary" },
    { id: 16, name: "متجر الأمل",              email: "store1@test.com",    role: "donor"       },
    { id: 17, name: "متجر الخير",              email: "store2@test.com",    role: "donor"       },
    { id: 18, name: "متجر الزيتون",            email: "store3@test.com",    role: "donor"       },
    { id: 19, name: "متجر الياسمين",           email: "store4@test.com",    role: "donor"       },
    { id: 20, name: "متجر البركة",             email: "store5@test.com",    role: "donor"       },
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
    { id: 1, userId: 16, name: "متجر الأمل للملابس",              category: "clothing"    },
    { id: 2, userId: 17, name: "متجر الخير للمواد الغذائية",      category: "food"        },
    { id: 3, userId: 18, name: "متجر الزيتون للإلكترونيات",       category: "electronics" },
    { id: 4, userId: 19, name: "متجر الياسمين للمصنوعات اليدوية", category: "handmade"    },
    { id: 5, userId: 20, name: "متجر البركة للكتب",               category: "books"       },
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
    default_target_id: 1,
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Partners: ${partnersRaw.length}`)

  // ── 5. CAMPAIGNS (20) ─────────────────────────────────────────────────────
  // medical(7) | education(5) | relief(5) | reconstruction(3)
  // 15 active | 3 paused | 2 completed
  const campaignsRaw = [
    // Medical (7)
    { id:1,  type:"medical",        status:"active",    target:30000, raised:18700, cityIdx:1,
      ar:"علاج أطفال القلب في حلب",                              en:"Treating Children with Heart Disease in Aleppo",
      dAr:"نعمل على تأمين 12 عملية قلب مفتوح لأطفال دون العاشرة في مستشفى حلب الجامعي خلال 2025. كل 2500 دولار تنقذ طفلاً واحداً.",
      dEn:"We are securing 12 open-heart surgeries for children under ten at Aleppo University Hospital in 2025. Every $2,500 saves one child.",
      start:new Date("2025-01-15"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800" },
    { id:2,  type:"medical",        status:"completed", target:50000, raised:50000, cityIdx:0,
      ar:"أدوية الأمراض المزمنة لمستشفى الميدان في دمشق",        en:"Chronic Medications for Al-Midan Hospital in Damascus",
      dAr:"أمّنت هذه الحملة 6 أشهر من الأدوية الأساسية لأكثر من 300 مريض بالسكري والضغط وأمراض القلب في حي الميدان بدمشق.",
      dEn:"This campaign secured 6 months of essential medications for over 300 patients with diabetes, hypertension, and heart conditions in the Midan district.",
      start:new Date("2024-06-01"), end:new Date("2024-12-31"),
      img:"https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800" },
    { id:3,  type:"medical",        status:"active",    target:40000, raised:23500, cityIdx:2,
      ar:"جلسات العلاج الكيميائي لمرضى السرطان في حمص",          en:"Chemotherapy Sessions for Cancer Patients in Homs",
      dAr:"40 مريضاً بالسرطان في حمص بحاجة إلى 6 جلسات علاج كيميائي لكل منهم. كل تبرع يُترجم مباشرة إلى دورة علاجية تمتد 21 يوماً.",
      dEn:"40 cancer patients in Homs need 6 chemotherapy sessions each. Every donation translates directly into a 21-day treatment cycle.",
      start:new Date("2025-02-01"), end:new Date("2025-11-30"),
      img:"https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800" },
    { id:4,  type:"medical",        status:"active",    target:25000, raised:10200, cityIdx:3,
      ar:"أطراف اصطناعية لجرحى الحرب في اللاذقية",               en:"Prosthetic Limbs for War Wounded in Latakia",
      dAr:"نوفر أطرافاً اصطناعية حديثة لـ 10 شباب فقدوا أطرافهم في الحرب. تكلفة كل طرف 2500 دولار تشمل التركيب وجلسات إعادة التأهيل.",
      dEn:"We provide modern prosthetics for 10 young men who lost limbs in war. Each prosthetic costs $2,500 including fitting and rehabilitation sessions.",
      start:new Date("2025-03-01"), end:new Date("2026-03-01"),
      img:"https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800" },
    { id:5,  type:"medical",        status:"active",    target:15000, raised:6800,  cityIdx:4,
      ar:"غسيل كلوي مجاني لمرضى حماة",                           en:"Free Dialysis for Kidney Patients in Hama",
      dAr:"30 مريضاً بالفشل الكلوي في حماة يحتاجون 3 جلسات غسيل أسبوعياً. هذه الحملة تموّل 12 شهراً كاملة بـ 500 دولار للمريض شهرياً.",
      dEn:"30 kidney failure patients in Hama need 3 dialysis sessions per week. This campaign funds 12 uninterrupted months at $500 per patient per month.",
      start:new Date("2025-01-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800" },
    { id:6,  type:"medical",        status:"paused",    target:20000, raised:8100,  cityIdx:7,
      ar:"رعاية الأمهات أثناء الحمل وما بعد الولادة في إدلب",    en:"Prenatal and Postnatal Care in Idlib",
      dAr:"تدعم هذه الحملة 200 أمّ حامل في ريف إدلب بمتابعة شهرية وتوفير الأدوية الضرورية وإجراء الولادة الآمنة في المستوصفات الميدانية.",
      dEn:"This campaign supports 200 pregnant women in rural Idlib with monthly monitoring, necessary medications, and safe delivery at field clinics.",
      start:new Date("2025-04-01"), end:new Date("2025-10-01"),
      img:"https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800" },
    { id:7,  type:"medical",        status:"completed", target:12000, raised:12000, cityIdx:8,
      ar:"تطعيمات الأطفال في محافظة درعا",                        en:"Children Vaccinations in Daraa Governorate",
      dAr:"كمّلنا تطعيم 1800 طفل دون الخامسة في 14 قرية بمحافظة درعا ضد الحصبة وشلل الأطفال والتهاب الكبد. اكتملت الحملة بدعم 420 متبرعاً.",
      dEn:"We completed vaccinating 1,800 children under five in 14 villages in Daraa against measles, polio, and hepatitis. The campaign completed with 420 donors.",
      start:new Date("2024-09-01"), end:new Date("2025-01-31"),
      img:"https://images.unsplash.com/photo-1576671081837-49000212a370?w=800" },
    // Education (5)
    { id:8,  type:"education",      status:"active",    target:45000, raised:29000, cityIdx:1,
      ar:"إنشاء مدرسة ابتدائية في ريف حلب الغربي",               en:"Building a Primary School in Western Rural Aleppo",
      dAr:"900 طفل في 5 قرى بريف حلب الغربي لا مدرسة على مسافة أقل من 8 كيلومترات. نبني مدرسة من 8 غرف صفية تستوعب 320 طالباً.",
      dEn:"900 children in 5 villages in Western rural Aleppo have no school within 8 km. We are building an 8-classroom school for 320 students.",
      start:new Date("2025-01-01"), end:new Date("2026-01-01"),
      img:"https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800" },
    { id:9,  type:"education",      status:"active",    target:20000, raised:11500, cityIdx:0,
      ar:"منح جامعية لأبناء الشهداء في دمشق",                     en:"University Scholarships for Martyrs' Children in Damascus",
      dAr:"30 طالباً من أبناء الشهداء قُبلوا في الجامعات لكنهم عاجزون عن دفع الرسوم. كل 670 دولار تكفل سنة دراسية كاملة لطالب واحد.",
      dEn:"30 students, children of martyrs, were accepted to universities but cannot pay tuition. $670 sponsors a full academic year for one student.",
      start:new Date("2025-02-01"), end:new Date("2025-08-31"),
      img:"https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800" },
    { id:10, type:"education",      status:"active",    target:8000,  raised:3400,  cityIdx:2,
      ar:"حقائب مدرسية لأطفال المناطق المتضررة في حمص",           en:"School Bags for Children in Affected Areas of Homs",
      dAr:"نوزع 800 حقيبة مدرسية كاملة تحتوي على الكتب والقرطاسية والزي المدرسي لأطفال لن يذهبوا للمدرسة بدونها. التوزيع أغسطس 2025.",
      dEn:"We distribute 800 complete school bags including books, stationery, and uniforms for children who cannot attend school without them. Distribution in August 2025.",
      start:new Date("2025-08-01"), end:new Date("2025-09-30"),
      img:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800" },
    { id:11, type:"education",      status:"paused",    target:18000, raised:5200,  cityIdx:6,
      ar:"مركز محو الأمية للكبار في طرطوس",                       en:"Adult Literacy Center in Tartus",
      dAr:"أكثر من 400 شخص في ريف طرطوس لا يعرفون القراءة والكتابة. ندير مركزاً يستوعب 50 شخصاً في الدورة الواحدة بتكلفة 18,000 دولار لثلاث سنوات.",
      dEn:"Over 400 people in rural Tartus cannot read or write. We run a center accommodating 50 people per cycle at $18,000 for three years.",
      start:new Date("2025-05-01"), end:new Date("2025-11-01"),
      img:"https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800" },
    { id:12, type:"education",      status:"active",    target:22000, raised:9200,  cityIdx:5,
      ar:"مكتبة رقمية ومراكز تعلم في ريف دير الزور",              en:"Digital Library and Learning Centers in Rural Deir ez-Zor",
      dAr:"نوفر 110 جهازاً لوحياً مع اشتراك محتوى تعليمي لـ 3 سنوات لمدارس في قرى ريف دير الزور التي تعاني من شح المعلمين المتخصصين.",
      dEn:"We provide 110 tablets with 3-year educational subscriptions to schools in rural Deir ez-Zor villages suffering from a shortage of qualified teachers.",
      start:new Date("2025-03-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800" },
    // Relief (5)
    { id:13, type:"relief",         status:"active",    target:15000, raised:14600, cityIdx:0,
      ar:"سلال رمضان الغذائية لـ 300 أسرة في دمشق",              en:"Ramadan Food Baskets for 300 Families in Damascus",
      dAr:"300 سلة غذائية لأسر الشهداء والمعوزين في أحياء برزة والميدان وكفرسوسة. كل سلة تكفي أسرة من 5 أفراد شهراً كاملاً.",
      dEn:"300 food baskets for families of martyrs and the underprivileged in Barza, Midan, and Kafrsouseh. Each basket sustains a family of 5 for a full month.",
      start:new Date("2025-02-28"), end:new Date("2025-04-01"),
      img:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800" },
    { id:14, type:"relief",         status:"active",    target:35000, raised:16800, cityIdx:3,
      ar:"دعم 500 أسرة نازحة في اللاذقية",                        en:"Supporting 500 Displaced Families in Latakia",
      dAr:"500 أسرة نزحت من حلب وإدلب وتسكن في مخيمات مكتظة في ضواحي اللاذقية. نؤمن سلة غذائية شهرية وبطانيات ومواد تنظيف لكل أسرة.",
      dEn:"500 families displaced from Aleppo and Idlib live in overcrowded camps on Latakia's outskirts. We provide monthly food baskets, blankets, and cleaning supplies.",
      start:new Date("2025-01-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800" },
    { id:15, type:"relief",         status:"paused",    target:10000, raised:3200,  cityIdx:4,
      ar:"ملابس الشتاء للأسر المتضررة في حماة",                   en:"Winter Clothing for Affected Families in Hama",
      dAr:"نوزع ملابس شتوية دافئة (معاطف وسترات وأحذية) على 400 أسرة في أحياء حماة المتضررة قبل نهاية أكتوبر 2025.",
      dEn:"We distribute warm winter clothing (coats, sweaters, boots) to 400 families in affected Hama neighborhoods before October 2025.",
      start:new Date("2025-10-01"), end:new Date("2025-12-31"),
      img:"https://images.unsplash.com/photo-1608613304810-2d4dd52511a2?w=800" },
    { id:16, type:"relief",         status:"active",    target:28000, raised:20000, cityIdx:5,
      ar:"إغاثة متضرري الفيضانات في ريف دير الزور",               en:"Relief for Flood Victims in Rural Deir ez-Zor",
      dAr:"فيضانات الشتاء دمّرت محاصيل 120 أسرة في ريف دير الزور. الإغاثة تشمل خيام الطوارئ والغذاء ومياه الشرب النظيفة.",
      dEn:"Winter floods destroyed crops for 120 families in rural Deir ez-Zor. Relief includes emergency tents, food, and clean drinking water.",
      start:new Date("2025-01-15"), end:new Date("2025-06-30"),
      img:"https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800" },
    { id:17, type:"relief",         status:"active",    target:18000, raised:5800,  cityIdx:7,
      ar:"مشروع مياه نظيفة لـ 16 قرية في ريف إدلب",               en:"Clean Water Project for 16 Villages in Rural Idlib",
      dAr:"16 قرية في جنوب إدلب تعتمد على مياه الآبار الملوثة. نحفر 4 آبار ارتوازية عميقة ونركّب مضخات طاقة شمسية لخدمة 8000 شخص.",
      dEn:"16 villages in southern Idlib rely on contaminated well water. We drill 4 deep artesian wells and install solar-powered pumps to serve 8,000 people.",
      start:new Date("2025-04-01"), end:new Date("2025-10-31"),
      img:"https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=800" },
    // Reconstruction (3)
    { id:18, type:"reconstruction", status:"active",    target:50000, raised:13000, cityIdx:2,
      ar:"إعادة بناء 10 منازل في حي الخالدية بحمص",               en:"Rebuilding 10 Homes in Khalidiyah, Homs",
      dAr:"حي الخالدية في حمص لا يزال يحمل جراح الحرب. 10 منازل هُدمت كلياً وأهلها يقيمون في ملاجئ. كل منزل يكلف 5000 دولار ويؤوي عائلة من 6 أشخاص.",
      dEn:"Khalidiyah in Homs still bears war's scars. 10 homes were destroyed and residents live in shelters. Each home costs $5,000 and houses a family of 6.",
      start:new Date("2025-01-01"), end:new Date("2026-06-30"),
      img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800" },
    { id:19, type:"reconstruction", status:"active",    target:32000, raised:8500,  cityIdx:5,
      ar:"ترميم 4 مدارس متضررة في ريف دير الزور",                  en:"Restoring 4 Damaged Schools in Rural Deir ez-Zor",
      dAr:"4 مدارس في ريف دير الزور أُصيبت بأضرار جسيمة. ترميم الأسقف والأبواب والنوافذ وتوصيل الكهرباء يكلف 32,000 دولار ويعيد 1200 طالب.",
      dEn:"4 schools in rural Deir ez-Zor suffered severe damage. Restoring roofs, doors, windows, and electricity costs $32,000 and returns 1,200 students.",
      start:new Date("2025-02-01"), end:new Date("2026-02-01"),
      img:"https://images.unsplash.com/photo-1562774053-701939374585?w=800" },
    { id:20, type:"reconstruction", status:"active",    target:45000, raised:11500, cityIdx:9,
      ar:"إعادة تأهيل شبكة الصرف الصحي في الرقة",                  en:"Rehabilitating the Sewage Network in Raqqa",
      dAr:"الشبكة القديمة في أحياء الرقة لم تُصلح منذ 2017 وباتت مصدر تلوث مائي خطير. المشروع يعيد تأهيل 12 كيلومتراً من الشبكة الرئيسية.",
      dEn:"The old network in Raqqa neighborhoods hasn't been repaired since 2017 and is now a serious contamination source. The project rehabilitates 12 km of the main network.",
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
  // 8 active | 2 approved | 3 under_review | 2 submitted | 2 draft | 2 rejected | 1 completed
  // ALL types are valid main_section keys — "housing" is never used
  const casesRaw = [
    // Active (8) — ids 1–8
    {
      id:1, type:"medical", beneficiaryId:9, cityIdx:1, neighborhood:"صلاح الدين",
      target:12000, raised:5200, status:"active", priority:"urgent", privacy:"masked", aliasName:"مستفيد #1",
      ar:"طفل بحاجة ماسة لعملية قلب مفتوح في حلب",       en:"Child in Urgent Need of Open-Heart Surgery in Aleppo",
      dAr:"طفل عمره 7 سنوات في حي صلاح الدين بحلب تشخّص بثقب في الحاجز البطيني. الطبيب حدّد موعد العملية في أبريل 2025 لكن التكلفة 12,000 دولار خارج إمكانيات الأسرة.",
      dEn:"A 7-year-old in Salaheddin, Aleppo was diagnosed with a ventricular septal defect. The doctor scheduled surgery for April 2025, but the $12,000 cost is beyond the family's means.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
    {
      id:2, type:"education", beneficiaryId:10, cityIdx:0, neighborhood:"ركن الدين",
      target:5000, raised:1800, status:"active", priority:"high", privacy:"public",
      ar:"منحة دراسية لطالب هندسة مهجّر من درعا",         en:"Scholarship for Displaced Engineering Student from Daraa",
      dAr:"طالب في هندسة الاتصالات نزح من درعا إلى دمشق وقُبل في الجامعة لكن لا معيل له. يحتاج 5000 دولار لـ 3 سنوات من الرسوم والإيجار والمعيشة.",
      dEn:"A telecommunications engineering student displaced from Daraa to Damascus, accepted to university but has no provider. Needs $5,000 for 3 years of tuition, rent, and living.",
      img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800", rejectionReason:null,
    },
    {
      id:3, type:"relief", beneficiaryId:11, cityIdx:7, neighborhood:"سرمدا",
      target:3000, raised:1400, status:"active", priority:"urgent", privacy:"public",
      ar:"أسرة نازحة بلا غذاء في مخيمات ريف إدلب",        en:"Displaced Family Without Food in Idlib Camps",
      dAr:"أسرة من 7 أشخاص (أم أرملة مع 6 أطفال) في مخيم عشوائي قرب سرمدا بريف إدلب. لا مدخول ثابت ولا احتياطيات. 3000 دولار تكفيهم سنة من الغذاء الأساسي.",
      dEn:"A family of 7 (widowed mother with 6 children) in an informal camp near Sarmada in rural Idlib. No fixed income, no savings. $3,000 covers a year of basic food.",
      img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800", rejectionReason:null,
    },
    {
      id:4, type:"shelter", beneficiaryId:12, cityIdx:2, neighborhood:"الوعر",
      target:7000, raised:2800, status:"active", priority:"high", privacy:"public",
      ar:"إيجار طارئ لأسرة طُردت من منزلها في الوعر بحمص",  en:"Emergency Rent for Family Evicted in Al-Waer, Homs",
      dAr:"عائلة من حي الوعر بحمص طُردت بعد عجزها عن دفع إيجار 6 أشهر. الأب مصاب بإعاقة جزئية والأم لا تعمل. 7000 دولار تؤمن 3 سنوات إيجار وأثاثاً أساسياً.",
      dEn:"A family from Al-Waer in Homs was evicted after failing to pay 6 months of rent. Father has partial disability, mother unemployed. $7,000 covers 3 years of rent and basic furniture.",
      img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", rejectionReason:null,
    },
    {
      id:5, type:"medical", beneficiaryId:13, cityIdx:3, neighborhood:"اللاذقية الجديدة",
      target:15000, raised:9800, status:"active", priority:"urgent", privacy:"masked", aliasName:"مستفيدة #5",
      ar:"امرأة تحارب سرطان الثدي في اللاذقية",            en:"Woman Fighting Breast Cancer in Latakia",
      dAr:"أم لثلاثة أطفال في اللاذقية الجديدة تشخّصت بسرطان الثدي في المرحلة الثانية. تحتاج 8 جلسات كيماوي وعملية جراحية وإشعاع. إجمالي التكلفة 15,000 دولار.",
      dEn:"A mother of three in New Latakia diagnosed with Stage 2 breast cancer. Needs 8 chemo sessions, surgery, and radiation. Total cost is $15,000.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
    {
      id:6, type:"orphans", beneficiaryId:14, cityIdx:0, neighborhood:"حي الميدان",
      target:6000, raised:2100, status:"active", priority:"high", privacy:"masked", aliasName:"أيتام عائلة #6",
      ar:"كفالة ثلاثة أيتام في حي الميدان بدمشق",           en:"Sponsoring Three Orphans in Al-Midan, Damascus",
      dAr:"ثلاثة أطفال (9، 12، 15 سنة) فقدوا أباهم عام 2022. أمهم تعمل خادمة منزلية بدخل لا يتجاوز 80 دولاراً. 6000 دولار تكفل 3 سنوات تعليم ورعاية.",
      dEn:"Three children (9, 12, 15 years) lost their father in 2022. Their mother earns no more than $80 as a domestic worker. $6,000 covers 3 years of education and care.",
      img:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800", rejectionReason:null,
    },
    {
      id:7, type:"elderly", beneficiaryId:15, cityIdx:4, neighborhood:"حي العزيزية",
      target:3600, raised:1200, status:"active", priority:"normal", privacy:"public",
      ar:"رعاية مسنّة وحيدة في حي العزيزية بحماة",           en:"Care for an Elderly Woman Living Alone in Hama",
      dAr:"سيدة عمرها 74 سنة تعيش وحيدة في حي العزيزية بحماة. أصيبت بكسر في الورك ولا أحد يرعاها. 300 دولار شهرياً لأدوية وغذاء وزيارات رعاية لمدة سنة.",
      dEn:"A 74-year-old woman lives alone in Al-Aziziyah, Hama. She suffered a hip fracture with no one to care for her. $300/month covers medicine, food, and care visits for one year.",
      img:"https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=800", rejectionReason:null,
    },
    {
      id:8, type:"humanitarian", beneficiaryId:9, cityIdx:8, neighborhood:"درعا البلد",
      target:9000, raised:3100, status:"active", priority:"high", privacy:"public",
      ar:"توزيع مواد إنسانية لـ 60 أسرة في درعا البلد",     en:"Humanitarian Supplies for 60 Families in Daraa al-Balad",
      dAr:"60 أسرة في درعا البلد لا تصل إليها المساعدات بسبب الوضع الأمني. الطرد تشمل مواد غذائية وطبية ومنظفات وبطانيات لشهرين.",
      dEn:"60 families in Daraa al-Balad cannot receive aid due to the security situation. Packages include food, medical supplies, detergents, and blankets for two months.",
      img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800", rejectionReason:null,
    },
    // Approved (2) — ids 9–10
    {
      id:9, type:"medical", beneficiaryId:10, cityIdx:9, neighborhood:"مدينة الرقة",
      target:6500, raised:1500, status:"approved", priority:"urgent", privacy:"public",
      ar:"قسطرة قلبية لمريض في الرقة",                      en:"Cardiac Catheterization for Patient in Raqqa",
      dAr:"مريض في الرقة تشخّص بضيق في صمام الأورطي ويحتاج قسطرة قلبية في مستشفى دمشق الجامعي. التكلفة 6500 دولار تشمل السفر والعملية وأسبوعين تعافٍ.",
      dEn:"A patient in Raqqa diagnosed with aortic valve stenosis needs cardiac catheterization at Damascus University Hospital. $6,500 covers travel, procedure, and two weeks of recovery.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
    {
      id:10, type:"education", beneficiaryId:11, cityIdx:1, neighborhood:"الأنصاري",
      target:1200, raised:400, status:"approved", priority:"normal", privacy:"public",
      ar:"حاسوب محمول لطالبة هندسة حاسوب في حلب",            en:"Laptop for a Female Computer Engineering Student in Aleppo",
      dAr:"طالبة في السنة الثالثة هندسة حاسوب في حلب. جميع مشاريع تخرجها تتطلب حاسوباً ولا تملك سوى هاتف قديم. 1200 دولار تغيّر مسار دراستها.",
      dEn:"A third-year computer engineering student in Aleppo. All graduation projects require a computer but she only has an old phone. $1,200 changes the course of her studies.",
      img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800", rejectionReason:null,
    },
    // Under review (3) — ids 11–13
    {
      id:11, type:"shelter", beneficiaryId:12, cityIdx:0, neighborhood:"باب توما",
      target:4800, raised:0, status:"under_review", priority:"high", privacy:"public",
      ar:"إيجار سنوي لأسرة نازحة في دمشق القديمة",           en:"Annual Rent for Displaced Family in Old Damascus",
      dAr:"أسرة نزحت من حلب عام 2016 تسكن في غرفة واحدة قرب باب توما بدمشق. المالك طالب بتسوية الإيجار المتأخر أو الإخلاء. 4800 دولار تغطي سنة كاملة.",
      dEn:"A family displaced from Aleppo in 2016 lives in a single room near Bab Touma in Damascus. The landlord demanded settlement or eviction. $4,800 covers a full year.",
      img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", rejectionReason:null,
    },
    {
      id:12, type:"education", beneficiaryId:13, cityIdx:1, neighborhood:"حلب القديمة",
      target:3600, raised:0, status:"under_review", priority:"normal", privacy:"public",
      ar:"رسوم مدرسية لـ 5 أطفال أيتام في حلب القديمة",      en:"School Fees for 5 Orphaned Children in Old Aleppo",
      dAr:"أم أرملة من حلب القديمة لديها 5 أطفال بين 7 و16 سنة. لا يستطيعون الاستمرار في المدرسة بسبب الرسوم المتراكمة. 3600 دولار تُنهي عامين دراسيين.",
      dEn:"A widowed mother from Old Aleppo has 5 children aged 7 to 16. They cannot continue school due to accumulated fees. $3,600 covers two academic years.",
      img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800", rejectionReason:null,
    },
    {
      id:13, type:"medical", beneficiaryId:14, cityIdx:2, neighborhood:"باب هود",
      target:6000, raised:0, status:"under_review", priority:"high", privacy:"public",
      ar:"علاج أسنان مجاني لـ 50 محتاجاً في باب هود بحمص",   en:"Free Dental Treatment for 50 Needy People in Bab Hood, Homs",
      dAr:"حملة لتوفير علاج أسنان مجاني لـ 50 شخصاً في حي باب هود بحمص. تشمل خلعاً وحشوات وتركيبات مع طبيب متطوع. 6000 دولار تغطي المواد والأجهزة.",
      dEn:"A campaign for free dental treatment for 50 people in Bab Hood, Homs. Includes extractions, fillings, and dentures with a volunteer doctor. $6,000 covers materials and equipment.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
    // Submitted (2) — ids 14–15
    {
      id:14, type:"relief", beneficiaryId:15, cityIdx:3, neighborhood:"ضاحية الزراعة",
      target:2000, raised:0, status:"submitted", priority:"high", privacy:"public",
      ar:"حطب ووقود تدفئة لأسرتين في اللاذقية",               en:"Firewood and Heating Fuel for Two Families in Latakia",
      dAr:"أسرتان في ضاحية الزراعة باللاذقية بلا تدفئة لأول مرة. الشتاء قادم والأطفال في خطر. 2000 دولار تشتري الحطب والمازوت الكافي لشتاء كامل.",
      dEn:"Two families in the Agricultural suburb of Latakia are without heating for the first time. Winter is approaching and young children are at risk. $2,000 buys enough firewood and heating oil.",
      img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800", rejectionReason:null,
    },
    {
      id:15, type:"shelter", beneficiaryId:9, cityIdx:4, neighborhood:"حي المحطة",
      target:5500, raised:0, status:"submitted", priority:"urgent", privacy:"public",
      ar:"إعادة توطين أسرة فقدت منزلها في حريق بحماة",        en:"Resettling a Family That Lost Their Home in a Hama Fire",
      dAr:"أسرة من حي المحطة بحماة فقدت منزلها كاملاً في حريق فبراير 2025. لا تأمين ولا أقارب للإقامة معهم. 5500 دولار لإيجاد مسكن وتأثيثه من الصفر.",
      dEn:"A family from Al-Mahatta in Hama lost their entire home in a February 2025 fire. No insurance, no relatives. $5,500 to find housing and furnish it from scratch.",
      img:"https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", rejectionReason:null,
    },
    // Draft (2) — ids 16–17
    {
      id:16, type:"medical", beneficiaryId:10, cityIdx:5, neighborhood:"دير الزور المدينة",
      target:3600, raised:0, status:"draft", priority:"normal", privacy:"public",
      ar:"أدوية مزمنة لمريض ضغط وسكري في دير الزور",          en:"Chronic Medications for Hypertension and Diabetes Patient in Deir ez-Zor",
      dAr:"رجل عمره 62 سنة يعاني من ضغط وسكري مزمنَين ولا يستطيع تأمين أدويته. تكلفة الأدوية 300 دولار شهرياً — نطلب تمويل سنة كاملة أي 3600 دولار.",
      dEn:"A 62-year-old with chronic hypertension and diabetes cannot afford monthly medications costing $300. Requesting full-year funding: $3,600.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
    {
      id:17, type:"reconstruction", beneficiaryId:11, cityIdx:6, neighborhood:"طرطوس القديمة",
      target:14000, raised:0, status:"draft", priority:"normal", privacy:"public",
      ar:"ترميم منزل متصدع في طرطوس القديمة",                  en:"Repairing a Cracked House in Old Tartus",
      dAr:"منزل عمره 80 عاماً في طرطوس القديمة يسكنه ثلاثة أجيال. الجدران المتصدعة والسقف المهترئ يشكلان خطراً بعد أمطار الشتاء. 14,000 دولار للترميم الشامل.",
      dEn:"An 80-year-old house in Old Tartus houses 3 generations. Cracked walls and a deteriorating roof pose danger after winter rains. $14,000 for comprehensive renovation.",
      img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", rejectionReason:null,
    },
    // Rejected (2) — ids 18–19
    {
      id:18, type:"relief", beneficiaryId:12, cityIdx:7, neighborhood:"معرة النعمان",
      target:8000, raised:0, status:"rejected", priority:"normal", privacy:"public",
      ar:"صناديق إغاثة عامة لمعرة النعمان",                    en:"General Relief Boxes for Maarat al-Numan",
      dAr:"طلب توزيع صناديق إغاثة على 80 أسرة في معرة النعمان دون تحديد الأسر المستهدفة أو وثائق إثبات الاحتياج.",
      dEn:"Request to distribute relief boxes to 80 families in Maarat al-Numan without identifying target families or proof of need documentation.",
      img:"https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800",
      rejectionReason:"الطلب لا يتضمن قائمة موثقة بالأسر المستهدفة ولا وثائق إثبات الحاجة المطلوبة. يرجى إعادة التقديم مع الوثائق الكاملة.",
    },
    {
      id:19, type:"education", beneficiaryId:13, cityIdx:8, neighborhood:"درعا المحطة",
      target:10000, raised:0, status:"rejected", priority:"normal", privacy:"public",
      ar:"بناء فصل دراسي في مدرسة درعا",                       en:"Building a Classroom in a Daraa School",
      dAr:"طلب لبناء فصل دراسي في مدرسة ابتدائية حكومية بدرعا المحطة. المدرسة تعاني من اكتظاظ ظاهر.",
      dEn:"Request to build a classroom in a government primary school in Daraa al-Mahatta. The school has visible overcrowding.",
      img:"https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800",
      rejectionReason:"الحالة تتعلق ببنية تحتية مدرسة حكومية وليست حالة فردية. يُنصح بالتواصل مع برنامج إعادة الإعمار الخاص بالمؤسسات التعليمية.",
    },
    // Completed (1) — id 20
    {
      id:20, type:"medical", beneficiaryId:14, cityIdx:0, neighborhood:"كفرسوسة",
      target:4500, raised:4500, status:"completed", priority:"normal", privacy:"public",
      ar:"علاج طفلة من مرض وراثي نادر في دمشق",               en:"Treating a Girl with a Rare Genetic Disease in Damascus",
      dAr:"طفلة عمرها 5 سنوات في كفرسوسة تشخّصت بمرض وراثي نادر وأكملت علاجها بنجاح بعد 4 أشهر من التبرعات. نشكر 89 متبرعاً ساهموا في شفائها.",
      dEn:"A 5-year-old girl in Kafrsouseh was diagnosed with a rare genetic disease and completed treatment successfully after 4 months. We thank 89 donors who contributed to her recovery.",
      img:"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800", rejectionReason:null,
    },
  ]

  await db.collection("cases").insertMany(casesRaw.map((c) => ({
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
    status: c.status,
    priority: c.priority,
    beneficiary_id: c.beneficiaryId,
    created_by: c.beneficiaryId,
    assigned_admin_id: c.status === "under_review" ? 1 : null,
    rejection_reason: c.rejectionReason || null,
    privacy_mode: c.privacy,
    masked_display: c.privacy === "masked"
      ? { alias_name: c.aliasName || `مستفيد #${c.id}`, hide_images: true }
      : { alias_name: null, hide_images: false },
    location: geoLocation(c.cityIdx, c.neighborhood),
    partner_id: null,
    start_date: new Date("2025-01-01"),
    end_date: new Date("2025-12-31"),
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Cases: ${casesRaw.length}`)

  // ── 7. STORE PRODUCTS (20) — 4 per partner ───────────────────────────────
  const productsRaw = [
    // Partner 1 — clothing
    { partnerId:1, title:"قميص قطني سوري",             price:25, cost:15, stock:80,
      desc:"قميص رجالي من قطن حمصي 100% بخياطة يدوية، متوفر بألوان متعددة ومقاسات من S حتى 3XL.",
      img:"https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" },
    { partnerId:1, title:"عباءة تقليدية دمشقية",        price:45, cost:28, stock:50,
      desc:"عباءة نسائية من قماش البروكار الدمشقي الأصيل مزيّنة بتطريز ذهبي يدوي على الأكمام والنطاق.",
      img:"https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800" },
    { partnerId:1, title:"جلابية رجالية حلبية",          price:35, cost:22, stock:60,
      desc:"جلابية تقليدية من الكتان الخفيف مناسبة للصيف، مصنوعة بأيدي حرفيين من حي القليج في حلب.",
      img:"https://images.unsplash.com/photo-1558171813-38d61b49a32d?w=800" },
    { partnerId:1, title:"طاقية صوفية محلية",            price:12, cost:7,  stock:100,
      desc:"طاقية شتوية من صوف الخروف السوري المحلي، تُنسج يدوياً بألوان تراثية وتدوم أكثر من عشر سنوات.",
      img:"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800" },
    // Partner 2 — food
    { partnerId:2, title:"صابون زيت الزيتون الحلبي",    price:8,  cost:4,  stock:200,
      desc:"صابون حلبي أصيل مصنوع بطريقة التسخين البارد من زيت الزيتون وزيت الغار، ناضج 6 أشهر قبل البيع.",
      img:"https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=800" },
    { partnerId:2, title:"معجون الفستق الحلبي",          price:18, cost:11, stock:120,
      desc:"معجون فستق نقي 100% من بساتين حلب، بدون مواد حافظة، يُعصر على الحجر الباردة يومياً.",
      img:"https://images.unsplash.com/photo-1543340713-4e83c7ac9cd8?w=800" },
    { partnerId:2, title:"زيت زيتون سوري بكر ممتاز",     price:22, cost:14, stock:90,
      desc:"عصير أول من مزارع ريف إدلب، حموضة أقل من 0.3%، معبّأ في زجاجة داكنة تحفظه من الضوء والأكسدة.",
      img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800" },
    { partnerId:2, title:"شاي أعشاب طبيعية محلية",       price:10, cost:6,  stock:150,
      desc:"مزيج من الميرمية والزعتر والبابونج وعشبة الليمون، مجففة هوائياً بلا إضافات من مرتفعات جبل الشيخ.",
      img:"https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800" },
    // Partner 3 — electronics
    { partnerId:3, title:"شاحن محمول 10000mAh",          price:35, cost:22, stock:40,
      desc:"بطارية طاقة بشحن سريع 22.5W متوافق مع USB-A وUSB-C، تضمن شحنتين كاملتين للهواتف الحديثة.",
      img:"https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800" },
    { partnerId:3, title:"سماعات لاسلكية بلوتوث",        price:55, cost:35, stock:30,
      desc:"سماعات over-ear بعازل ضوضاء نشط وبطارية 30 ساعة ومقاومة رطوبة IPX5، مثالية للعمل والدراسة عن بُعد.",
      img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800" },
    { partnerId:3, title:"كابل شحن متعدد الأطراف",        price:12, cost:7,  stock:100,
      desc:"كابل 1.2 متر يدعم USB-C وMicro-USB وLightning في كابل واحد بضفيرة نايلون تتحمل 20,000 ثنية.",
      img:"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800" },
    { partnerId:3, title:"حامل هاتف مغناطيسي للسيارة",   price:15, cost:9,  stock:70,
      desc:"يثبّت على فتحة التهوية بمغناطيس قوي ويدعم الشحن اللاسلكي 15W للهواتف المتوافقة دون كابلات.",
      img:"https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800" },
    // Partner 4 — handmade
    { partnerId:4, title:"وسادة مطرزة يدوياً",            price:40, cost:25, stock:25,
      desc:"وسادة 50×50 سم مطرزة بخيوط الحرير الطبيعي بنقوش دمشقية أصيلة، تستغرق صنعها 40 ساعة عمل.",
      img:"https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800" },
    { partnerId:4, title:"سجادة حرفية صغيرة",             price:65, cost:42, stock:15,
      desc:"سجادة يدوية من الصوف الطبيعي 60×90 سم بنقوش تقليدية حمصية، تُنسج على نول خشبي تقليدي بثلاثة أشهر.",
      img:"https://images.unsplash.com/photo-1600166898405-da9535204843?w=800" },
    { partnerId:4, title:"علبة خشبية منقوشة يدوياً",      price:30, cost:18, stock:35,
      desc:"علبة من خشب الجوز السوري منقوشة بأنماط هندسية إسلامية بإزميل دقيق، لحفظ المجوهرات أو كهدية.",
      img:"https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=800" },
    { partnerId:4, title:"لوحة فنية تراثية يدوية",         price:50, cost:32, stock:20,
      desc:"لوحة 40×60 سم تجسّد خاناً أو جامعاً أثرياً بأسلوب المنمنمات الشرقية، موقّعة من الفنان بإطار خشبي.",
      img:"https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800" },
    // Partner 5 — books
    { partnerId:5, title:"كتاب تعليم العربية للأطفال",    price:12, cost:7,  stock:200,
      desc:"سلسلة 3 كتب مصورة للأطفال 4-8 سنوات تُعلّم الحروف والأرقام والكلمات بأسلوب لعبي محبّب.",
      img:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800" },
    { partnerId:5, title:"رواية عربية معاصرة",             price:15, cost:9,  stock:150,
      desc:"مختارات من أبرز الروايات العربية 2020-2024، مجلّدة بغلاف صلب وخط مريح للقراءة المطوّلة.",
      img:"https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800" },
    { partnerId:5, title:"كتاب الطبخ السوري التقليدي",    price:20, cost:12, stock:100,
      desc:"أكثر من 120 وصفة سورية أصيلة موثّقة من ربّات بيوت في دمشق وحلب وحمص، مع صور احترافية لكل وصفة.",
      img:"https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800" },
    { partnerId:5, title:"قصص أطفال مصورة",               price:10, cost:6,  stock:180,
      desc:"مجموعة 6 قصص للأطفال 3-7 سنوات عن الشجاعة والتعاون والتسامح بشخصيات سورية محلية مرسومة بعناية.",
      img:"https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800" },
  ]

  await db.collection("store_products").insertMany(productsRaw.map((p, i) => ({
    id: i + 1,
    title: p.title,
    description: p.desc,
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
    target_id: (i % 5) + 1,
    created_at: now,
    updated_at: now,
  })))
  console.log(`✓ Store products: ${productsRaw.length}`)

  // ── 8. DONATIONS (25) ────────────────────────────────────────────────────
  // More variety in amounts; completed cases (id=20) and near-target campaigns explained
  const PMETHODS = ["card", "bank", "cash"]
  const donationsRaw = [
    { donorId:2, campaignId:1,  amount:500              },
    { donorId:3, caseId:1,      amount:150, anon:true   },
    { donorId:4, campaignId:3,  amount:1000             },
    { donorId:5, caseId:2,      amount:75               },
    { donorId:6, campaignId:8,  amount:500              },
    { donorId:7, caseId:5,      amount:300, anon:true   },
    { donorId:8, campaignId:13, amount:200              },
    { donorId:2, caseId:3,      amount:180              },
    { donorId:3, campaignId:14, amount:250              },
    { donorId:4, caseId:4,      amount:400, anon:true   },
    { donorId:5, campaignId:2,  amount:800              },
    { donorId:6, caseId:6,      amount:120              },
    { donorId:7, campaignId:16, amount:450              },
    { donorId:8, caseId:7,      amount:200              },
    { donorId:2, campaignId:4,  amount:90               },
    { donorId:3, caseId:8,      amount:600              },
    { donorId:4, campaignId:9,  amount:250              },
    { donorId:5, caseId:9,      amount:10               },
    { donorId:6, campaignId:17, amount:350              },
    { donorId:7, caseId:20,     amount:500, anon:true   },
    { donorId:8, campaignId:7,  amount:300              },
    { donorId:2, caseId:20,     amount:250              },
    { donorId:3, campaignId:2,  amount:700              },
    { donorId:4, caseId:1,      amount:1000             },
    { donorId:5, campaignId:13, amount:400              },
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
    {
      ar:"حملة الخير الرمضانية — تبرّع الآن",       en:"Ramadan Charity Campaign — Donate Now",
      desc:"في رمضان كل لحظة خير مضاعفة. تبرّع لحملة سلال الغذاء الرمضانية ووصل العطاء لـ 300 أسرة في دمشق.",
      category:"seasonal",
      img:"https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800",
      link:"/campaigns/13",
    },
    {
      ar:"ادعم بناء مستشفى ميداني في ريف إدلب",     en:"Support a Field Hospital in Rural Idlib",
      desc:"نحتاج 30,000 دولار لتجهيز وحدة طوارئ ميدانية في ريف إدلب تخدم 40,000 شخص. كل دولار ينقذ حياة.",
      category:"medical",
      img:"https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
      link:"/campaigns/1",
    },
    {
      ar:"ساعد طفلاً يتيماً في مواصلة تعليمه",       en:"Help an Orphan Continue Their Education",
      desc:"670 دولار فقط تكفل سنة دراسية كاملة لطالب يتيم. ادعم برنامج المنح وغيّر مسار حياة طفل.",
      category:"education",
      img:"https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800",
      link:"/campaigns/9",
    },
    {
      ar:"تسوّق وساهم — متجرنا الخيري مفتوح",        en:"Shop and Give — Our Charity Store is Open",
      desc:"كل عملية شراء من متجر الخير تذهب نسبة 10% مباشرة لدعم الحالات الإنسانية المعتمدة على المنصة.",
      category:"store",
      img:"https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800",
      link:"/store",
    },
    {
      ar:"صندوق الطوارئ — تبرّع فوري بلا قيود",      en:"Emergency Fund — Donate Immediately, No Restrictions",
      desc:"الطوارئ لا تنتظر. صندوقنا يتحرك خلال 24 ساعة للوصول إلى المتضررين أينما كانوا في سوريا.",
      category:"emergency",
      img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800",
      link:"/emergency",
    },
  ]

  await db.collection("advertisements").insertMany(adsRaw.map((a, i) => ({
    id: i + 1,
    title: a.ar,
    title_i18n: { ar: a.ar, en: a.en },
    description: a.desc,
    image_url: a.img,
    link_url: a.link,
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
    users: 20, campaigns: 20, cases: 20, donations: 25,
    partners: 5, store_products: 20, advertisements: 5, emergency_fund: 1,
    case_documents: 0, case_updates: 0, orders: 0, audit_logs: 0,
    refresh_tokens: 0, store_applications: 0, notifications: 0,
    campaign_support_messages: 0, support_reports: 0,
  }
  for (const [name, seq] of Object.entries(counters)) {
    await db.collection("counters").updateOne({ _id: name }, { $set: { seq } }, { upsert: true })
  }
  console.log("✓ Counters reset")

  // ── 14. SUMMARY ───────────────────────────────────────────────────────────
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
