/**
 * Universe Hub - Core Initial Dataset
 * Stores products with multiple images, video trailers, category taxonomy, store reviews, and order tracking
 */

// Universal Toast System (defined early so all scripts have instant access)
function showToast(message) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span style="color:var(--neon-cyan); font-size:16px;">⚡</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
if (typeof window !== 'undefined') window.showToast = showToast;
if (typeof globalThis !== 'undefined') globalThis.showToast = showToast;

// Master Category Taxonomy (Used for Navbar, Filters & Admin Categorization)
const INITIAL_CATEGORIES = [
  // --- iPhones Group ---
  {
    id: "brand-new-iphones",
    name: "Brand New iPhones",
    group: "iphones",
    groupName: "iPhones",
    icon: "🍏",
    inNav: true,
    inFilter: true,
    order: 1
  },
  {
    id: "used-iphones",
    name: "Certified Used iPhones",
    group: "iphones",
    groupName: "iPhones",
    icon: "🔄",
    inNav: true,
    inFilter: true,
    order: 2
  },

  // --- Accessories Group ---
  {
    id: "back-covers",
    name: "Back Covers & Cases",
    group: "accessories",
    groupName: "Accessories",
    icon: "🛡️",
    inNav: true,
    inFilter: true,
    order: 3
  },
  {
    id: "chargers",
    name: "Fast Chargers & GaN",
    group: "accessories",
    groupName: "Accessories",
    icon: "⚡",
    inNav: true,
    inFilter: true,
    order: 4
  },
  {
    id: "cables",
    name: "Charging Cables",
    group: "accessories",
    groupName: "Accessories",
    icon: "🔌",
    inNav: true,
    inFilter: true,
    order: 5
  },
  {
    id: "tempered-glass",
    name: "Tempered Glass & Protectors",
    group: "accessories",
    groupName: "Accessories",
    icon: "📱",
    inNav: true,
    inFilter: true,
    order: 6
  },
  {
    id: "camera-protectors",
    name: "Camera Lens Protectors",
    group: "accessories",
    groupName: "Accessories",
    icon: "📸",
    inNav: true,
    inFilter: true,
    order: 7
  },
  {
    id: "audio",
    name: "Audio & AirPods",
    group: "accessories",
    groupName: "Accessories",
    icon: "🎧",
    inNav: true,
    inFilter: true,
    order: 8
  }
];

// Master Brands Taxonomy (Official Accessory & Device Brands)
const INITIAL_BRANDS = [
  {
    id: "apple",
    name: "Apple",
    icon: "🍏",
    tagline: "Official Flagship Devices & Original Tech",
    inNav: true,
    inFilter: true,
    order: 1
  },
  {
    id: "anker",
    name: "Anker",
    icon: "⚡",
    tagline: "GaN Fast Chargers & Heavy-Duty Power",
    inNav: true,
    inFilter: true,
    order: 2
  },
  {
    id: "baseus",
    name: "Baseus",
    icon: "🔋",
    tagline: "Digital Wattage Displays & Slim Power Banks",
    inNav: true,
    inFilter: true,
    order: 3
  },
  {
    id: "ugreen",
    name: "Ugreen",
    icon: "🟢",
    tagline: "Nexode GaN & Pro Armor Charging Cables",
    inNav: true,
    inFilter: true,
    order: 4
  },
  {
    id: "wiwu",
    name: "WiWU",
    icon: "💼",
    tagline: "Premium Leather Cases, Stands & Wallets",
    inNav: true,
    inFilter: true,
    order: 5
  },
  {
    id: "asper",
    name: "Asper",
    icon: "🛡️",
    tagline: "AeroShock Titanium Armor & Matte Cases",
    inNav: true,
    inFilter: true,
    order: 6
  },
  {
    id: "spigen",
    name: "Spigen",
    icon: "🛡️",
    tagline: "Military-Grade Air Cushion Protection",
    inNav: true,
    inFilter: true,
    order: 7
  },
  {
    id: "esr",
    name: "ESR",
    icon: "💎",
    tagline: "Armorite Camera & Sapphire Screen Shields",
    inNav: true,
    inFilter: true,
    order: 8
  }
];

