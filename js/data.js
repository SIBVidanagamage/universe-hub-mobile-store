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
    id: "power-banks",
    name: "Power Banks & MagSafe Battery",
    group: "accessories",
    groupName: "Accessories",
    icon: "🔋",
    inNav: true,
    inFilter: true,
    order: 3
  },
  {
    id: "back-covers",
    name: "Back Covers & Cases",
    group: "accessories",
    groupName: "Accessories",
    icon: "🛡️",
    inNav: true,
    inFilter: true,
    order: 4
  },
  {
    id: "chargers",
    name: "Fast Chargers & GaN",
    group: "accessories",
    groupName: "Accessories",
    icon: "⚡",
    inNav: true,
    inFilter: true,
    order: 5
  },
  {
    id: "cables",
    name: "Charging Cables",
    group: "accessories",
    groupName: "Accessories",
    icon: "🔌",
    inNav: true,
    inFilter: true,
    order: 6
  },
  {
    id: "tempered-glass",
    name: "Tempered Glass & Protectors",
    group: "accessories",
    groupName: "Accessories",
    icon: "📱",
    inNav: true,
    inFilter: true,
    order: 7
  },
  {
    id: "camera-protectors",
    name: "Camera Lens Protectors",
    group: "accessories",
    groupName: "Accessories",
    icon: "📸",
    inNav: true,
    inFilter: true,
    order: 8
  },
  {
    id: "audio",
    name: "Audio & AirPods",
    group: "accessories",
    groupName: "Accessories",
    icon: "🎧",
    inNav: true,
    inFilter: true,
    order: 9
  }
];

// Master Brands Taxonomy (Official Accessory & Device Brands)
const INITIAL_BRANDS = [
  {
    id: "apple",
    name: "Apple",
    icon: "🍏",
    logo: null,
    tagline: "Official Flagship Devices & Original Tech",
    inNav: true,
    inFilter: true,
    order: 1
  },
  {
    id: "anker",
    name: "Anker",
    icon: "⚡",
    logo: null,
    tagline: "GaN Fast Chargers & Heavy-Duty Power",
    inNav: true,
    inFilter: true,
    order: 2
  },
  {
    id: "baseus",
    name: "Baseus",
    icon: "🔋",
    logo: null,
    tagline: "Digital Wattage Displays & Slim Power Banks",
    inNav: true,
    inFilter: true,
    order: 3
  },
  {
    id: "ugreen",
    name: "Ugreen",
    icon: "🟢",
    logo: null,
    tagline: "Nexode GaN & Pro Armor Charging Cables",
    inNav: true,
    inFilter: true,
    order: 4
  },
  {
    id: "wiwu",
    name: "WiWU",
    icon: "💼",
    logo: null,
    tagline: "Premium Leather Cases, Stands & Wallets",
    inNav: true,
    inFilter: true,
    order: 5
  },
  {
    id: "asper",
    name: "Asper",
    icon: "🛡️",
    logo: null,
    tagline: "AeroShock Titanium Armor & Matte Cases",
    inNav: true,
    inFilter: true,
    order: 6
  },
  {
    id: "spigen",
    name: "Spigen",
    icon: "🛡️",
    logo: null,
    tagline: "Military-Grade Air Cushion Protection",
    inNav: true,
    inFilter: true,
    order: 7
  },
  {
    id: "esr",
    name: "ESR",
    icon: "💎",
    logo: null,
    tagline: "Armorite Camera & Sapphire Screen Shields",
    inNav: true,
    inFilter: true,
    order: 8
  }
];

