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
  // --- IPHONES: BRAND NEW ---
  {
    id: "prod-ip18pm",
    name: "Apple iPhone 18 Pro Max 512GB - Crimson & Frost Titanium",
    brand: "Apple",
    mainCategory: "iphones",
    category: "brand-new-iphones",
    subCategory: "brand-new",
    condition: "Brand New",
    conditionBadge: "Brand New 2026",
    batteryHealth: 100,
    price: 520000,
    originalPrice: 560000,
    discount: "7% OFF",
    rating: 5.0,
    reviewsCount: 19,
    stock: 5,
    isFeatured: true,
    warranty: "1 Year Official Apple Care + 1 Year Store Care",
    image: "assets/iphone18_showcase.jpg",
    images: [
      "assets/iphone18_showcase.jpg",
      "assets/hero_showcase.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["Apple A19 Bionic", "512GB", "Visor Quad-Camera", "Next-Gen Titanium"],
    description: "Next-generation Apple iPhone 18 Pro Max featuring the aerospace-grade titanium chassis with all-new horizontal camera visor system, 200MP Fusion sensor, ultra-long battery life, and high-speed GaN compatibility."
  },
  {
    id: "prod-ip16pm",
    name: "Apple iPhone 16 Pro Max 256GB - Desert Titanium",
    mainCategory: "iphones",
    category: "brand-new-iphones",
    subCategory: "brand-new",
    condition: "Brand New",
    conditionBadge: "Brand New",
    batteryHealth: 100,
    price: 435000,
    originalPrice: 465000,
    discount: "6% OFF",
    rating: 5.0,
    reviewsCount: 42,
    stock: 12,
    isFeatured: true,
    warranty: "1 Year Apple Care + 1 Year Hardware",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
      "assets/hero_showcase.jpg",
      "assets/cases_banner.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["Apple A18 Pro", "256GB", "Titanium", "5x Telephoto"],
    description: "Brand new sealed Apple iPhone 16 Pro Max with Camera Control button, 48MP Fusion camera system, and ultra-durable Titanium design. Official TRCSL Approved."
  },
  {
    id: "prod-ip16p",
    name: "Apple iPhone 16 Pro 128GB - Natural Titanium",
    mainCategory: "iphones",
    category: "brand-new-iphones",
    subCategory: "brand-new",
    condition: "Brand New",
    conditionBadge: "Brand New",
    batteryHealth: 100,
    price: 369000,
    originalPrice: 395000,
    discount: "7% OFF",
    rating: 4.9,
    reviewsCount: 38,
    stock: 8,
    isFeatured: true,
    warranty: "1 Year Apple Care Official",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
      "assets/hero_showcase.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["A18 Pro", "128GB", "ProMotion 120Hz", "USB-C 3.0"],
    description: "Sealed box iPhone 16 Pro in sleek Natural Titanium finish with pro-grade video recording and 48MP Ultra Wide sensor."
  },
  {
    id: "prod-ip15p",
    name: "Apple iPhone 15 Pro 128GB - Blue Titanium",
    mainCategory: "iphones",
    category: "brand-new-iphones",
    subCategory: "brand-new",
    condition: "Brand New",
    conditionBadge: "Brand New",
    batteryHealth: 100,
    price: 310000,
    originalPrice: 345000,
    discount: "10% OFF",
    rating: 4.8,
    reviewsCount: 65,
    stock: 5,
    isFeatured: true,
    warranty: "1 Year Store Warranty",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
      "assets/hero_showcase.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["A17 Pro", "Titanium Frame", "Action Button"],
    description: "Flagship performance powered by A17 Pro 3nm chip. Brand new genuine unit with full accessory kit."
  },

  // --- IPHONES: CERTIFIED USED ---
  {
    id: "prod-used-ip14pm",
    name: "Apple iPhone 14 Pro Max 256GB (Certified Pre-Owned)",
    mainCategory: "iphones",
    category: "used-iphones",
    subCategory: "used",
    condition: "Used - Grade A+",
    conditionBadge: "96% Battery",
    batteryHealth: 96,
    price: 245000,
    originalPrice: 280000,
    discount: "Grade A+",
    rating: 4.9,
    reviewsCount: 89,
    stock: 4,
    isFeatured: true,
    warranty: "6 Months Physical Store Warranty + 1 Month Checking",
    image: "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=800&q=80"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["Space Black", "96% Battery", "No Scratches", "FaceID 100%"],
    description: "Meticulously inspected by Universe Hub technicians. 100% original OLED screen, True Tone & Face ID active. Zero scratches."
  },
  {
    id: "prod-used-ip13p",
    name: "Apple iPhone 13 Pro 128GB - Sierra Blue (Used)",
    mainCategory: "iphones",
    category: "used-iphones",
    subCategory: "used",
    condition: "Used - Grade A+",
    conditionBadge: "91% Battery",
    batteryHealth: 91,
    price: 185000,
    originalPrice: 210000,
    discount: "Grade A+",
    rating: 4.8,
    reviewsCount: 74,
    stock: 6,
    isFeatured: true,
    warranty: "6 Months Physical Store Warranty",
    image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["Sierra Blue", "91% Battery", "ProMotion 120Hz", "Dual SIM"],
    description: "Popular Sierra Blue finish. Factory unlocked, flawless cameras and speakers. Free 9H tempered glass pre-installed!"
  },
  {
    id: "prod-used-ip12",
    name: "Apple iPhone 12 128GB - Purple Edition (Used)",
    mainCategory: "iphones",
    category: "used-iphones",
    subCategory: "used",
    condition: "Used - Grade A",
    conditionBadge: "88% Battery",
    batteryHealth: 88,
    price: 119000,
    originalPrice: 135000,
    discount: "Budget Pick",
    rating: 4.7,
    reviewsCount: 92,
    stock: 9,
    isFeatured: false,
    warranty: "3 Months Store Warranty",
    image: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["Purple", "88% Battery", "MagSafe Ready", "Super Retina"],
    description: "Great condition certified pre-owned iPhone 12. Ideal daily driver with 5G connectivity and vibrant OLED display."
  },
  {
    id: "prod-used-ip11",
    name: "Apple iPhone 11 128GB - Black (Clean Used)",
    mainCategory: "iphones",
    category: "used-iphones",
    subCategory: "used",
    condition: "Used - Grade A",
    conditionBadge: "87% Battery",
    batteryHealth: 87,
    price: 89000,
    originalPrice: 105000,
    discount: "Special Deal",
    rating: 4.7,
    reviewsCount: 110,
    stock: 11,
    isFeatured: false,
    warranty: "3 Months Store Warranty",
    image: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["128GB", "Dual Camera", "Night Mode", "Unlocked"],
    description: "Tested and guaranteed fully functional. All original parts, ideal for school, work or backup phone."
  },

  // --- ACCESSORIES: BACK COVERS & CASES ---
  {
    id: "prod-case-magsafe",
    name: "Spigen Ultra Hybrid MagSafe Crystal Clear Case (iPhone 16 / 15 Series)",
    mainCategory: "accessories",
    category: "back-covers",
    subCategory: "cases",
    condition: "Brand New",
    conditionBadge: "Original Spigen",
    batteryHealth: null,
    price: 6490,
    originalPrice: 7990,
    discount: "18% OFF",
    rating: 4.9,
    reviewsCount: 156,
    stock: 45,
    isFeatured: true,
    warranty: "Lifetime Yellowing Guarantee",
    image: "assets/cases_banner.jpg",
    images: [
      "assets/cases_banner.jpg",
      "assets/hero_showcase.jpg",
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["Anti-Yellowing", "MagSafe Ring", "Air Cushion Drop Protection"],
    description: "Military-grade drop certified clear case with integrated strong neodymium magnets for flawless MagSafe accessories."
  },
  {
    id: "prod-case-carbon",
    name: "Aramid Carbon Fiber Sleek Protective Case (iPhone 16 Pro Max / 15 Pro)",
    mainCategory: "accessories",
    category: "back-covers",
    subCategory: "cases",
    condition: "Brand New",
    conditionBadge: "Ultra Slim",
    batteryHealth: null,
    price: 7990,
    originalPrice: 9500,
    discount: "15% OFF",
    rating: 4.8,
    reviewsCount: 84,
    stock: 25,
    isFeatured: false,
    warranty: "6 Months Warranty",
    image: "assets/cases_banner.jpg",
    images: [
      "assets/cases_banner.jpg",
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["Real 1500D Carbon", "0.6mm Slim", "Matte Grip"],
    description: "Aerospace-grade authentic carbon fiber case. Incredibly lightweight with a smooth textured matte grip."
  },

  // --- ACCESSORIES: FAST CHARGERS & GAN ---
  {
    id: "prod-charger-65w",
    name: "Anker Nano II 65W GaN Fast Dual Wall Charger (USB-C + USB-A)",
    mainCategory: "accessories",
    category: "chargers",
    subCategory: "chargers",
    condition: "Brand New",
    conditionBadge: "65W GaN",
    batteryHealth: null,
    price: 11990,
    originalPrice: 14500,
    discount: "17% OFF",
    rating: 5.0,
    reviewsCount: 210,
    stock: 35,
    isFeatured: true,
    warranty: "18 Months Anker Official Warranty",
    image: "assets/chargers_banner.jpg",
    images: [
      "assets/chargers_banner.jpg",
      "assets/hero_showcase.jpg",
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["GaN III Tech", "Fast Charge 50% in 20min", "MacBook & iPhone Compatible"],
    description: "Ultra-compact GaN fast charger. Powers iPhone, iPad and MacBook simultaneously with dynamic temperature control."
  },
  {
    id: "prod-pb-20k",
    name: "Baseus Blade 20,000mAh 65W Slim Fast Power Bank with LED Display",
    mainCategory: "accessories",
    category: "chargers",
    subCategory: "chargers",
    condition: "Brand New",
    conditionBadge: "20,000mAh",
    batteryHealth: null,
    price: 18900,
    originalPrice: 22500,
    discount: "16% OFF",
    rating: 4.9,
    reviewsCount: 78,
    stock: 18,
    isFeatured: true,
    warranty: "1 Year Store Warranty",
    image: "assets/chargers_banner.jpg",
    images: [
      "assets/chargers_banner.jpg",
      "https://images.unsplash.com/photo-1609592424317-2993fb6bc120?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["65W Bi-directional", "Digital Wattage Display", "Airline Approved"],
    description: "Slim profile power bank capable of charging laptops, iPhones and Android flagships on the go."
  },

  // --- ACCESSORIES: CHARGING CABLES ---
  {
    id: "prod-cable-braided",
    name: "Braided 240W Type-C to Type-C Ultra-Durable Fast Cable (2m)",
    mainCategory: "accessories",
    category: "cables",
    subCategory: "cables",
    condition: "Brand New",
    conditionBadge: "240W Power",
    batteryHealth: null,
    price: 2990,
    originalPrice: 3800,
    discount: "21% OFF",
    rating: 4.8,
    reviewsCount: 95,
    stock: 60,
    isFeatured: true,
    warranty: "1 Year Replacement Warranty",
    image: "assets/chargers_banner.jpg",
    images: [
      "assets/chargers_banner.jpg",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["240W PD 3.1", "Nylon Armor", "Aluminum Plugs"],
    description: "Bend-tested up to 30,000 cycles. Supports high-speed data transfer and 240W ultra-fast charging."
  },

  // --- ACCESSORIES: TEMPERED GLASS & SCREEN PROTECTORS ---
  {
    id: "prod-glass-9h",
    name: "9H Sapphire Tempered Glass Screen Protector with Auto-Dust Tray",
    mainCategory: "accessories",
    category: "tempered-glass",
    subCategory: "tempered",
    condition: "Brand New",
    conditionBadge: "Free In-Store Fit",
    batteryHealth: null,
    price: 2490,
    originalPrice: 3200,
    discount: "22% OFF",
    rating: 4.8,
    reviewsCount: 310,
    stock: 120,
    isFeatured: false,
    warranty: "Free Installation at Physical Store",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["Auto Alignment", "Oleophobic Coating", "Edge-to-Edge"],
    description: "Zero bubbles guarantee. Bring to our Universe Hub physical store for complimentary free precision machine fitting."
  },

  // --- ACCESSORIES: CAMERA LENS PROTECTORS ---
  {
    id: "prod-cam-lens",
    name: "ESR Armorite Titanium Camera Lens Protector (iPhone 16 / 15 Pro Max)",
    mainCategory: "accessories",
    category: "camera-protectors",
    subCategory: "camera-lens",
    condition: "Brand New",
    conditionBadge: "Titanium Ring",
    batteryHealth: null,
    price: 3490,
    originalPrice: 4500,
    discount: "22% OFF",
    rating: 4.9,
    reviewsCount: 68,
    stock: 40,
    isFeatured: true,
    warranty: "Scratch-Proof Guarantee",
    image: "assets/cases_banner.jpg",
    images: [
      "assets/cases_banner.jpg",
      "assets/hero_showcase.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["Individual Lens Rings", "Anti-Reflective Night Shot", "9H Hardness"],
    description: "Aviation-grade alloy edge with 9H tempered sapphire glass. Zero flash glare, ultra scratch-proof camera shield."
  },

  // --- ACCESSORIES: AUDIO & AIRPODS ---
  {
    id: "prod-airpods-pro",
    name: "Apple AirPods Pro (2nd Generation) with Type-C MagSafe Case",
    mainCategory: "accessories",
    category: "audio",
    subCategory: "audio",
    condition: "Brand New",
    conditionBadge: "Apple Original",
    batteryHealth: null,
    price: 78500,
    originalPrice: 89000,
    discount: "Best Audio",
    rating: 4.9,
    reviewsCount: 142,
    stock: 14,
    isFeatured: true,
    warranty: "1 Year Apple International Warranty",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80",
      "assets/hero_showcase.jpg"
    ],
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tags: ["2x Active Noise Cancellation", "Spatial Audio", "Transparency Mode"],
    description: "Next-level active noise cancellation, adaptive audio and USB-C MagSafe charging case with precision finding."
  },

  // --- BRAND SPECIFIC ACCESSORIES (UGREEN, BASEUS, WIWU, ASPER) ---
  {
    id: "prod-ugreen-100w",
    name: "Ugreen Nexode 100W 4-Port GaN Fast Desktop Charger",
    mainCategory: "accessories",
    category: "chargers",
    subCategory: "chargers",
    brand: "Ugreen",
    condition: "Brand New",
    conditionBadge: "100W GaN",
    batteryHealth: null,
    price: 16900,
    originalPrice: 19500,
    discount: "13% OFF",
    rating: 5.0,
    reviewsCount: 88,
    stock: 22,
    isFeatured: true,
    warranty: "1 Year Ugreen Replacement Warranty",
    image: "assets/chargers_banner.jpg",
    images: [
      "assets/chargers_banner.jpg",
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["3x USB-C + 1x USB-A", "GaNFast Tech", "Powers Laptop + Phone"],
    description: "Official Ugreen Nexode 100W desktop power station. High-efficiency GaN III charging for MacBook, iPhone and iPad simultaneously."
  },
  {
    id: "prod-baseus-cable",
    name: "Baseus Tungsten Gold 100W Type-C Fast Charging Cable (1.5m)",
    mainCategory: "accessories",
    category: "cables",
    subCategory: "cables",
    brand: "Baseus",
    condition: "Brand New",
    conditionBadge: "100W PD",
    batteryHealth: null,
    price: 3200,
    originalPrice: 4200,
    discount: "24% OFF",
    rating: 4.8,
    reviewsCount: 64,
    stock: 50,
    isFeatured: false,
    warranty: "6 Months Baseus Warranty",
    image: "assets/chargers_banner.jpg",
    images: [
      "assets/chargers_banner.jpg",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["E-Marker Chip", "Zinc Alloy Plugs", "High-Density Braiding"],
    description: "Ultra-resilient Baseus cable engineered with high-luster tungsten alloy plugs and 480Mbps fast data transmission."
  },
  {
    id: "prod-wiwu-wallet",
    name: "WiWU MagSkin Premium Vegan Leather MagSafe Wallet & Kickstand",
    mainCategory: "accessories",
    category: "back-covers",
    subCategory: "cases",
    brand: "WiWU",
    condition: "Brand New",
    conditionBadge: "MagSafe Stand",
    batteryHealth: null,
    price: 4800,
    originalPrice: 6200,
    discount: "22% OFF",
    rating: 4.9,
    reviewsCount: 52,
    stock: 30,
    isFeatured: true,
    warranty: "6 Months WiWU Warranty",
    image: "assets/cases_banner.jpg",
    images: [
      "assets/cases_banner.jpg",
      "assets/hero_showcase.jpg"
    ],
    video: "",
    tags: ["Holds 3 Cards", "Multi-Angle Kickstand", "N52 Magnets"],
    description: "Snap-on WiWU MagSafe leather card wallet that folds into an ergonomic portrait or landscape phone stand."
  },
  {
    id: "prod-asper-case",
    name: "Asper AeroShock Frosted Matte MagSafe Case with Metallic Buttons",
    mainCategory: "accessories",
    category: "back-covers",
    subCategory: "cases",
    brand: "Asper",
    condition: "Brand New",
    conditionBadge: "Matte Grip",
    batteryHealth: null,
    price: 5900,
    originalPrice: 7500,
    discount: "21% OFF",
    rating: 4.8,
    reviewsCount: 45,
    stock: 35,
    isFeatured: true,
    warranty: "1 Year Anti-Yellowing Warranty",
    image: "assets/cases_banner.jpg",
    images: [
      "assets/cases_banner.jpg",
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80"
    ],
    video: "",
    tags: ["Fingerprint Resistant", "Anodized CNC Buttons", "Shock Absorbing"],
    description: "Premium frosted back translucent case with CNC machined tactile buttons and reinforced drop-absorbing corners."
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
  if (!existingBrands) {
    localStorage.setItem("UH_BRANDS", JSON.stringify(INITIAL_BRANDS));
  } else {
    try {
      const storedBrands = JSON.parse(existingBrands) || [];
      let brandsUpdated = false;
      INITIAL_BRANDS.forEach(ib => {
        if (!storedBrands.some(b => b.id.toLowerCase() === ib.id.toLowerCase())) {
          storedBrands.push(ib);
          brandsUpdated = true;
        }
      });
      if (brandsUpdated) {
        localStorage.setItem("UH_BRANDS", JSON.stringify(storedBrands));
      }
    } catch (e) {
      localStorage.setItem("UH_BRANDS", JSON.stringify(INITIAL_BRANDS));
    }
  }

  // 3. Products schema upgrade & initial load
  const existingProducts = localStorage.getItem("UH_PRODUCTS");
  if (!existingProducts) {
    const enriched = INITIAL_PRODUCTS.map(p => {
      if (!p.brand) p.brand = detectProductBrand(p);
      return p;
    });
    localStorage.setItem("UH_PRODUCTS", JSON.stringify(enriched));
  } else {
    try {
      const prods = JSON.parse(existingProducts);
      let needsUpdate = false;

      prods.forEach(p => {
        const match = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
        if (match) {
          if (!p.mainCategory) { p.mainCategory = match.mainCategory; needsUpdate = true; }
          if (p.category === "iphones" || p.category === "cases") {
            p.category = match.category;
            needsUpdate = true;
          }
          if (match.brand && (!p.brand || p.brand === "Universal" || p.brand === "Generic")) {
            p.brand = match.brand;
            needsUpdate = true;
          }
        }

        // Auto-assign brand if missing
        if (!p.brand) {
          p.brand = detectProductBrand(p);
          needsUpdate = true;
        }

        if (!p.images || !Array.isArray(p.images) || p.images.length === 0) {
          if (match && match.images) {
            p.images = match.images;
            p.video = match.video || "";
          } else {
            p.images = [p.image || ""];
            p.video = p.video || "";
          }
          needsUpdate = true;
        }
      });

      // Also ensure newly defined products (like Ugreen, Baseus, WiWU, Asper) exist
      INITIAL_PRODUCTS.forEach(ip => {
        if (!prods.some(p => p.id === ip.id)) {
          if (!ip.brand) ip.brand = detectProductBrand(ip);
          prods.push(ip);
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(prods));
      }
    } catch (e) {
      localStorage.setItem("UH_PRODUCTS", JSON.stringify(INITIAL_PRODUCTS));
    }
  }

  if (!localStorage.getItem("UH_REVIEWS")) {
    localStorage.setItem("UH_REVIEWS", JSON.stringify(INITIAL_REVIEWS));
  }
  if (!localStorage.getItem("UH_REPAIRS")) {
    localStorage.setItem("UH_REPAIRS", JSON.stringify(DEMO_REPAIR_ORDERS));
  }
  if (!localStorage.getItem("UH_ORDERS")) {
    localStorage.setItem("UH_ORDERS", JSON.stringify(DEMO_STORE_ORDERS));
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
      // Sync official admin credentials for Shashika
      parsed.email = "shashikaisuranga143@gmail.com";
      parsed.password = "Kumudinikumari@0709";
      parsed.secondaryPassword = "admin";
      parsed.name = "Store Administrator (Shashika)";
      localStorage.setItem("UH_ADMIN_CONFIG", JSON.stringify(parsed));
    }
  } catch (e) {}

  try {
    let users = JSON.parse(localStorage.getItem("UH_USERS")) || [];
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
      if (!parsed.email) {
        parsed.email = DEFAULT_STORE_SETTINGS.email;
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
  email: "contact@universehub.store",
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
  secondaryPassword: "admin",
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
    id: "usr-admin-1",
    name: "Store Administrator",
    email: "admin@universehub.store",
    password: "admin",
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