const INITIAL_PRODUCTS = [
  {
    id: "prod-1794121290955",
    name: "iphone 13 pro max",
    title: "iphone 13 pro max",
    slug: "prod-1794121290955",
    category: "used-iphones",
    mainCategory: "iphones",
    subCategory: "used",
    brand: "Apple",
    price: 145000,
    originalPrice: 150000,
    badge: "85% Battery",
    isFeatured: true,
    stock: 5,
    rating: 5,
    reviewsCount: 1,
    image: "assets/hero_showcase.jpg",
    images: ["assets/hero_showcase.jpg"],
    description: "full set with box",
    specs: {
      video: "",
      warranty: "1month",
      condition: "Grade B (90% Good)",
      colorOptions: ["Midnight / Black", "Starlight / Silver", "Blue / Sierra Blue"],
      batteryHealth: "85%",
      storageOptions: [
        { price: 145000, capacity: "128GB", originalPrice: 150000 },
        { price: 155000, capacity: "256GB", originalPrice: 160000 },
        { price: 165000, capacity: "512GB", originalPrice: 169969 }
      ]
    }
  }
];

// Physical Store Customer Reviews
const INITIAL_REVIEWS = [
  {
    id: "rev-101",
    author: "Kasun Ranasinghe",
    rating: 5,
    date: "Yesterday",
    visitType: "Physical Store Visit (Colombo 03)",
    service: "Bought Used iPhone 14 Pro Max & MagSafe Case",
    verified: true,
    avatar: "KR",
    comment: "I visited the Universe Hub store directly. Truly impressed by the transparency! They plugged the iPhone 14 Pro Max to 3uTools on their monitor and showed me 96% original battery health and zero parts replaced. Gave me a 6-month written warranty receipt too. Super clean shop!",
    storeReply: "Thank you Kasun! We take immense pride in 100% genuine tested devices. Enjoy your new iPhone!"
  },
  {
    id: "rev-102",
    author: "Shenali Perera",
    rating: 5,
    date: "3 days ago",
    visitType: "Physical Store Repair Visit",
    service: "iPhone 13 OLED Screen Replacement (30 Mins)",
    verified: true,
    avatar: "SP",
    comment: "Shattered my iPhone 13 display and needed it urgent for work. The technicians replaced the display in just 35 minutes while I waited in their AC lounge. True Tone was transferred perfectly. Highly recommended for physical store repairs!",
    storeReply: "Glad we could assist urgently, Shenali! We always keep genuine OEM panels in physical stock."
  },
  {
    id: "rev-103",
    author: "Mohamed Rilwan",
    rating: 5,
    date: "1 week ago",
    visitType: "Physical Store Visit (Accessories)",
    service: "Anker 65W GaN Charger & Spigen Armor Case",
    verified: true,
    avatar: "MR",
    comment: "Best shop in town for genuine accessories. Most shops sell fake Anker and Spigen copies, but Universe Hub is an authorized seller. QR code verified genuine. Staff is friendly and professional.",
    storeReply: "Appreciate your trust Mohamed! 100% genuine tech is our core philosophy."
  },
  {
    id: "rev-104",
    author: "Dinesh Wickramasinghe",
    rating: 5,
    date: "2 weeks ago",
    visitType: "Physical Store Visit",
    service: "Battery Replacement for iPhone 11",
    verified: true,
    avatar: "DW",
    comment: "Replaced my old iPhone 11 battery here. Battery health now shows 100% without any 'Unknown Part' warning popup. Price was very fair compared to other shops. 5 stars!",
    storeReply: "Thank you Dinesh! We use specialized battery calibration micro-tools to maintain official Apple health metrics."
  }
];