const INITIAL_PRODUCTS = [
  {
    "id": "prod-1794850434081",
    "name": "iphone 14  Pro",
    "title": "iphone 14  Pro",
    "slug": "iphone-14-pro",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 175000,
    "originalPrice": 178000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-14-pro.jpg",
    "images": [
      "assets/products/iphone-14-pro.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 175000,
        "capacity": "128GB",
        "originalPrice": 178000
      },
      {
        "price": 185000,
        "capacity": "256GB",
        "originalPrice": 188000
      }
    ],
    "colorOptions": [
      "Deep Purple"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n**Premium Design. Pro-Level Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of luxury, innovation, and powerful performance with the Apple iPhone 14 Pro (2022). Powered by Apple's advanced A16 Bionic chip, this premium smartphone delivers exceptional speed, smooth multitasking, and outstanding everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display with ProMotion technology, a 120Hz adaptive refresh rate, and the innovative Dynamic Island, the iPhone 14 Pro offers an incredibly smooth and immersive experience.\n\nWith its professional 48MP triple-camera system, Always-On display, premium stainless steel design, and advanced photography technology, the iPhone 14 Pro delivers exceptional performance for photography, gaming, entertainment, and everyday use.\n\n**Key Features**\n\nDisplay: 6.1-inch Super Retina XDR OLED Display\nRefresh Rate: ProMotion Technology with Adaptive 120Hz Refresh Rate\nProcessor: Apple A16 Bionic Chip with 5-Core GPU\nRear Camera: Pro Camera System (48MP Main + 12MP Ultra Wide + 12MP Telephoto)\nFront Camera: 12MP TrueDepth Selfie Camera with Autofocus\nSecurity: Face ID Facial Recognition\nStorage Options: 128GB / 256GB / 512GB / 1TB\nDisplay Features: Dynamic Island & Always-On Display\nConnectivity: 5G Network Support\nVideo Recording: 4K Dolby Vision HDR Video Recording up to 60fps\nPhotography: Photonic Engine, Deep Fusion, Smart HDR 4, Night Mode, Apple ProRAW & Photographic Styles\nCamera Features: LiDAR Scanner, Macro Photography, 3x Optical Zoom & Sensor-Shift Optical Image Stabilization\nProfessional Video: Cinematic Mode, Action Mode & Apple ProRes Video Recording\nSafety Features: Crash Detection & Emergency SOS via Satellite (Region Dependent)\nBattery Life: Up to 23 Hours of Video Playback\nCharging: Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\nOperating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Deep Purple"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 175000,
          "capacity": "128GB",
          "originalPrice": 178000
        },
        {
          "price": 185000,
          "capacity": "256GB",
          "originalPrice": 188000
        }
      ]
    }
  },
  {
    "id": "prod-1794850583515",
    "name": "iphone 14 Pro Max",
    "title": "iphone 14 Pro Max",
    "slug": "iphone-14-pro-max",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 195000,
    "originalPrice": 198000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-14-pro-max.jpg",
    "images": [
      "assets/products/iphone-14-pro-max.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 195000,
        "capacity": "128GB",
        "originalPrice": 198000
      },
      {
        "price": 205000,
        "capacity": "256GB",
        "originalPrice": 208000
      }
    ],
    "colorOptions": [
      "Deep Purple"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:\n**\n**Premium Design. Pro-Level Performance. Ultimate Apple Experience.**\n\nExperience the perfect combination of luxury, innovation, and powerful performance with the Apple iPhone 14 Pro Max (2022). Powered by Apple's advanced A16 Bionic chip, this premium smartphone delivers exceptional speed, smooth multitasking, and outstanding everyday performance. Featuring a stunning 6.7-inch Super Retina XDR OLED display with ProMotion technology, a 120Hz adaptive refresh rate, and the innovative Dynamic Island, the iPhone 14 Pro Max offers an incredibly smooth and immersive viewing experience.\n\nWith its professional 48MP triple-camera system, Always-On display, premium stainless steel design, and exceptional battery life, the iPhone 14 Pro Max delivers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\n**Key Features**\n\nDisplay: 6.7-inch Super Retina XDR OLED Display\nRefresh Rate: ProMotion Technology with Adaptive 120Hz Refresh Rate\nProcessor: Apple A16 Bionic Chip with 5-Core GPU\nRear Camera: Pro Camera System (48MP Main + 12MP Ultra Wide + 12MP Telephoto)\nFront Camera: 12MP TrueDepth Selfie Camera with Autofocus\nSecurity: Face ID Facial Recognition\nStorage Options: 128GB / 256GB / 512GB / 1TB\nDisplay Features: Dynamic Island & Always-On Display\nConnectivity: 5G Network Support\nVideo Recording: 4K Dolby Vision HDR Video Recording up to 60fps\nPhotography: Photonic Engine, Deep Fusion, Smart HDR 4, Night Mode, Apple ProRAW & Photographic Styles\nCamera Features: LiDAR Scanner, Macro Photography, 3x Optical Zoom & Sensor-Shift Optical Image Stabilization\nProfessional Video: Cinematic Mode, Action Mode & Apple ProRes Video Recording\nSafety Features: Crash Detection & Emergency SOS via Satellite (Region Dependent)\nBattery Life: Up to 29 Hours of Video Playback\nCharging: Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\nOperating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Deep Purple"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 195000,
          "capacity": "128GB",
          "originalPrice": 198000
        },
        {
          "price": 205000,
          "capacity": "256GB",
          "originalPrice": 208000
        }
      ]
    }
  },
  {
    "id": "prod-1794509949193",
    "name": "iphone Se 2",
    "title": "iphone Se 2",
    "slug": "iphone-se-2",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 48000,
    "originalPrice": 54000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-se-2.jpg",
    "images": [
      "assets/products/iphone-se-2.jpg",
      "assets/products/iphone-se-2-2.jpg",
      "assets/products/iphone-se-2-3.jpg",
      "assets/products/iphone-se-2-4.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 48000,
        "capacity": "128GB",
        "originalPrice": 54000
      },
      {
        "price": 54000,
        "capacity": "256GB",
        "originalPrice": 58000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "White",
      "Product RED"
    ],
    "stockStatus": "available",
    "warranty": "1M Cheking & 2Y Software",
    "description": "Key Features:\n\n**Compact Design. Powerful Performance. Classic Apple Experience.**\n\nExperience the perfect combination of performance and simplicity with the Apple iPhone SE 2 (2020). Powered by Apple's A13 Bionic chip, this compact smartphone delivers smooth performance for everyday tasks, photography, gaming, and entertainment.\n\n**Key Features**\n\n• Display: 4.7-inch Retina HD Display\n• Processor: Apple A13 Bionic Chip\n• Rear Camera: 12MP Wide Camera\n• Front Camera: 7MP Selfie Camera\n• Security: Touch ID Fingerprint Sensor\n• Charging: Fast Charging & Wireless Charging Support\n• Protection: IP67 Water & Dust Resistance\n• Operating System: iOS",
    "specs": {
      "video": "",
      "warranty": "1M Cheking & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "White",
        "Product RED"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 48000,
          "capacity": "128GB",
          "originalPrice": 54000
        },
        {
          "price": 54000,
          "capacity": "256GB",
          "originalPrice": 58000
        }
      ]
    }
  },
  {
    "id": "prod-1794848805601",
    "name": "iphone 12 pro max",
    "title": "iphone 12 pro max",
    "slug": "iphone-12-pro-max",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 120000,
    "originalPrice": 123000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-12-pro-max.jpg",
    "images": [
      "assets/products/iphone-12-pro-max.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 120000,
        "capacity": "128GB",
        "originalPrice": 123000
      },
      {
        "price": 130000,
        "capacity": "256GB",
        "originalPrice": 133000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "Blue / Sierra Blue"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "Apple iPhone 12 Pro Max (2020)\nPremium Design. Pro-Level Performance. Ultimate Apple Experience.\n\nExperience the perfect combination of luxury, innovation, and powerful performance with the Apple iPhone 12 Pro Max (2020). Powered by Apple's advanced A14 Bionic chip, this premium smartphone delivers exceptional speed, smooth multitasking, and outstanding everyday performance. Featuring a stunning 6.7-inch Super Retina XDR OLED display, a professional triple-camera system, and 5G connectivity, the iPhone 12 Pro Max offers an incredible experience for photography, gaming, entertainment, and everyday use.\n\nWith its premium stainless steel design, advanced camera technology, and impressive battery life, the iPhone 12 Pro Max brings flagship-level performance to your fingertips.\n\nKey Features\n\nDisplay:6.7-inch Super Retina XDR OLED Display\nProcessor: Apple A14 Bionic Chip\nRear Camera: Triple 12MP Camera System (Wide + Ultra Wide + Telephoto)\nFront Camera: 12MP TrueDepth Selfie Camera\nSecurity: Face ID Facial Recognition\nStorage Options:128GB / 256GB / 512GB\nConnectivity: 5G Network Support\nVideo Recording: 4K Dolby Vision HDR Video Recording up to 60fps\nPhotography: Night Mode, Deep Fusion, Apple ProRAW & LiDAR Scanner\nCamera Features: Sensor-Shift Optical Image Stabilization & 2.5x Optical Zoom In\nCharging: Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\nOperating System:iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available  \n💵 Cash on Delivery Available  \n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "Blue / Sierra Blue"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 120000,
          "capacity": "128GB",
          "originalPrice": 123000
        },
        {
          "price": 130000,
          "capacity": "256GB",
          "originalPrice": 133000
        }
      ]
    }
  },
  {
    "id": "prod-1794510204797",
    "name": "iphone Se 3",
    "title": "iphone Se 3",
    "slug": "iphone-se-3",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 65000,
    "originalPrice": 68000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-se-3.jpg",
    "images": [
      "assets/products/iphone-se-3.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": null,
    "storageOptions": [
      {
        "price": 65000,
        "capacity": "128GB",
        "originalPrice": 68000
      }
    ],
    "colorOptions": [
      "Midnight / Black"
    ],
    "stockStatus": "available",
    "warranty": "1M Checking & 2Y Software",
    "description": "**Key Features:**\n\n\nCompact Design. Powerful Performance. Incredible Apple Experience.\n\nExperience exceptional performance in a classic, compact design with the Apple iPhone SE 3 (2022). Powered by Apple's advanced A15 Bionic chip, this smartphone delivers impressive speed, smooth multitasking, excellent photography, and reliable everyday performance. With 5G connectivity and the security of Touch ID, the iPhone SE 3 combines modern technology with a familiar design.\n\nKey Features\n\n• Display: 4.7-inch Retina HD Display\n• Processor: Apple A15 Bionic Chip\n• Rear Camera: 12MP Wide Camera\n• Front Camera: 7MP Selfie Camera\n• Security: Touch ID Fingerprint Sensor\n• Connectivity: 5G Network Support\n• Video Recording: 4K Video Recording up to 60fps\n• Charging: Fast Charging & Wireless Charging Support\n• Protection: IP67 Water & Dust Resistance\n• Operating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checking & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black"
      ],
      "batteryHealth": null,
      "storageOptions": [
        {
          "price": 65000,
          "capacity": "128GB",
          "originalPrice": 68000
        }
      ]
    }
  },
  {
    "id": "prod-1794849015704",
    "name": "iphone 13",
    "title": "iphone 13",
    "slug": "iphone-13",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 108000,
    "originalPrice": 110000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-13.jpg",
    "images": [
      "assets/products/iphone-13.jpg",
      "assets/products/iphone-13-2.jpg",
      "assets/products/iphone-13-3.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 108000,
        "capacity": "128GB",
        "originalPrice": 110000
      },
      {
        "price": 118000,
        "capacity": "256GB",
        "originalPrice": 120000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "Starlight / Silver"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n**Elegant Design. Powerful Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of style, innovation, and powerful performance with the Apple iPhone 13 (2021). Powered by Apple's advanced A15 Bionic chip, this smartphone delivers exceptional speed, smooth multitasking, and impressive everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display, an advanced dual-camera system, and 5G connectivity, the iPhone 13 offers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\nWith its sleek aluminum design, Ceramic Shield protection, improved battery life, and advanced camera technology, the iPhone 13 delivers a premium smartphone experience.\nKey Features\n\nDisplay: 6.1-inch Super Retina XDR OLED Display\nProcessor: Apple A15 Bionic Chip\nRear Camera: Dual 12MP Camera System (Wide + Ultra Wide)\nFront Camera: 12MP TrueDepth Selfie Camera\nSecurity: Face ID Facial Recognition\nStorage Options: 128GB / 256GB / 512GB\nConnectivity: 5G Network Support\nVideo Recording: 4K Video Recording up to 60fps\nPhotography: Night Mode, Deep Fusion, Smart HDR 4 & Photographic Styles\nCamera Features: Sensor-Shift Optical Image Stabilization & Cinematic Mode\nCharging: Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Aerospace-Grade Aluminum Design\nOperating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "Starlight / Silver"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 108000,
          "capacity": "128GB",
          "originalPrice": 110000
        },
        {
          "price": 118000,
          "capacity": "256GB",
          "originalPrice": 120000
        }
      ]
    }
  },
  {
    "id": "prod-1794850800664",
    "name": "iphone 15",
    "title": "iphone 15",
    "slug": "iphone-15",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 165000,
    "originalPrice": 168000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-15.jpg",
    "images": [
      "assets/products/iphone-15.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 165000,
        "capacity": "128GB",
        "originalPrice": 168000
      },
      {
        "price": 175000,
        "capacity": "256GB",
        "originalPrice": 178000
      }
    ],
    "colorOptions": [
      "Pink"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n**Elegant Design. Powerful Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of elegance, innovation, and powerful performance with the Apple iPhone 15 (2023). Powered by Apple's advanced A16 Bionic chip, this smartphone delivers exceptional speed, smooth multitasking, and impressive everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display with Dynamic Island, an advanced 48MP dual-camera system, and 5G connectivity, the iPhone 15 offers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\nWith its premium color-infused glass design, durable aluminum frame, advanced camera technology, USB-C connectivity, and impressive battery life, the iPhone 15 delivers a modern and premium smartphone experience.\n\n**Shop at Universe Hub for quality smartphones at competitive prices.**\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Pink"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 165000,
          "capacity": "128GB",
          "originalPrice": 168000
        },
        {
          "price": 175000,
          "capacity": "256GB",
          "originalPrice": 178000
        }
      ]
    }
  },
  {
    "id": "prod-1794849330315",
    "name": "iphone 13 pro max",
    "title": "iphone 13 pro max",
    "slug": "iphone-13-pro-max",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 150000,
    "originalPrice": 152000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-13-pro-max.jpg",
    "images": [
      "assets/products/iphone-13-pro-max.jpg",
      "assets/products/iphone-13-pro-max-2.jpg",
      "assets/products/iphone-13-pro-max-3.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 150000,
        "capacity": "128GB",
        "originalPrice": 152000
      },
      {
        "price": 160000,
        "capacity": "256GB",
        "originalPrice": 162000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "Blue / Sierra Blue"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n\n**Premium Design. Pro-Level Performance. Ultimate Apple Experience.**\n\nExperience the perfect combination of luxury, innovation, and powerful performance with the Apple iPhone 13 Pro Max (2021). Powered by Apple's advanced A15 Bionic chip with a 5-core GPU, this premium smartphone delivers exceptional speed, smooth multitasking, and outstanding everyday performance. Featuring a stunning 6.7-inch Super Retina XDR OLED display with ProMotion technology and a 120Hz adaptive refresh rate, the iPhone 13 Pro Max offers an incredibly smooth and immersive viewing experience.\n\nWith its professional triple-camera system, advanced photography features, premium stainless steel design, and exceptional battery life, the iPhone 13 Pro Max delivers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\n**Key Features**\n\nDisplay: 6.7-inch Super Retina XDR OLED Display\nRefresh Rate: ProMotion Technology with Adaptive 120Hz Refresh Rate\nProcessor: Apple A15 Bionic Chip with 5-Core GPU\nRear Camera: Triple 12MP Camera System (Wide + Ultra Wide + Telephoto)\nFront Camera: 12MP TrueDepth Selfie Camera\nSecurity: Face ID Facial Recognition\nStorage Options: 128GB / 256GB / 512GB / 1TB\nConnectivity: 5G Network Support\nVideo Recording: 4K Dolby Vision HDR Video Recording up to 60fps\nPhotography: Night Mode, Deep Fusion, Smart HDR 4, Apple ProRAW & Photographic Styles\nCamera Features: Macro Photography, LiDAR Scanner, 3x Optical Zoom & Sensor-Shift Optical Image Stabilization\nProfessional Video: Cinematic Mode & Apple ProRes Video Recording\nBattery Life: Up to 28 Hours of Video Playback\nCharging: Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\n\nOperating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "Blue / Sierra Blue"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 150000,
          "capacity": "128GB",
          "originalPrice": 152000
        },
        {
          "price": 160000,
          "capacity": "256GB",
          "originalPrice": 162000
        }
      ]
    }
  },
  {
    "id": "prod-1794847997672",
    "name": "iphone 12",
    "title": "iphone 12",
    "slug": "iphone-12",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 88000,
    "originalPrice": 90000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-12.jpg",
    "images": [
      "assets/products/iphone-12.jpg",
      "assets/products/iphone-12-2.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 88000,
        "capacity": "128GB",
        "originalPrice": 90000
      },
      {
        "price": 100000,
        "capacity": "256GB",
        "originalPrice": 103000
      }
    ],
    "colorOptions": [
      "Blue / Sierra Blue",
      "Green / Alpine"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\nStunning Design. Powerful Performance. Exceptional Apple Experience.\n\nExperience the perfect combination of style, innovation, and performance with the Apple iPhone 12 (2020). Powered by Apple's A14 Bionic chip, this smartphone delivers impressive speed, smooth multitasking, and excellent everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display, advanced dual-camera system, and 5G connectivity, the iPhone 12 offers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\n**Key Features**\n• Display:6.1-inch Super Retina XDR OLED Display\n• Processor:Apple A14 Bionic Chip\n• Rear Camera: Dual 12MP Camera System (Wide + Ultra Wide)\n• Front Camera: 12MP TrueDepth Selfie Camera\n• Security:Face ID Facial Recognition\n• Storage Options:64GB / 128GB / 256GB\n• Connectivity:5G Network Support\n• Video Recording: 4K Video Recording up to 60fps\n• Charging:Fast Charging, MagSafe & Qi Wireless Charging\n• Protection: IP68 Water & Dust Resistance\n• Build Quality: Ceramic Shield Front & Aerospace-Grade Aluminum Design\n• Operating System: iOS\n\nShop at Universe Hub*for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available  \n💵 Cash on Delivery Available  \n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Blue / Sierra Blue",
        "Green / Alpine"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 88000,
          "capacity": "128GB",
          "originalPrice": 90000
        },
        {
          "price": 100000,
          "capacity": "256GB",
          "originalPrice": 103000
        }
      ]
    }
  },
  {
    "id": "prod-1794848492330",
    "name": "iphone 12 Pro",
    "title": "iphone 12 Pro",
    "slug": "iphone-12-pro",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 105000,
    "originalPrice": 108000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-12-pro.jpg",
    "images": [
      "assets/products/iphone-12-pro.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 105000,
        "capacity": "128GB",
        "originalPrice": 108000
      },
      {
        "price": 110000,
        "capacity": "256GB",
        "originalPrice": 113000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "Blue / Sierra Blue"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:\n**\n\n**Premium Design. Pro-Level Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of elegance, innovation, and powerful performance with the Apple iPhone 12 Pro (2020). Powered by Apple's advanced A14 Bionic chip, this premium smartphone delivers exceptional speed, smooth multitasking, and impressive everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display, a professional triple-camera system, and 5G connectivity, the iPhone 12 Pro offers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\n**Key Features**\nDisplay: 6.1-inch Super Retina XDR OLED Display\nProcessor: Apple A14 Bionic Chip\nRear Camera: Triple 12MP Camera System (Wide + Ultra Wide + Telephoto)\nFront Camera: 12MP TrueDepth Selfie Camera\nSecurity:Face ID Facial Recognition\nStorage Options: 128GB / 256GB / 512GB\nConnectivity:5G Network Support\nVideo Recording: 4K Dolby Vision HDR Video Recording up to 60fps\nPhotography:Night Mode, Deep Fusion, Apple ProRAW & LiDAR Scanner\nCharging:Fast Charging, MagSafe & Qi Wireless Charging\nProtection: IP68 Water & Dust Resistance\nBuild Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\nOperating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available  \n💵 Cash on Delivery Available  \n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "Blue / Sierra Blue"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 105000,
          "capacity": "128GB",
          "originalPrice": 108000
        },
        {
          "price": 110000,
          "capacity": "256GB",
          "originalPrice": 113000
        }
      ]
    }
  },
  {
    "id": "prod-1794849170909",
    "name": "iphone 13 pro",
    "title": "iphone 13 pro",
    "slug": "iphone-13-pro",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 135000,
    "originalPrice": 138000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-13-pro.jpg",
    "images": [
      "assets/products/iphone-13-pro.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 135000,
        "capacity": "128GB",
        "originalPrice": 138000
      },
      {
        "price": 145000,
        "capacity": "256GB",
        "originalPrice": 148000
      }
    ],
    "colorOptions": [
      "Blue / Sierra Blue"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n\n**Premium Design. Pro-Level Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of luxury, innovation, and powerful performance with the Apple iPhone 13 Pro (2021). Powered by Apple's advanced A15 Bionic chip with a 5-core GPU, this premium smartphone delivers exceptional speed, smooth multitasking, and outstanding performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display with ProMotion technology and a 120Hz adaptive refresh rate, the iPhone 13 Pro offers an incredibly smooth and immersive viewing experience.\n\nWith its professional triple-camera system, advanced photography features, premium stainless steel design, and impressive battery life, the iPhone 13 Pro delivers an outstanding experience for photography, gaming, entertainment, and everyday use.\n**\nKey Features**\n\n• Display: 6.1-inch Super Retina XDR OLED Display\n• Refresh Rate: ProMotion Technology with Adaptive 120Hz Refresh Rate\n• Processor: Apple A15 Bionic Chip with 5-Core GPU\n• Rear Camera: Triple 12MP Camera System (Wide + Ultra Wide + Telephoto)\n• Front Camera: 12MP TrueDepth Selfie Camera\n• Security: Face ID Facial Recognition\n• Storage Options: 128GB / 256GB / 512GB / 1TB\n• Connectivity: 5G Network Support\n• Video Recording: 4K Dolby Vision HDR Video Recording up to 60fps\n• Photography: Night Mode, Deep Fusion, Smart HDR 4, Apple ProRAW & Photographic Styles\n• Camera Features: Macro Photography, LiDAR Scanner, 3x Optical Zoom & Sensor-Shift Optical Image Stabilization\n• Professional Video: Cinematic Mode & Apple ProRes Video Recording\n• Charging: Fast Charging, MagSafe & Qi Wireless Charging\n• Protection: IP68 Water & Dust Resistance\n• Build Quality: Ceramic Shield Front & Surgical-Grade Stainless Steel Design\n• Operating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Blue / Sierra Blue"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 135000,
          "capacity": "128GB",
          "originalPrice": 138000
        },
        {
          "price": 145000,
          "capacity": "256GB",
          "originalPrice": 148000
        }
      ]
    }
  },
  {
    "id": "prod-1794850262033",
    "name": "iphone 14",
    "title": "iphone 14",
    "slug": "iphone-14",
    "category": "used-iphones",
    "brand": "Apple",
    "price": 122000,
    "originalPrice": 125000,
    "badge": null,
    "isFeatured": true,
    "stock": 10,
    "rating": 5,
    "reviewsCount": 1,
    "reviews": 1,
    "image": "assets/products/iphone-14.jpg",
    "images": [
      "assets/products/iphone-14.jpg",
      "assets/products/iphone-14-2.jpg",
      "assets/products/iphone-14-3.jpg"
    ],
    "video": null,
    "condition": "",
    "conditionBadge": null,
    "batteryHealth": "Up to 85%",
    "storageOptions": [
      {
        "price": 122000,
        "capacity": "128GB",
        "originalPrice": 125000
      },
      {
        "price": 135000,
        "capacity": "256GB",
        "originalPrice": 137000
      }
    ],
    "colorOptions": [
      "Midnight / Black",
      "Starlight / Silver"
    ],
    "stockStatus": "available",
    "warranty": "1M Checcking  & 2Y Software",
    "description": "**Key Features:**\n\n**Elegant Design. Powerful Performance. Exceptional Apple Experience.**\n\nExperience the perfect combination of style, innovation, and powerful performance with the Apple iPhone 14 (2022). Powered by Apple's advanced A15 Bionic chip with a 5-core GPU, this smartphone delivers exceptional speed, smooth multitasking, and impressive everyday performance. Featuring a stunning 6.1-inch Super Retina XDR OLED display, an advanced dual-camera system, and 5G connectivity, the iPhone 14 offers an outstanding experience for photography, gaming, entertainment, and everyday use.\n\nWith its sleek aluminum design, Ceramic Shield protection, improved low-light photography, and impressive battery life, the iPhone 14 delivers a premium smartphone experience with advanced safety features.\n\n**Key Features**\n\n• Display: 6.1-inch Super Retina XDR OLED Display\n• Processor: Apple A15 Bionic Chip with 5-Core GPU\n• Rear Camera: Dual 12MP Camera System (Main + Ultra Wide)\n• Front Camera: 12MP TrueDepth Selfie Camera with Autofocus\n• Security: Face ID Facial Recognition\n• Storage Options: 128GB / 256GB / 512GB\n• Connectivity: 5G Network Support\n• Video Recording: 4K Dolby Vision HDR Video Recording up to 60fps\n• Photography: Photonic Engine, Deep Fusion, Smart HDR 4, Night Mode & Photographic Styles\n• Camera Features: Sensor-Shift Optical Image Stabilization, Cinematic Mode & Action Mode\n• Safety Features: Crash Detection & Emergency SOS via Satellite (Region Dependent)\n• Battery Life: Up to 20 Hours of Video Playback\n• Charging: Fast Charging, MagSafe & Qi Wireless Charging\n• Protection: IP68 Water & Dust Resistance\n• Build Quality: Ceramic Shield Front & Aerospace-Grade Aluminum Design\n• Operating System: iOS\n\nShop at Universe Hub for quality smartphones at competitive prices.\n\n🚚 Islandwide Delivery Available\n💵 Cash on Delivery Available\n📱 Order Yours Today!",
    "specs": {
      "video": "",
      "warranty": "1M Checcking  & 2Y Software",
      "condition": "",
      "stockStatus": "available",
      "colorOptions": [
        "Midnight / Black",
        "Starlight / Silver"
      ],
      "batteryHealth": "Up to 85%",
      "storageOptions": [
        {
          "price": 122000,
          "capacity": "128GB",
          "originalPrice": 125000
        },
        {
          "price": 135000,
          "capacity": "256GB",
          "originalPrice": 137000
        }
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

// Initial Storefront Orders (Production: clean slate, 0 demo orders)
const DEMO_STORE_ORDERS = [];

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
    } catch (e) { }
  }

  // 3. Products schema upgrade & initial load (permanently purge all demo products)
  const SAMPLE_PRODUCT_IDS = [
    'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
    'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
    'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
    'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
    'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case',
    'prod-1794121290955'
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
  } catch (e) { }

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
      // Strictly purge ONLY obsolete sample/demo products from local cache
      const filtered = prods.filter(p => !SAMPLE_PRODUCT_IDS.includes(String(p.id)));
      if (filtered.length !== prods.length) {
        prods = filtered;
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(prods));
      }
    } catch (e) { }
  }

  if (!localStorage.getItem("UH_REVIEWS")) {
    localStorage.setItem("UH_REVIEWS", JSON.stringify(INITIAL_REVIEWS));
  }
  if (!localStorage.getItem("UH_REPAIRS")) {
    localStorage.setItem("UH_REPAIRS", JSON.stringify(DEMO_REPAIR_ORDERS));
  }
  if (!localStorage.getItem("UH_ORDERS")) {
    localStorage.setItem("UH_ORDERS", JSON.stringify([]));
  } else {
    try {
      let curOrd = JSON.parse(localStorage.getItem("UH_ORDERS") || "[]");
      const purgeIds = ["ORD-2308", "ORD-7968", "ORD-9172", "ORD-7711", "ORD-7712", "ORD-4401", "ORD-4402"];
      curOrd = curOrd.filter(o => !purgeIds.includes(String(o.id)) && !purgeIds.includes(String(o.orderNumber)));
      localStorage.setItem("UH_ORDERS", JSON.stringify(curOrd));
    } catch (e) {}
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
  } catch (e) { }

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
  } catch (e) { }

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
  heroBannerImg: "assets/custom_hero_banner.png?v=1",
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
