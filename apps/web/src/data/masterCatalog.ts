export interface MasterProductItem {
  name: string;
  sku: string;
  barcode?: string | null;
  mrp: number;
  purchase_price: number;
  sale_price: number;
  gst_rate: number;
  hsn_code: string | null;
  unit: string;
  default_stock?: number;
  reorder_level: number;
  image_url: string | null;
  category?: string;
  tag?: string;
  tagline?: string;
  features?: string[];
  specs?: string[];
}

export const MASTER_PRODUCTS: MasterProductItem[] = [
  // ==========================================
  // 1. DAIRY FARM ESSENTIALS & MACHINERY (Featured First)
  // ==========================================
  {
    name: "Liner for milking machine (27mm x 318mm)",
    sku: "MCL-027-404-11NT",
    barcode: "890923001001",
    mrp: 3000,
    purchase_price: 1500,
    sale_price: 3000,
    gst_rate: 5,
    hsn_code: "40169990",
    unit: "4 (Pcs)",
    default_stock: 30,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "FOOD-GRADE LINER",
    tagline: "Imported food-grade black rubber milking machine teat liners (Set of 4)",
    features: [
      "Optimal 27mm diameter and 318mm length fitting all standard shells.",
      "Smooth milk flow with gentle teat collapse action."
    ],
    specs: [
      "Diameter: 27mm",
      "Length: 318mm",
      "Material: Food-grade imported rubber",
      "Quantity: Pack of 4 pcs"
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Liner_for_milking_machine.jpg?v=1775722380"
  },
  {
    name: "Cleaning brush set (Lite) for Dairy Equipment",
    sku: "MCL-022-404-11NT",
    barcode: "890922001001",
    mrp: 1500,
    purchase_price: 1000,
    sale_price: 1500,
    gst_rate: 5,
    hsn_code: "96039000",
    unit: "Set",
    default_stock: 20,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "DAIRY SANITATION",
    tagline: "Multi-size brush set for milk claws, tubes, vacuum lines and teat cups",
    features: [
      "Durable non-abrasive nylon bristles removing milk stone and butterfat.",
      "Includes long flexible hose brush and claw brushes."
    ],
    specs: [
      "Bristles: Non-abrasive durable nylon",
      "Application: Milking tubes, claws, and teat cups",
      "Handle: Ergonomic anti-slip grip"
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Chimertech_Cleaning_Brush_Set_Lite_for_Dairy_Equipment.png?v=1779101319"
  },
  {
    name: "Automatic Vacuum Pressure Regulator for Milking",
    sku: "MCL-021-404-11NT",
    barcode: "890921001001",
    mrp: 500,
    purchase_price: 485,
    sale_price: 500,
    gst_rate: 18,
    hsn_code: "84811000",
    unit: "Pcs",
    default_stock: 20,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "VACUUM BALANCING",
    tagline: "Automatic precision vacuum pressure regulator for dairy milking machines*",
    features: [
      "Continuously stabilizes line vacuum at recommended 48–50 kPa.",
      "Prevents teat damage and erratic milking."
    ],
    specs: [
      "Type: Automatic vacuum relief valve",
      "Operating Range: 45 - 55 kPa",
      "Compatibility: Universal milking lines"
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Automatic_Vacuum_Pressure_Regulator_for_Milking_Machines_Chimertech.webp?v=1779100866"
  },
  {
    name: "Rubber Mat for Cows (6x4ft Interlocking Dairy Mat)",
    sku: "CHM-MAT-6X4",
    barcode: "890910001001",
    mrp: 3000,
    purchase_price: 2600,
    sale_price: 3000,
    gst_rate: 0,
    hsn_code: "40169100",
    unit: "6x4 ft",
    default_stock: 40,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "COW COMFORT MAT",
    tagline: "24mm heavy-duty non-slip interlocking cow mat for comfort, insulation & higher milk yield",
    features: [
      "Provides thermal insulation against cold/wet concrete floors.",
      "Reduces joint fatigue, prevents leg injuries and lameness, boosting milk yield."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Rubber_Mat_for_Cows_Interlocked.webp?v=1779108310"
  },
  {
    name: "Cow Lifting Machine (Downer Cow Recovery Crane)",
    sku: "CHM-COWLIFT-01",
    barcode: "890910002001",
    mrp: 38000,
    purchase_price: 24000,
    sale_price: 32500,
    gst_rate: 18,
    hsn_code: "84289090",
    unit: "Unit",
    default_stock: 2,
    reorder_level: 1,
    category: "Dairy Farm Essentials & Machinery",
    tag: "1000KG CRANE",
    tagline: "Heavy-duty mobile lifting crane for single-person recovery and standing of weak cows",
    features: [
      "1,000 kg capacity supporting large dairy cows and buffaloes safely.",
      "Self-locking manual worm-gear winch operated easily by a single person."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Digitalartificialinseminationgunwithcameraforcattleandhorse_f42b64af-90f5-4738-9892-22a51b2c7464.jpg?v=1775724636"
  },
  {
    name: "Cream Separator Machine – 165 LPH (1 HP)",
    sku: "CHM-CREAM-165",
    barcode: "890910165001",
    mrp: 40000,
    purchase_price: 35000,
    sale_price: 40000,
    gst_rate: 18,
    hsn_code: "84211100",
    unit: "Unit",
    default_stock: 2,
    reorder_level: 1,
    category: "Dairy Farm Essentials & Machinery",
    tag: "165 LPH SEPARATOR",
    tagline: "Heavy-duty 1 HP electric standing model cream separator machine with 10L tank",
    features: [
      "Processes up to 165 litres of whole milk per hour.",
      "All stainless-steel 20-22 disc bowl mechanism for hygienic cream separation."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Cream-Separator_png.webp?v=1784385070"
  },
  {
    name: "Milking Machine Dairy Flow 200 (Fixed Pipe Setup)",
    sku: "VDG1-902-C01-1UNT",
    barcode: "890902003001",
    mrp: 38000,
    purchase_price: 27500,
    sale_price: 38000,
    gst_rate: 18,
    hsn_code: "84341000",
    unit: "Unit",
    default_stock: 2,
    reorder_level: 1,
    category: "Dairy Farm Essentials & Machinery",
    tag: "20-COW SYSTEM",
    tagline: "Fixed-type automatic milking machine system designed for up to 20 dairy cows",
    features: [
      "Energy-efficient 0.5 HP motor with high vacuum stability.",
      "Stainless steel 25L bucket with natural pulsation comfort."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/MilkingMachineDairyFlow20009.webp?v=1775652562"
  },
  {
    name: "Chaff Cutter FARM PRO 200 (1.5 HP)",
    sku: "VDG1-903-B01-1UNT",
    barcode: "890903002001",
    mrp: 30000,
    purchase_price: 25000,
    sale_price: 30000,
    gst_rate: 18,
    hsn_code: "84361000",
    unit: "Unit",
    default_stock: 2,
    reorder_level: 1,
    category: "Dairy Farm Essentials & Machinery",
    tag: "500KG/HR CUTTER",
    tagline: "1.5 HP micro chaff cutter processing up to 500 kg/hour of green and dry fodder",
    features: [
      "Adjustable 19mm to 25mm cutting size for optimal digestion.",
      "Rapid 1440 RPM 3-blade system with 1-year warranty."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Chaff_Cutter_FARM_PRO_200.avif?v=1779108870"
  },
  {
    name: "Anti kick bar (Heavy Duty Hot-Dip Galvanized)",
    sku: "VDG1-919-A01-1UNT",
    barcode: "890919001001",
    mrp: 5000,
    purchase_price: 1850,
    sale_price: 5000,
    gst_rate: 5,
    hsn_code: "73269099",
    unit: "Pcs",
    default_stock: 15,
    reorder_level: 3,
    category: "Dairy Farm Essentials & Machinery",
    tag: "MILKING SAFETY",
    tagline: "Adjustable heavy-duty galvanized iron anti-kick bar restraining cows gently during milking",
    features: [
      "Hot-dip galvanized anti-corrosion iron construction.",
      "Quick adjustment pin fits cows and buffaloes of all sizes comfortably."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Anti_Kick_Bar_for_Dairy_Cattle_Safety_Chimertech.jpg?v=1779101479"
  },
  {
    name: "Drinking bowl (Automatic Water Dispenser)",
    sku: "VDG1-930-A01-1UNT",
    barcode: "890930001001",
    mrp: 2000,
    purchase_price: 1800,
    sale_price: 2000,
    gst_rate: 5,
    hsn_code: "39269099",
    unit: "Pcs",
    default_stock: 25,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "AUTO HYDRATION",
    tagline: "Unbreakable plastic automatic cow drinking bowl dispenser",
    features: [
      "Automatic valve refilling fresh water on animal touch.",
      "Smooth non-toxic surface prevents bacteria buildup."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Automatic_Cow_Water_Bowl_Dispenser_Plastic_Chimertech.png?v=1779102568"
  },
  {
    name: "Calf Milk Feeding Bucket 5 Nipples 8L",
    sku: "VDG1-916-A01-008L",
    barcode: "890916001001",
    mrp: 3500,
    purchase_price: 3050,
    sale_price: 3500,
    gst_rate: 5,
    hsn_code: "39269099",
    unit: "8L Bucket",
    default_stock: 15,
    reorder_level: 3,
    category: "Dairy Farm Essentials & Machinery",
    tag: "5-NIPPLE FEEDER",
    tagline: "8L capacity feeding bucket with 5 soft rubber nipples for simultaneous feeding",
    features: [
      "Feeds up to 5 calves simultaneously with steady milk flow.",
      "Graduated volume markings with removable easy-clean nipples."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Calf_Milk_Feeding_Bucket_5_Nipples_8L_Capacity_Chimertec.png?v=1779102128"
  },
  {
    name: "Horn Sleeve – Medium",
    sku: "CHM-HORN-MED",
    barcode: "890920002001",
    mrp: 900,
    purchase_price: 500,
    sale_price: 900,
    gst_rate: 18,
    hsn_code: "39269099",
    unit: "Pcs",
    default_stock: 25,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "HORN SHIELD",
    tagline: "Protective horn tip sleeve for adult cattle to minimize handling and transport injuries",
    features: [
      "Flexible durable protective material fitting medium-sized horns.",
      "Prevents accidental goring injuries to farm workers and other cattle."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/hornsleee.jpg?v=1784385573"
  },
  {
    name: "Hoof knife for cow, horse and goat",
    sku: "VDG1-929-A01-1UNT",
    barcode: "890929001001",
    mrp: 599,
    purchase_price: 490,
    sale_price: 599,
    gst_rate: 12,
    hsn_code: "82119200",
    unit: "Pcs",
    default_stock: 30,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "HOOF TRIMMING",
    tagline: "Professional curved stainless steel hoof knife with ergonomic wooden handle",
    features: [
      "Razor-sharp precision blade for clean trimming of hoof wall and sole.",
      "Prevents foot rot, overgrowth, and lameness."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Hoofknifeforcow_horseandgoat09867.webp?v=1775725040"
  },
  {
    name: "Pulsator 60-40 for Milking Machine",
    sku: "VDG1-924-A01-1UNT",
    barcode: "890924001001",
    mrp: 2500,
    purchase_price: 1550,
    sale_price: 2500,
    gst_rate: 18,
    hsn_code: "84349000",
    unit: "Pcs",
    default_stock: 20,
    reorder_level: 5,
    category: "Dairy Farm Essentials & Machinery",
    tag: "60:40 PULSATOR",
    tagline: "Pneumatic 60:40 pulsation ratio pulsator with stainless steel top cover",
    features: [
      "Delivers soothing natural massage rhythm protecting udder tissues.",
      "Universal fit for all standard milking machine claws."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Pulsator_60-4_1_1.png?v=1777019122"
  },
  {
    name: "Mastitis indicator for milking machines",
    sku: "VDD1-414-A01-1UNT",
    barcode: "890101414001",
    mrp: 1400,
    purchase_price: 700,
    sale_price: 1400,
    gst_rate: 5,
    hsn_code: "90189099",
    unit: "Pcs",
    default_stock: 20,
    reorder_level: 5,
    category: "Mastitis Management & IoT",
    tag: "INLINE ALERT",
    tagline: "Transparent inline milk tube indicator alerting immediate mastitis clots",
    features: [
      "Compact device fitted directly into milk tube of milking machine.",
      "Small mesh pores capture abnormal clots providing instant visual alert during milking."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Mastitis_indicator_for_milking_machines..jpg?v=1779167897"
  },

  // ==========================================
  // 2. DIAGNOSTIC RAPID TEST KITS
  // ==========================================
  {
    name: "Bovine Tuberculosis Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-403-A01-20TK",
    barcode: "890810403020",
    mrp: 9999,
    purchase_price: 5999,
    sale_price: 9999,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "TB SCREENING",
    tagline: "Rapid screening of Tuberculosis antibodies in cattle herds",
    features: [
      "Rapid screening of TB in cattle herds to avoid disease spread.",
      "Simple procedure with easy result interpretation in 15-20 minutes."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Tuberculosis_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876377"
  },
  {
    name: "Bovine Brucella Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-404-A01-20TK",
    barcode: "890810404020",
    mrp: 9600,
    purchase_price: 5760,
    sale_price: 9600,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "BRUCELLA 20-PK",
    tagline: "Detects brucellosis, key cause of abortion and infertility in dairy herds",
    features: [
      "Quick on-farm testing for early disease identification.",
      "Helps avoid contamination of milk and meat products."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Brucella_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876376"
  },
  {
    name: "Bovine Foot and Mouth Disease (FMD) Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-406-A01-20TK",
    barcode: "890810406020",
    mrp: 7999,
    purchase_price: 4799,
    sale_price: 7999,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "FMD OUTBREAK",
    tagline: "Detects FMD structural antibodies for early surveillance and outbreak prevention",
    features: [
      "Detects FMD antibodies, ensuring early outbreak warning.",
      "Helps reduce catastrophic economic losses from FMD."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Foot_and_Mouth_Disease_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876376"
  },
  {
    name: "Bovine Foot and Mouth Disease DIVA Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-407-A01-20TK",
    barcode: "890810407020",
    mrp: 8999,
    purchase_price: 5399,
    sale_price: 8999,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "DIVA STRATEGY",
    tagline: "Differentiates Infected from Vaccinated Animals (DIVA) diagnostic kit",
    features: [
      "Differentiates infected from vaccinated animals (DIVA principle).",
      "Supports smart vaccination programs and national eradication strategies."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Foot_and_Mouth_Disease_DIVA_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876377"
  },
  {
    name: "Bovine Hemorrhagic Septicemia Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-408-A01-20TK",
    barcode: "890810408020",
    mrp: 10400,
    purchase_price: 6240,
    sale_price: 10400,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "HS TEST KIT",
    tagline: "Early detection of Pasteurella multocida infection to reduce sudden death risk",
    features: [
      "Early detection of Pasteurella multocida infection during seasonal outbreaks.",
      "Reduces sudden death risk in dairy cows and water buffaloes."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Hemorrhagic_Septicemia_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876377"
  },
  {
    name: "Bovine Theileria Ta/To Antibody Rapid Test Kit 20 Test",
    sku: "VDD1-413-A01-01TK",
    barcode: "890810413020",
    mrp: 9599,
    purchase_price: 5759,
    sale_price: 9599,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 10,
    reorder_level: 2,
    category: "Diagnostic Rapid Test Kits",
    tag: "THEILERIA TEST",
    tagline: "Rapid detection of Theileria annulata and T. orientalis infection",
    features: [
      "Prevents severe blood parasitic diseases, tick fever, and anemia.",
      "Quick, field-deployable diagnosis for effective veterinary control."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Bovine_Theileria_TaTo_Antibody_Rapid_Test_Kit_20_Test.png?v=1779876377"
  },
  {
    name: "PregKine Bovine Pregnancy Rapid Test - 20 Tests",
    sku: "VBD1-801-A01-20TK",
    barcode: "890801001020",
    mrp: 10380,
    purchase_price: 6228,
    sale_price: 10380,
    gst_rate: 5,
    hsn_code: "38221990",
    unit: "20 Tests",
    default_stock: 20,
    reorder_level: 5,
    category: "Diagnostic Rapid Test Kits",
    tag: "28-DAY PREGNANCY",
    tagline: "Early bovine pregnancy detection kit from day 28 post AI via blood sample",
    features: [
      "Detects pregnancy-associated biomarkers (PAGs) in just 20 minutes.",
      "Minimally invasive, safe for embryo, reduces open days."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/PregKine_Bovine_Pregnancy_Rapid_Test_-_20_Test_Pack_of_20_Tests.png?v=1779881177"
  },
  {
    name: "nSure Lacto Pack of 10 (Milk Adulteration Detection Kit)",
    sku: "VDG1-701-A01-1UNT",
    barcode: "890701010001",
    mrp: 2000,
    purchase_price: 1590,
    sale_price: 2000,
    gst_rate: 5,
    hsn_code: "90318000",
    unit: "10 Tests",
    default_stock: 20,
    reorder_level: 5,
    category: "Diagnostic Rapid Test Kits",
    tag: "MILK PURITY",
    tagline: "Rapidly detects 12 milk adulterants on-farm in under 1 minute",
    features: [
      "Fast, reliable milk purity strip test without laboratory chemicals.",
      "Ensures milk safety, protects consumer trust, and prevents rejection."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/nSureLactoPackof10.avif?v=1775642815"
  },
  {
    name: "3 in 1 TDS, PH, Temperature Meter",
    sku: "VDG1-906-A01-1UNT",
    barcode: "890906001001",
    mrp: 8000,
    purchase_price: 6999,
    sale_price: 8000,
    gst_rate: 5,
    hsn_code: "90318000",
    unit: "Pcs",
    default_stock: 5,
    reorder_level: 1,
    category: "Diagnostic Rapid Test Kits",
    tag: "WATER TESTER",
    tagline: "Digital handheld 3-in-1 tester for water TDS, pH, and Temperature",
    features: [
      "Measures pH (0-14), TDS (0-19999 ppm), and Temp (0-60°C).",
      "Green backlit LCD with automatic temperature compensation."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/3_in_1_TDS_pH_Temperature_Meter_Chimertech.png?v=1779105585"
  },

  // ==========================================
  // 3. BREEDING & INSTRUMENTS
  // ==========================================
  {
    name: "Digital artificial insemination gun with camera for cattle and horse",
    sku: "VBG1-806-A01-1UNT",
    barcode: "890806001001",
    mrp: 38000,
    purchase_price: 33000,
    sale_price: 38000,
    gst_rate: 18,
    hsn_code: "90189099",
    unit: "Pcs",
    default_stock: 2,
    reorder_level: 1,
    category: "Breeding & Instruments",
    tag: "VISUAL AI GUN",
    tagline: "HD camera guided digital visual artificial insemination gun with screen",
    features: [
      "Built-in camera and screen allow visual navigation straight to the cervix.",
      "Significantly increases first-service conception rate and eliminates trauma."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Digitalartificialinseminationgunwithcameraforcattleandhorse_f42b64af-90f5-4738-9892-22a51b2c7464.jpg?v=1775724636"
  },
  {
    name: "Estrus Gun Cattle (Heat Timing Detector)",
    sku: "VBG1-802-A01-1UNT",
    barcode: "890802001001",
    mrp: 9500,
    purchase_price: 8150,
    sale_price: 9500,
    gst_rate: 18,
    hsn_code: "90181290",
    unit: "Pcs",
    default_stock: 3,
    reorder_level: 1,
    category: "Breeding & Instruments",
    tag: "ESTRUS DETECTOR",
    tagline: "Electronic vaginal mucus resistance detector for pinpoint AI timing",
    features: [
      "Detects silent heat and determines optimal hour for breeding.",
      "Reduces repeat breeding issues and costly missed cycles."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/EstrusGunCattle.webp?v=1775649104"
  },
  {
    name: "RFID Reader (Bluetooth Wireless Scanner)",
    sku: "VHG1-901-A01-1UNT",
    barcode: "890901001001",
    mrp: 8000,
    purchase_price: 7000,
    sale_price: 8000,
    gst_rate: 18,
    hsn_code: "84719000",
    unit: "Pcs",
    default_stock: 5,
    reorder_level: 2,
    category: "Breeding & Instruments",
    tag: "RFID SCANNER",
    tagline: "Handheld Bluetooth OLED RFID scanner for ISO 11784/11785 livestock ear tags",
    features: [
      "Instant scan and sync over Bluetooth to mobile apps and PC.",
      "Reads all FDX-B and HDX standard cattle ear tags."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/RFIDReader.avif?v=1775650299"
  },

  // ==========================================
  // 4. NUTRITION & CALF REARING
  // ==========================================
  {
    name: "Probos+ Chimertech (Bevet Yeast Feed Supplement 1Kg)",
    sku: "VNM1-402-A01-500G",
    barcode: "890402500001",
    mrp: 450,
    purchase_price: 280,
    sale_price: 450,
    gst_rate: 0,
    hsn_code: "23099090",
    unit: "1 Kg",
    default_stock: 100,
    reorder_level: 10,
    category: "Nutrition & Supplements",
    tag: "YEAST CULTURE",
    tagline: "Live yeast culture & digestive enzyme feed supplement for rumen microflora",
    features: [
      "Improves fibre digestion, feed efficiency, and daily dry matter intake.",
      "Prevents subacute ruminal acidosis (SARA) and enhances milk fat."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Probos_1.png?v=1779945063"
  },
  {
    name: "Mineral Max Cattle Feed Supplement 1Kg",
    sku: "VNM1-401-A01-001K",
    barcode: "890401001001",
    mrp: 350,
    purchase_price: 200,
    sale_price: 350,
    gst_rate: 0,
    hsn_code: "23099090",
    unit: "1 Kg",
    default_stock: 100,
    reorder_level: 10,
    category: "Nutrition & Supplements",
    tag: "MINERAL MIX",
    tagline: "Premium chelated mineral mixture enriched with vitamins for dairy cattle",
    features: [
      "Supports peak milk yield, body condition, reproductive cyclicity, and strong immunity."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/MineralMax.png?v=1779944665"
  },
  {
    name: "NutraKine Calcdex 1L",
    sku: "VDS1-505-A01-005L",
    barcode: "890403001001",
    mrp: 699,
    purchase_price: 599,
    sale_price: 699,
    gst_rate: 0,
    hsn_code: "23099090",
    unit: "1 Litre",
    default_stock: 50,
    reorder_level: 5,
    category: "Nutrition & Supplements",
    tag: "LIQUID CALCIUM",
    tagline: "High-bioavailability calcium supplement enriched with vitamins D3 & B12",
    features: [
      "Prevents milk fever (hypocalcemia) in fresh cows and supports milk let-down."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/NutraKine_Calcdex_1L.png?v=1779105504"
  },
  {
    name: "ServaTac - Milk replacer for calf 25kg",
    sku: "VDS1-511-A01-025K",
    barcode: "890511025001",
    mrp: 10750,
    purchase_price: 6900,
    sale_price: 10750,
    gst_rate: 0,
    hsn_code: "23099090",
    unit: "25kg Bag",
    default_stock: 10,
    reorder_level: 2,
    category: "Nutrition & Supplements",
    tag: "CALF MILK 25KG",
    tagline: "Premium complete French-formulated calf milk replacer for uniform early growth",
    features: [
      "Balanced protein and fat with high digestive safety.",
      "Speeds up rumen development and successful early weaning."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/ServaTac-Milk_replacer_for_calf_10kg.png?v=1779107448"
  },
  {
    name: "Kidimilk - Milk replacer for kid goat and lambs 10Kg",
    sku: "VDS1-512-A01-010K",
    barcode: "890512010001",
    mrp: 6500,
    purchase_price: 3450,
    sale_price: 6500,
    gst_rate: 18,
    hsn_code: "23099090",
    unit: "10kg Bag",
    default_stock: 15,
    reorder_level: 3,
    category: "Nutrition & Supplements",
    tag: "KID REPLACER",
    tagline: "10kg milk replacer bag for orphaned or multi-birth kid goats & lambs",
    features: [
      "Ensures optimal growth rate and high weaning conformity."
    ],
    image_url: "https://cdn.shopify.com/s/files/1/0818/8117/0132/files/Kidimilk_Milk_Replacer_for_Goat_Kids_Lambs_10kg_Chimertech.png?v=1779106858"
  }
];

export function generateMasterCsvContent(): string {
  const headers = "Name,SKU (Leave blank to auto-generate),Barcode (Leave blank to auto-generate),MRP,Purchase Price,Selling Price,GST Rate,HSN Code,Unit,Stock,Reorder Level,Image URL\n";
  const rows = MASTER_PRODUCTS.map(p => {
    return `"${p.name.replace(/"/g, '""')}","${p.sku}","${p.barcode || ""}","${p.mrp}","${p.purchase_price}","${p.sale_price}","${p.gst_rate}","${p.hsn_code || ""}","${p.unit}","${p.default_stock || 0}","${p.reorder_level}","${p.image_url || ""}"`;
  }).join("\n");
  return headers + rows;
}