// Mobile Repair Services Catalog & Interactive Estimator Data
const REPAIR_SERVICES = [
  {
    id: "screen",
    name: "Display / OLED Screen Replacement",
    description: "Original Super Retina XDR OLED / Premium OLED with True Tone transfer and water-seal gasket.",
    basePrice: 16500,
    duration: "30 - 45 Minutes",
    warranty: "6 Months Replacement Warranty"
  },
  {
    id: "battery",
    name: "Original Battery Replacement",
    description: "High-capacity certified battery cells. Restores battery health to 100% without error notifications.",
    basePrice: 8500,
    duration: "25 Minutes",
    warranty: "6 Months Warranty"
  },
  {
    id: "charging",
    name: "Charging Port & IC Fix (Type-C / Lightning)",
    description: "Fixes slow charging, loose connector, moisture detection warnings and charging IC faults.",
    basePrice: 5500,
    duration: "40 Minutes",
    warranty: "3 Months Warranty"
  },
  {
    id: "backglass",
    name: "Back Glass Laser Repair",
    description: "Laser machine precise back glass removal without dismantling sensitive motherboard components.",
    basePrice: 7500,
    duration: "1 - 2 Hours",
    warranty: "Lifetime Fitment Warranty"
  },
  {
    id: "water",
    name: "Water Damage & Motherboard Diagnostic",
    description: "Ultrasonic board cleaning, short-circuit diagnostic, chip-level micro-soldering.",
    basePrice: 4500,
    duration: "2 - 4 Hours",
    warranty: "Tested Under Load"
  },
  {
    id: "camera",
    name: "Camera Sensor & Lens Glass Replacement",
    description: "Fixes blurry focus, cracked sapphire lens rings, and camera stabilization vibration.",
    basePrice: 6500,
    duration: "30 Minutes",
    warranty: "6 Months Warranty"
  }
];

// Demo Repair Status Tracking Orders
const DEMO_REPAIR_ORDERS = [
  {
    trackingCode: "UH-8821",
    customerName: "Saman Kumara",
    phone: "077 123 4567",
    device: "Apple iPhone 15 Pro",
    issue: "Shattered OLED Screen Replacement",
    status: "In Progress",
    stepIndex: 3,
    estimatedCompletion: "Today, 5:30 PM",
    desk: "Technician Bay #2",
    cost: 32000,
    notes: "OLED calibrated. Water resistance sealant curing under UV chamber."
  },
  {
    trackingCode: "UH-8902",
    customerName: "Dilani Fernando",
    phone: "071 889 9123",
    device: "Apple iPhone 13",
    issue: "Battery Replacement (Health was 74%)",
    status: "Ready for Pickup",
    stepIndex: 4,
    estimatedCompletion: "Ready Now!",
    desk: "Physical Store Front Counter (Pickup Desk A)",
    cost: 11500,
    notes: "Passed 40-point diagnostics. Battery health 100%. Ready for customer collection."
  },
  {
    trackingCode: "UH-9140",
    customerName: "Nuwan Pradeep",
    phone: "076 443 2190",
    device: "Apple iPhone 14 Plus",
    issue: "Water Damage Ultrasonic Diagnostic",
    status: "Diagnostic",
    stepIndex: 2,
    estimatedCompletion: "Tomorrow, 11:00 AM",
    desk: "Micro-soldering Lab",
    cost: 14000,
    notes: "Corrosion removed from power management IC. Awaiting customer confirmation for capacitor swap."
  }
];

// Initial Storefront Orders
const DEMO_STORE_ORDERS = [
  {
    id: "ORD-7712",
    customerName: "Ruwan Wijetunga",
    email: "ruwan@gmail.com",
    phone: "077 345 6789",
    date: "Today, 02:15 PM",
    items: [
      { name: "Anker Nano II 65W GaN Fast Charger", qty: 1, price: 11990 },
      { name: "Braided 240W Type-C Cable", qty: 1, price: 2990 }
    ],
    total: 14980,
    method: "Island-wide Express Courier (COD)",
    status: "Dispatched"
  },
  {
    id: "ORD-7711",
    customerName: "Thilina Jayasuriya",
    email: "thilina.j@outlook.com",
    phone: "070 998 7654",
    date: "Yesterday, 04:40 PM",
    items: [
      { name: "iPhone 14 Pro Max 256GB (Certified Used)", qty: 1, price: 245000 },
      { name: "Spigen Ultra Hybrid MagSafe Case", qty: 1, price: 6490 }
    ],
    total: 251490,
    method: "Physical Store Pickup (Colombo 03)",
    status: "Ready for Pickup"
  }
];

// Helper to detect brand from product name and attributes
function detectProductBrand(prod) {
  const text = `${prod.name || ''} ${prod.description || ''} ${prod.conditionBadge || ''}`.toLowerCase();
  if (text.includes("anker")) return "Anker";
  if (text.includes("baseus")) return "Baseus";
  if (text.includes("ugreen")) return "Ugreen";
  if (text.includes("wiwu")) return "WiWU";
  if (text.includes("asper")) return "Asper";
  if (text.includes("spigen")) return "Spigen";
  if (text.includes("esr")) return "ESR";
  if (text.includes("iphone") || text.includes("apple") || text.includes("airpod")) return "Apple";
  return "Anker";
}

// Initialize and sync database
function initDatabase() {
  // 1. Categories initialization
  const existingCategories = localStorage.getItem("UH_CATEGORIES");
  if (!existingCategories) {
    localStorage.setItem("UH_CATEGORIES", JSON.stringify(INITIAL_CATEGORIES));
  }

  // 2. Brands initialization (Official Accessory & Device Brands)
  const existingBrands = localStorage.getItem("UH_BRANDS");
  const deletedBrandIds = JSON.parse(localStorage.getItem("UH_DELETED_BRAND_IDS") || "[]");
  if (!existingBrands) {
    const cleanBrands = INITIAL_BRANDS.filter(b => !deletedBrandIds.includes(String(b.id)));
    localStorage.setItem("UH_BRANDS", JSON.stringify(cleanBrands));
  } else {
    try {
      let storedBrands = JSON.parse(existingBrands) || [];
      if (deletedBrandIds.length > 0) {
        const filtered = storedBrands.filter(b => !deletedBrandIds.includes(String(b.id)));
        if (filtered.length !== storedBrands.length) {
          localStorage.setItem("UH_BRANDS", JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  }

  // 3. Products schema upgrade & initial load (permanently purge all demo products)
  const SAMPLE_PRODUCT_IDS = [
    'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
    'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
    'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
    'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
    'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case'
  ];

  const existingProducts = localStorage.getItem("UH_PRODUCTS");
  let deletedProductIds = [];
  try {
    deletedProductIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
  } catch (e) { deletedProductIds = []; }
  
  // Guarantee that all deleted sample products are tracked and purged on all devices
  deletedProductIds = [...new Set([...deletedProductIds, ...SAMPLE_PRODUCT_IDS])];
  try {
    localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(deletedProductIds));
  } catch (e) {}

  if (!existingProducts) {
    const enriched = INITIAL_PRODUCTS
      .filter(p => !deletedProductIds.includes(String(p.id)))
      .map(p => {
        if (!p.brand) p.brand = detectProductBrand(p);
        return p;
      });
    localStorage.setItem("UH_PRODUCTS", JSON.stringify(enriched));
  } else {
    try {
      let prods = JSON.parse(existingProducts) || [];
      // Strictly purge any deleted or sample product IDs from local cache
      const filtered = prods.filter(p => !deletedProductIds.includes(String(p.id)));
      if (filtered.length !== prods.length) {
        prods = filtered;
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(prods));
      }
    } catch (e) {}
  }

  if (!localStorage.getItem("UH_REVIEWS")) {
    localStorage.setItem("UH_REVIEWS", JSON.stringify(INITIAL_REVIEWS));
  }
  if (!localStorage.getItem("UH_REPAIRS")) {
    localStorage.setItem("UH_REPAIRS", JSON.stringify(DEMO_REPAIR_ORDERS));
  }
  if (!localStorage.getItem("UH_ORDERS")) {
    localStorage.setItem("UH_ORDERS", JSON.stringify([]));
  }
  if (!localStorage.getItem("UH_CART")) {
    localStorage.setItem("UH_CART", JSON.stringify([]));
  }
  if (!localStorage.getItem("UH_WISHLIST")) {
    localStorage.setItem("UH_WISHLIST", JSON.stringify([]));
  }

  // 4. Admin Security Configuration & Registered Users
  try {
    const existingAdmin = localStorage.getItem("UH_ADMIN_CONFIG");
    if (!existingAdmin) {
      localStorage.setItem("UH_ADMIN_CONFIG", JSON.stringify(DEFAULT_ADMIN_CONFIG));
    } else {
      const parsed = JSON.parse(existingAdmin) || {};
      // Sync official admin credentials for Shashika and remove legacy demo passwords
      parsed.email = "shashikaisuranga143@gmail.com";
      parsed.password = "Kumudinikumari@0709";
      delete parsed.secondaryPassword;
      parsed.name = "Store Administrator (Shashika)";
      localStorage.setItem("UH_ADMIN_CONFIG", JSON.stringify(parsed));
    }
  } catch (e) {}

  try {
    let users = JSON.parse(localStorage.getItem("UH_USERS")) || [];
    // Strictly purge old generic admin accounts to prevent unauthorized access
    users = users.filter(u => u.email !== "admin@universehub.store" && u.email !== "admin@universehub.lk" && u.email !== "admin");
    const shashika = users.find(u => u.email && u.email.toLowerCase() === "shashikaisuranga143@gmail.com");
    if (!shashika) {
      users.unshift({
        id: "usr-admin-shashika",
        name: "Store Administrator (Shashika)",
        email: "shashikaisuranga143@gmail.com",
        password: "Kumudinikumari@0709",
        phone: "074-0219239",
        role: "admin"
      });
      localStorage.setItem("UH_USERS", JSON.stringify(users));
    } else {
      shashika.password = "Kumudinikumari@0709";
      shashika.role = "admin";
      localStorage.setItem("UH_USERS", JSON.stringify(users));
    }
  } catch (e) {}

  // 4. Store Details, Branding, Hero Banner & About Us Settings
  const existingStoreSettings = localStorage.getItem("UH_STORE_SETTINGS");
  if (!existingStoreSettings) {
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(DEFAULT_STORE_SETTINGS));
  } else {
    try {
      const parsed = JSON.parse(existingStoreSettings) || {};
      let updated = false;
      // Ensure phone and address default to user's updated Maharagama location & contact
      if (!parsed.phone || parsed.phone.includes("077 123 4567") || parsed.phone === "") {
        parsed.phone = DEFAULT_STORE_SETTINGS.phone;
        parsed.whatsapp = DEFAULT_STORE_SETTINGS.whatsapp;
        parsed.whatsappLink = DEFAULT_STORE_SETTINGS.whatsappLink;
        updated = true;
      }
      if (!parsed.email || parsed.email.includes("contact@universehub")) {
        parsed.email = DEFAULT_STORE_SETTINGS.email;
        updated = true;
      }
      if (!parsed.orderDeletePin) {
        parsed.orderDeletePin = DEFAULT_STORE_SETTINGS.orderDeletePin;
        updated = true;
      }
      if (!parsed.address || parsed.address.includes("Galle Road") || parsed.address.includes("Colombo")) {
        parsed.address = DEFAULT_STORE_SETTINGS.address;
        parsed.locationShort = DEFAULT_STORE_SETTINGS.locationShort;
        updated = true;
      }
      if (!parsed.heroBannerImg) {
        parsed.heroBannerImg = DEFAULT_STORE_SETTINGS.heroBannerImg;
        updated = true;
      }
      if (!parsed.logoImg || !parsed.logoImg.includes("universe_hub_logo.png?v=10")) {
        parsed.logoImg = DEFAULT_STORE_SETTINGS.logoImg;
        updated = true;
      }
      if (!parsed.googleMapsUrl || parsed.googleMapsUrl.includes("maps.google.com/?q=")) {
        parsed.googleMapsUrl = DEFAULT_STORE_SETTINGS.googleMapsUrl;
        updated = true;
      }
      if (!parsed.aboutHeading) {
        parsed.aboutHeading = DEFAULT_STORE_SETTINGS.aboutHeading;
        parsed.aboutStory = DEFAULT_STORE_SETTINGS.aboutStory;
        parsed.aboutMission = DEFAULT_STORE_SETTINGS.aboutMission;
        updated = true;
      }
      if (!parsed.promoBanner1Img) {
        parsed.promoBanner1Img = DEFAULT_STORE_SETTINGS.promoBanner1Img;
        parsed.promoBanner1Title = DEFAULT_STORE_SETTINGS.promoBanner1Title;
        parsed.promoBanner1Desc = DEFAULT_STORE_SETTINGS.promoBanner1Desc;
        parsed.promoBanner1BtnText = DEFAULT_STORE_SETTINGS.promoBanner1BtnText;
        parsed.promoBanner1Category = DEFAULT_STORE_SETTINGS.promoBanner1Category;
        updated = true;
      }
      if (!parsed.promoBanner2Img) {
        parsed.promoBanner2Img = DEFAULT_STORE_SETTINGS.promoBanner2Img;
        parsed.promoBanner2Title = DEFAULT_STORE_SETTINGS.promoBanner2Title;
        parsed.promoBanner2Desc = DEFAULT_STORE_SETTINGS.promoBanner2Desc;
        parsed.promoBanner2BtnText = DEFAULT_STORE_SETTINGS.promoBanner2BtnText;
        parsed.promoBanner2Category = DEFAULT_STORE_SETTINGS.promoBanner2Category;
        updated = true;
      }
      if (updated) {
        localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(parsed));
      }
    } catch (e) {
      localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(DEFAULT_STORE_SETTINGS));
    }
  }
}

// Default Store Profile, Contact Info, Hero Banner, Promo Banners & About Content
const DEFAULT_STORE_SETTINGS = {
  storeName: "Universe Hub",
  tagline: "Your One Stop Shop for Everything",
  phone: "074-0219239",
  whatsapp: "074-0219239",
  whatsappLink: "https://wa.me/94740219239?text=Hello%20Universe%20Hub,%20I%20have%20an%20inquiry%20regarding%20iPhone%20/%20accessories",
  email: "universehubstore00@gmail.com",
  orderDeletePin: "1234",
  address: "188/8c, High Level Road, Maharagama",
  locationShort: "Maharagama Flagship Store",
  openingHours: "Open Daily: 9:30 AM – 8:30 PM",
  googleMapsUrl: "https://maps.app.goo.gl/r1BY5dMznxRunVC58",
  heroBannerImg: "assets/hero_showcase.jpg?v=3",
  logoImg: "assets/universe_hub_logo.png?v=10",
  // Promo Banner 1 (Cases & Protection)
  promoBanner1Img: "assets/cases_banner.jpg",
  promoBanner1Title: "Keep Your Phone Safe & Stylish",
  promoBanner1Desc: "Premium aerospace carbon fiber, MagSafe clear cases and camera lens protection for every model.",
  promoBanner1BtnText: "Explore Cases",
  promoBanner1Category: "cases",
  // Promo Banner 2 (Fast Chargers & GaN Power)
  promoBanner2Img: "assets/chargers_banner.jpg",
  promoBanner2Title: "Power Up Your Life",
  promoBanner2Desc: "65W GaN fast dual chargers, 240W braided cables & digital battery packs for non-stop performance.",
  promoBanner2BtnText: "Shop Chargers",
  promoBanner2Category: "chargers",
  aboutHeading: "Sri Lanka's Premier Destination for Apple & Flagship Tech",
  aboutStory: "Located at 188/8c, High Level Road, Maharagama, Universe Hub is your trusted physical retail store and certified repair lab. We specialize in official sealed Apple devices, thoroughly tested Grade-A+ pre-owned iPhones with transparent 3uTools battery diagnostics, and 100% genuine charging essentials and protective armor from world-class brands like Anker, Ugreen, Baseus, WiWU, Spigen, and Asper.",
  aboutMission: "To deliver 100% authentic Apple flagships and top-tier accessories with complete transparency, verified battery health, honest pricing, and express in-store repairs backed by comprehensive warranties."
};

// Default Admin Security Credentials (Configurable from Admin Portal)
const DEFAULT_ADMIN_CONFIG = {
  email: "shashikaisuranga143@gmail.com",
  password: "Kumudinikumari@0709",
  name: "Store Administrator"
};

// Initial User Accounts
const INITIAL_USERS = [
  {
    id: "usr-admin-shashika",
    name: "Store Administrator (Shashika)",
    email: "shashikaisuranga143@gmail.com",
    password: "Kumudinikumari@0709",
    phone: "074-0219239",
    role: "admin"
  },
  {
    id: "usr-demo-1",
    name: "Kasun Ranasinghe",
    email: "customer@universehub.store",
    password: "password123",
    phone: "077 123 4567",
    role: "customer"
  }
];

initDatabase();

// Expose all master datasets globally to window and globalThis for cross-script access
if (typeof window !== 'undefined') {
  window.INITIAL_CATEGORIES = INITIAL_CATEGORIES;
  window.INITIAL_BRANDS = INITIAL_BRANDS;
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
  window.INITIAL_REVIEWS = INITIAL_REVIEWS;
  window.REPAIR_SERVICES = REPAIR_SERVICES;
  window.DEMO_REPAIR_ORDERS = DEMO_REPAIR_ORDERS;
  window.DEMO_STORE_ORDERS = DEMO_STORE_ORDERS;
  window.DEFAULT_STORE_SETTINGS = DEFAULT_STORE_SETTINGS;
  window.DEFAULT_ADMIN_CONFIG = DEFAULT_ADMIN_CONFIG;
  window.INITIAL_USERS = INITIAL_USERS;
  window.detectProductBrand = detectProductBrand;
  window.initDatabase = initDatabase;
}
if (typeof globalThis !== 'undefined') {
  globalThis.INITIAL_CATEGORIES = INITIAL_CATEGORIES;
  globalThis.INITIAL_BRANDS = INITIAL_BRANDS;
  globalThis.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
  globalThis.INITIAL_REVIEWS = INITIAL_REVIEWS;
  globalThis.REPAIR_SERVICES = REPAIR_SERVICES;
  globalThis.DEMO_REPAIR_ORDERS = DEMO_REPAIR_ORDERS;
  globalThis.DEMO_STORE_ORDERS = DEMO_STORE_ORDERS;
  globalThis.DEFAULT_STORE_SETTINGS = DEFAULT_STORE_SETTINGS;
  globalThis.DEFAULT_ADMIN_CONFIG = DEFAULT_ADMIN_CONFIG;
  globalThis.INITIAL_USERS = INITIAL_USERS;
  globalThis.detectProductBrand = detectProductBrand;
  globalThis.initDatabase = initDatabase;
}
