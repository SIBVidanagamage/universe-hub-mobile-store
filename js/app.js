/**
 * Universe Hub - Main Application Logic
 * Comprehensive Storefront, Cart, Auth, Repair Lab, Review System & Search
 */

// Global Toast System
function showToast(message) {
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

const App = {
  activeCategory: "all",
  activeBrand: "all",
  searchQuery: "",
  currentUser: null,
  pendingCartProdId: null,
  catalogCurrentPage: 0,
  catalogViewMode: "grid",
  storeSettings: null,
  catalogResizeTimer: null,

  getProducts() {
    const isCleanProd = (p) => p && p.id && String(p.id) !== 'prod-anker-maggo-10k' && !String(p.id).startsWith('prod-sample');

    // 1. In-Memory cache is instant priority
    if (typeof window !== "undefined" && Array.isArray(window.UH_PRODUCTS_CACHE) && window.UH_PRODUCTS_CACHE.length > 0) {
      return window.UH_PRODUCTS_CACHE.filter(isCleanProd);
    }

    // 2. Check stored products in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("UH_PRODUCTS"));
      if (Array.isArray(stored) && stored.length > 0) {
        const clean = stored.filter(isCleanProd);
        if (typeof window !== "undefined") window.UH_PRODUCTS_CACHE = clean;
        return clean;
      }
    } catch (e) { }

    // 3. Fallback to bundled products (excluding sample products)
    if (typeof INITIAL_PRODUCTS !== "undefined" && Array.isArray(INITIAL_PRODUCTS) && INITIAL_PRODUCTS.length > 0) {
      const clean = INITIAL_PRODUCTS.filter(isCleanProd);
      if (typeof window !== "undefined") window.UH_PRODUCTS_CACHE = clean;
      return clean;
    }

    return [];
  },

  getBrands() {
    let storedBrands = [];
    try {
      storedBrands = JSON.parse(localStorage.getItem("UH_BRANDS")) || [];
    } catch (e) { storedBrands = []; }

    const initial = (typeof INITIAL_BRANDS !== "undefined" && Array.isArray(INITIAL_BRANDS)) ? INITIAL_BRANDS : [];
    const deletedBrandIds = JSON.parse(localStorage.getItem("UH_DELETED_BRAND_IDS") || "[]");

    const map = new Map();
    // 1. Master initial brands
    initial.forEach(b => {
      if (!deletedBrandIds.includes(String(b.id))) {
        map.set(b.id.toLowerCase(), { ...b });
      }
    });

    // 2. Overlay stored brands (preserves user custom uploaded logos, taglines, toggles)
    storedBrands.forEach(b => {
      if (b && b.id && !deletedBrandIds.includes(String(b.id))) {
        const k = b.id.toLowerCase();
        if (map.has(k)) {
          const existing = map.get(k);
          const hasValidStoredLogo = b.logo && typeof b.logo === "string" && (b.logo.startsWith("data:") || b.logo.startsWith("http") || b.logo.startsWith("assets/"));
          const resolvedLogo = hasValidStoredLogo ? b.logo : existing.logo;
          const resolvedIcon = (b.icon && b.icon !== "🏷️") ? b.icon : (existing.icon || b.icon || "🏷️");
          const resolvedTagline = (b.tagline && b.tagline !== `${b.name} Official Accessories`) ? b.tagline : (existing.tagline || b.tagline);
          map.set(k, {
            ...existing,
            ...b,
            logo: resolvedLogo,
            icon: resolvedIcon,
            tagline: resolvedTagline
          });
        } else {
          map.set(k, { ...b });
        }
      }
    });

    // 3. Dynamic Discovery: If ANY product in the catalog has brand "Anker", Anker is guaranteed to appear!
    const products = this.getProducts();
    products.forEach(p => {
      if (p.brand && typeof p.brand === "string" && p.brand.trim().length > 0) {
        const bName = p.brand.trim();
        const bId = bName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!map.has(bId) && !map.has(bName.toLowerCase())) {
          const initMatch = initial.find(ib => ib.id.toLowerCase() === bId || ib.name.toLowerCase() === bName.toLowerCase());
          map.set(bId, {
            id: bId,
            name: bName,
            icon: initMatch ? initMatch.icon : "🏷️",
            logo: initMatch ? initMatch.logo : null,
            tagline: initMatch ? initMatch.tagline : `${bName} Official Accessories`,
            inNav: true,
            inFilter: true,
            order: map.size + 1
          });
        }
      }
    });

    const result = Array.from(map.values()).sort((a, b) => (a.order || 99) - (b.order || 99));
    try {
      localStorage.setItem("UH_BRANDS", JSON.stringify(result));
    } catch (e) { }
    return result;
  },

  getDefaultCategoryTagline(catId) {
    const id = (catId || '').toLowerCase();
    if (id.includes('power') || id.includes('bank') || id.includes('magsafe-battery')) return '10,000mAh - 20,000mAh Qi2 & MagSafe';
    if (id.includes('charger') || id.includes('gan')) return '65W-100W Anker, Ugreen & Baseus';
    if (id.includes('cable')) return '240W Braided Type-C & Lightning';
    if (id.includes('cover') || id.includes('case')) return 'MagSafe, Spigen & Carbon Fiber';
    if (id.includes('glass') || id.includes('screen')) return '9H Sapphire & Privacy Protectors';
    if (id.includes('camera') || id.includes('lens')) return 'Titanium Individual Lens Rings';
    if (id.includes('audio') || id.includes('airpod')) return 'AirPods Pro, Earphones & Hi-Fi';
    return '100% Genuine & Official Store Warranty';
  },

  isProductInCategory(prod, catId) {
    if (!prod || !catId) return false;
    if (catId === 'all') return true;

    const target = String(catId).toLowerCase().trim();
    const pCat = String(prod.category || '').toLowerCase().trim();
    const pSub = String(prod.subCategory || '').toLowerCase().trim();
    const pMain = String(prod.mainCategory || '').toLowerCase().trim();
    const pName = String(prod.name || prod.title || '').toLowerCase().trim();

    // 1. All iPhones group
    if (target === 'iphones') {
      return pMain === 'iphones' || pCat.includes('iphone') || pName.includes('iphone');
    }

    // 2. Brand New iPhones
    if (target === 'brand-new-iphones' || target === 'brand-new') {
      const isBrandNewCond = prod.condition && prod.condition.toLowerCase().includes('brand new');
      return pCat === 'brand-new-iphones' ||
        (pMain === 'iphones' && isBrandNewCond) ||
        (pCat.includes('iphone') && isBrandNewCond) ||
        (pCat === 'iphones' && isBrandNewCond);
    }

    // 3. Certified Used iPhones
    if (target === 'used-iphones' || target === 'used') {
      const isUsedCond = !prod.condition || !prod.condition.toLowerCase().includes('brand new');
      return pCat === 'used-iphones' ||
        (pMain === 'iphones' && isUsedCond) ||
        (pCat.includes('iphone') && isUsedCond) ||
        (pCat === 'iphones' && isUsedCond);
    }

    // 4. All Accessories group
    if (target === 'accessories') {
      const isPhone = pMain === 'iphones' || pCat === 'brand-new-iphones' || pCat === 'used-iphones' || (pCat.includes('iphone') && !pCat.includes('case') && !pCat.includes('cover') && !pCat.includes('charger'));
      return !isPhone || pMain === 'accessories';
    }

    // 5. Power Banks & MagSafe Battery (universal matching)
    if (target === 'power-banks' || target === 'powerbanks' || target === 'powerbank' || target.includes('power') || target.includes('magsafe-battery')) {
      if (pCat === 'power-banks' || pCat === 'powerbanks' || pCat === 'powerbank' || pCat.includes('power-bank') || pCat.includes('magsafe-battery')) return true;
      if (pSub === 'power-banks' || pSub === 'powerbanks' || pSub.includes('power')) return true;
      if (pName.includes('power bank') || pName.includes('powerbank') || pName.includes('maggo') || pName.includes('battery pack')) return true;
      if (prod.specs && (prod.specs.mah || prod.specs.itemType === 'power-bank')) return true;
      return false;
    }

    // 6. Fast Chargers & GaN
    if (target === 'chargers' || target === 'fast-chargers' || target === 'fast-chargers-gan' || target.includes('charger') || target.includes('gan')) {
      if (pCat === 'chargers' || pCat === 'fast-chargers' || pCat === 'fast-chargers-gan' || pCat.includes('charger') || pCat.includes('gan') || pCat.includes('adapter')) return true;
      if (pSub.includes('charger') || pSub.includes('gan')) return true;
      if (pName.includes('charger') || pName.includes('gan') || pName.includes('adapter') || pName.includes('wall plug')) return true;
      if (prod.specs && (prod.specs.wattage || prod.specs.ports) && !pName.includes('power bank')) return true;
      return false;
    }

    // 7. Charging Cables
    if (target === 'cables' || target === 'charging-cables' || target.includes('cable')) {
      if (pCat === 'cables' || pCat === 'charging-cables' || pCat.includes('cable') || pCat.includes('cord')) return true;
      if (pSub.includes('cable')) return true;
      if (pName.includes('cable') || pName.includes('cord') || pName.includes('type-c to') || pName.includes('lightning to')) return true;
      if (prod.specs && prod.specs.cableLength) return true;
      return false;
    }

    // 8. Back Covers & Cases
    if (target === 'back-covers' || target === 'cases' || target.includes('cover') || target.includes('case')) {
      if (pCat === 'back-covers' || pCat === 'cases' || pCat.includes('cover') || pCat.includes('case')) return true;
      if (pSub.includes('cover') || pSub.includes('case')) return true;
      if (pName.includes('case') || pName.includes('cover') || pName.includes('bumper') || pName.includes('armor')) return true;
      return false;
    }

    // 9. Tempered Glass & Screen Protectors
    if (target === 'tempered-glass' || target === 'tempered-glass-protectors' || target.includes('glass') || target.includes('screen-protector')) {
      if (pCat === 'tempered-glass' || pCat === 'tempered-glass-protectors' || pCat.includes('glass') || pCat.includes('screen')) return true;
      if (pSub.includes('glass') || pSub.includes('screen')) return true;
      if (pName.includes('tempered') || pName.includes('glass') || pName.includes('screen protector') || pName.includes('privacy glass')) return true;
      return false;
    }

    // 10. Camera Lens Protectors
    if (target === 'camera-protectors' || target === 'camera-lens-protectors' || target.includes('camera') || target.includes('lens')) {
      if (pCat === 'camera-protectors' || pCat === 'camera-lens-protectors' || pCat.includes('camera') || pCat.includes('lens')) return true;
      if (pSub.includes('camera') || pSub.includes('lens')) return true;
      if (pName.includes('camera protector') || pName.includes('lens protector') || pName.includes('lens ring') || pName.includes('camera lens')) return true;
      return false;
    }

    // 11. Audio & AirPods
    if (target === 'audio' || target === 'audio-airpods' || target.includes('audio') || target.includes('airpod') || target.includes('earphone')) {
      if (pCat === 'audio' || pCat === 'audio-airpods' || pCat.includes('audio') || pCat.includes('airpod') || pCat.includes('headphone') || pCat.includes('earphone')) return true;
      if (pSub.includes('audio') || pSub.includes('airpod')) return true;
      if (pName.includes('airpod') || pName.includes('earphone') || pName.includes('headphone') || pName.includes('earbud') || pName.includes('audio')) return true;
      if (prod.specs && prod.specs.anc) return true;
      return false;
    }

    // Default exact or slug match
    return pCat === target || pSub === target || pCat.replace(/[^a-z0-9]/g, '') === target.replace(/[^a-z0-9]/g, '');
  },

  getCategories() {
    let storedCategories = [];
    try {
      storedCategories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || [];
    } catch (e) { storedCategories = []; }

    const initial = (typeof INITIAL_CATEGORIES !== "undefined" && Array.isArray(INITIAL_CATEGORIES)) ? INITIAL_CATEGORIES : [];
    const deletedCategoryIds = JSON.parse(localStorage.getItem("UH_DELETED_CATEGORY_IDS") || "[]");

    const map = new Map();
    initial.forEach(c => {
      if (!deletedCategoryIds.includes(String(c.id))) {
        map.set(c.id.toLowerCase(), { ...c });
      }
    });

    storedCategories.forEach(c => {
      if (c && c.id && !deletedCategoryIds.includes(String(c.id))) {
        const rawId = c.id.toLowerCase();
        // Consolidate duplicate slug variants
        const normId = (rawId === 'powerbanks' || rawId === 'power-bank') ? 'power-banks' : rawId;
        const prev = map.get(normId) || {};
        map.set(normId, {
          ...prev,
          ...c,
          id: normId,
          name: (prev.name && prev.name.length >= (c.name || '').length) ? prev.name : c.name,
          tagline: c.tagline || prev.tagline || this.getDefaultCategoryTagline(normId),
          icon: (c.icon && c.icon !== '🏷️') ? c.icon : (prev.icon || c.icon || '🏷️')
        });
      }
    });

    // Dynamic Discovery: Check products for any new custom category
    const products = this.getProducts();
    products.forEach(p => {
      if (p.category && typeof p.category === "string") {
        const raw = p.category.toLowerCase().trim();
        const norm = (raw === 'powerbanks' || raw === 'power-bank' || raw.includes('magsafe-battery')) ? 'power-banks' :
          (raw === 'fast-chargers' || raw === 'fast-chargers-gan' || raw.includes('charger')) ? 'chargers' : raw;
        if (!map.has(norm)) {
          const initMatch = initial.find(ic => ic.id.toLowerCase() === norm);
          map.set(norm, {
            id: norm,
            name: initMatch ? initMatch.name : norm.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
            group: (norm.includes("iphone") ? "iphones" : "accessories"),
            icon: initMatch ? initMatch.icon : "⚡",
            tagline: initMatch ? initMatch.tagline : this.getDefaultCategoryTagline(norm),
            inFilter: true,
            inNav: true,
            order: map.size + 1
          });
        }
      }
    });

    const result = Array.from(map.values()).sort((a, b) => (a.order || 99) - (b.order || 99));
    try {
      localStorage.setItem("UH_CATEGORIES", JSON.stringify(result));
    } catch (e) { }
    return result;
  },

  currentView: 'home',

  init() {
    this.loadUserSession();
    this.applyStoreSettings();

    // Clean out sample products from local storage immediately
    try {
      const stored = JSON.parse(localStorage.getItem("UH_PRODUCTS") || "[]");
      if (Array.isArray(stored)) {
        const cleaned = stored.filter(p => p && p.id && String(p.id) !== 'prod-anker-maggo-10k' && !String(p.id).startsWith('prod-sample'));
        if (cleaned.length !== stored.length) {
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(cleaned));
        }
      }
    } catch (e) { }

    // Async pre-load from IndexedDB if memory cache isn't warm yet
    if (window.UHStorage && typeof window.UHStorage.loadProducts === "function") {
      window.UHStorage.loadProducts().then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          const clean = prods.filter(p => p && p.id && String(p.id) !== 'prod-anker-maggo-10k' && !String(p.id).startsWith('prod-sample'));
          window.UH_PRODUCTS_CACHE = clean;
          this.renderNavbar();
          this.renderCatalogTabs();
          this.renderBrandFilterBar();
          this.renderCategories();
          this.renderBrandsSection();
          this.renderHomeFeatured();
          this.renderCatalog();
          if (typeof window !== "undefined" && window.AdminController) {
            if (typeof window.AdminController.renderStats === "function") window.AdminController.renderStats();
            if (typeof window.AdminController.renderInventoryFilterBar === "function") window.AdminController.renderInventoryFilterBar();
            if (typeof window.AdminController.renderProductsTable === "function") window.AdminController.renderProductsTable();
          }
          if (this.pendingDirectProdId) {
            const targetId = this.pendingDirectProdId;
            const found = clean.find(p => p.id === targetId);
            if (found) {
              this.pendingDirectProdId = null;
              this.openQuickView(targetId);
            }
          }
        }
      });
    }

    this.renderNavbar();
    this.renderCatalogTabs();
    this.renderBrandFilterBar();
    this.renderCategories();
    this.renderBrandsSection();
    this.renderHomeFeatured();
    this.renderCatalog();
    this.renderReviews();
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.bindEvents();
    this.setupRepairEstimator();
    this.initRouter();

    // Fetch fresh cloud products, brands & settings if Supabase is connected
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchBrands === "function") {
      window.SupabaseSync.fetchBrands();
    }
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchProducts === "function") {
      window.SupabaseSync.fetchProducts().then((prods) => {
        if (Array.isArray(prods) && prods.length > 0) {
          const clean = prods.filter(p => p && p.id && String(p.id) !== 'prod-anker-maggo-10k' && !String(p.id).startsWith('prod-sample'));
          window.UH_PRODUCTS_CACHE = clean;
          try { localStorage.setItem("UH_PRODUCTS", JSON.stringify(clean)); } catch (e) { }
          this.renderNavbar();
          this.renderCatalogTabs();
          this.renderBrandFilterBar();
          this.renderCategories();
          this.renderBrandsSection();
          this.renderHomeFeatured();
          this.renderCatalog();
          if (typeof window !== "undefined" && window.AdminController) {
            if (typeof window.AdminController.renderStats === "function") window.AdminController.renderStats();
            if (typeof window.AdminController.renderInventoryFilterBar === "function") window.AdminController.renderInventoryFilterBar();
            if (typeof window.AdminController.renderProductsTable === "function") window.AdminController.renderProductsTable();
          }
          if (this.pendingDirectProdId) {
            const targetId = this.pendingDirectProdId;
            const found = clean.find(p => p.id === targetId);
            if (found) {
              this.pendingDirectProdId = null;
              this.openQuickView(targetId);
            }
          }
        }
      });
    }
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchStoreSettings === "function") {
      window.SupabaseSync.fetchStoreSettings().then((st) => {
        if (st) {
          this.storeSettings = st;
          if (typeof window !== "undefined") window.UH_STORE_SETTINGS_CACHE = st;
          this.applyStoreSettings(st);
          this.updateCategorySliderImages();
        }
      });
    }
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchRegisteredUsers === "function") {
      window.SupabaseSync.fetchRegisteredUsers();
    }
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchOrders === "function") {
      window.SupabaseSync.fetchOrders();
    }

    // If this device has deleted products tracked, purge them from cloud so mobile devices match
    try {
      const localDel = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
      if (localDel && localDel.length > 0 && window.SupabaseSync && typeof window.SupabaseSync.syncLocalCatalogToCloud === "function") {
        window.SupabaseSync.syncLocalCatalogToCloud();
      }
    } catch (e) { }

    // Check if URL has admin hash
    if (window.location.hash === "#admin") {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.toggleAdminView(true);
      } else {
        this.requestAdminAccess();
      }
    }

    // Check if URL has store reviews hash
    if (window.location.hash === "#store-reviews" || window.location.hash === "#reviews") {
      this.openStoreReviewsModal();
    }

    // Initialize Cinematic Scroll Reveal Observer & Interactive Motion Engine
    this.setupScrollObserver();
    this.initInteractiveEffects();
    this.initNavbarScrollEffect();
    this.initHeroScrollIndicator();

    // Responsive recalibration for 5-Item Catalog Slider & Home Featured Grid
    window.addEventListener("resize", () => {
      if (this.catalogResizeTimer) clearTimeout(this.catalogResizeTimer);
      this.catalogResizeTimer = setTimeout(() => {
        this.updateCatalogSliderPosition();
        this.renderHomeFeatured();
      }, 120);
    });
  },

  setupScrollObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    const targetSelectors = [
      '.apple-hero-narrative',
      '.hero-portal-theater',
      '.hero-center-narrative',
      '.hero-portal-display-podium',
      '.hero-narrative-col',
      '.hero-stage-podium',
      '.hero-telemetry-bar',
      '#category-grid-container',
      '#homepage-brands-grid',
      '#catalog-section',
      '#products-catalog-container',
      '.promo-banners-grid',
      '#repair-center',
      '.store-trust-strip-section',
      '.store-location-grid',
      '.trust-footer-bar'
    ];

    targetSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !el.classList.contains('reveal-on-scroll')) {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
      }
    });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  },

  initNavbarScrollEffect() {
    const navbar = document.querySelector('.main-navbar');
    if (!navbar) return;

    const updateNav = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('nav-scrolled');
        navbar.classList.remove('nav-transparent-top');
      } else {
        navbar.classList.remove('nav-scrolled');
        navbar.classList.add('nav-transparent-top');
      }
    };

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  },

  initHeroScrollIndicator() {
    const indicator = document.querySelector('.hero-scroll-indicator');
    if (!indicator) return;

    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector('.category-carousel-section') || document.querySelector('#category-grid-container') || document.querySelector('#catalog-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  },

  // dbrand-Inspired Tactile Motion & 3D Interactive Engine
  initInteractiveEffects() {
    // 1. Interactive 3D Perspective Tilt & Specular Spotlight Glare on Cards
    const tiltTargets = document.querySelectorAll(
      '.product-card:not([data-tilt-active]), .category-bento-tile:not([data-tilt-active]), .category-card:not([data-tilt-active]), .brand-feature-card:not([data-tilt-active]), .promo-card:not([data-tilt-active]), .repair-cap-card:not([data-tilt-active])'
    );

    tiltTargets.forEach(card => {
      card.setAttribute('data-tilt-active', 'true');

      let isHovered = false;
      let rafId = null;
      let targetX = 0;
      let targetY = 0;
      let currX = 0;
      let currY = 0;

      const animate = () => {
        if (!isHovered) return;
        currX += (targetX - currX) * 0.18;
        currY += (targetY - currY) * 0.18;
        card.style.transform = `perspective(1000px) rotateX(${currX.toFixed(2)}deg) rotateY(${currY.toFixed(2)}deg) translateY(-6px) scale3d(1.025, 1.025, 1.025)`;
        rafId = requestAnimationFrame(animate);
      };

      card.addEventListener('mouseenter', () => {
        isHovered = true;
        card.style.setProperty('--glare-opacity', '1');
        rafId = requestAnimationFrame(animate);
      });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        targetX = ((y - centerY) / centerY) * -8.5; // Rotate on X
        targetY = ((x - centerX) / centerX) * 8.5;  // Rotate on Y

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        isHovered = false;
        if (rafId) cancelAnimationFrame(rafId);
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
        card.style.setProperty('--glare-opacity', '0');
        setTimeout(() => {
          if (!isHovered) card.style.transform = '';
        }, 220);
      });
    });

    // 2. Interactive Parallax Tilt on Hero Stage Podium
    const heroPodium = document.querySelector('.hero-portal-display-podium:not([data-tilt-active]), .hero-stage-podium:not([data-tilt-active])');
    if (heroPodium) {
      heroPodium.setAttribute('data-tilt-active', 'true');
      const heroStage = document.querySelector('.cinematic-hero-stage') || heroPodium;
      const portalAura = document.querySelector('.portal-backlight-aura');

      heroStage.addEventListener('mousemove', (e) => {
        const rect = heroPodium.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = Math.max(-5.5, Math.min(5.5, ((y - centerY) / centerY) * -5));
        const tiltY = Math.max(-5.5, Math.min(5.5, ((x - centerX) / centerX) * 5));

        heroPodium.style.transform = `perspective(1200px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;

        const radialLight = heroPodium.querySelector('.stage-radial-light');
        if (radialLight) {
          radialLight.style.transform = `translate(${(-tiltY * 3.5).toFixed(1)}px, ${(-tiltX * 3.5).toFixed(1)}px)`;
        }
        if (portalAura) {
          portalAura.style.transform = `translate(calc(-50% + ${(tiltY * 2).toFixed(1)}px), calc(-50% + ${(tiltX * 2).toFixed(1)}px))`;
        }
      });

      heroStage.addEventListener('mouseleave', () => {
        heroPodium.style.transform = '';
        const radialLight = heroPodium.querySelector('.stage-radial-light');
        if (radialLight) radialLight.style.transform = '';
        if (portalAura) portalAura.style.transform = 'translate(-50%, -50%)';
      });
    }

    // 3. Tactile Magnetic Micro-Interactions on Action Buttons
    const magneticBtns = document.querySelectorAll('.btn-apple-primary, .btn-apple-glass, .btn-hero-dbrand, .btn-hero-glass-dbrand, .btn-hero-portal-primary, .btn-hero-portal-glass, .btn-dbrand-shop-now, .add-to-cart-btn, .promo-btn, .btn-primary-glow');
    magneticBtns.forEach(btn => {
      if (btn.hasAttribute('data-magnetic-active')) return;
      btn.setAttribute('data-magnetic-active', 'true');

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate3d(${(x * 0.22).toFixed(1)}px, ${(y * 0.22).toFixed(1)}px, 0) scale(1.03)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  },

  applyStoreSettings(overrideSettings = null) {
    let settings = typeof DEFAULT_STORE_SETTINGS !== 'undefined' ? { ...DEFAULT_STORE_SETTINGS } : {};
    try {
      const saved = localStorage.getItem("UH_STORE_SETTINGS");
      if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch (e) {
      // keep fallback
    }
    if (this.storeSettings && typeof this.storeSettings === "object") {
      settings = { ...settings, ...this.storeSettings };
    }
    if (typeof window !== "undefined" && window.UH_STORE_SETTINGS_CACHE) {
      settings = { ...settings, ...window.UH_STORE_SETTINGS_CACHE };
    }
    if (overrideSettings && typeof overrideSettings === "object") {
      settings = { ...settings, ...overrideSettings };
      this.storeSettings = settings;
      if (typeof window !== "undefined") window.UH_STORE_SETTINGS_CACHE = settings;
    }

    // 1. Hero Showcase Image & Video Background (Desktop vs Smartphone Dedicated)
    const isMobileDevice = typeof window !== "undefined" && window.innerWidth <= 768;
    const activePoster = (isMobileDevice && settings.heroBannerMobileImg) 
      ? settings.heroBannerMobileImg 
      : (settings.heroBannerImg || "assets/custom_hero_banner.png");
    const activeVideo = (isMobileDevice && settings.heroVideoMobileUrl) 
      ? settings.heroVideoMobileUrl 
      : (settings.heroVideoUrl || "assets/universe_hub_hero_cinematic.mp4");

    const heroImg = document.getElementById("hero-showcase-img");
    if (heroImg && activePoster) {
      heroImg.src = activePoster;
    }
    const bgVideo = document.getElementById("hero-cinematic-video-element") || document.querySelector(".hero-cinematic-bg-video");
    if (bgVideo) {
      if (activePoster) {
        bgVideo.poster = activePoster;
      }
      bgVideo.onerror = () => {
        bgVideo.style.display = "none";
        if (heroImg) heroImg.style.display = "block";
      };

      const rawUrl = activeVideo ? String(activeVideo).trim() : "";
      const vUrl = (rawUrl && !rawUrl.startsWith("blob:")) ? rawUrl : "assets/universe_hub_hero_cinematic.mp4";

      if (vUrl) {
        bgVideo.src = vUrl;
        const mainSrc = document.getElementById("hero-video-source-main");
        const altSrc = document.getElementById("hero-video-source-alt");
        if (mainSrc) mainSrc.src = vUrl;
        if (altSrc) altSrc.src = vUrl;

        bgVideo.style.display = "block";
        bgVideo.muted = true;
        try {
          bgVideo.load();
          const playPromise = bgVideo.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              bgVideo.muted = true;
              bgVideo.play().catch(() => { });
            });
          }
        } catch (e) { }
      } else {
        bgVideo.style.display = "none";
        if (heroImg) heroImg.style.display = "block";
      }
    }

    // Hero Live Copy, Headlines & Description Customization
    const heroEyebrow = document.getElementById("hero-eyebrow-text");
    if (heroEyebrow && settings.heroEyebrow) {
      heroEyebrow.textContent = settings.heroEyebrow;
    }
    const heroTitle1 = document.getElementById("hero-title-line1");
    if (heroTitle1 && settings.heroTitle1) {
      heroTitle1.textContent = settings.heroTitle1;
    }
    const heroTitle2 = document.getElementById("hero-title-line2");
    if (heroTitle2 && settings.heroTitle2) {
      heroTitle2.textContent = settings.heroTitle2;
    }
    const heroDesc = document.getElementById("hero-desc-text");
    if (heroDesc && settings.heroDesc) {
      heroDesc.textContent = settings.heroDesc;
    }
    const heroBtn1 = document.getElementById("hero-btn-primary-text");
    if (heroBtn1 && settings.heroBtnPrimaryText) {
      heroBtn1.textContent = settings.heroBtnPrimaryText;
    }
    const heroBtn2 = document.getElementById("hero-btn-secondary-text");
    if (heroBtn2 && settings.heroBtnSecondaryText) {
      heroBtn2.textContent = settings.heroBtnSecondaryText;
    }

    // 2. Official Logo across site
    const activeLogo = (settings && settings.logoImg && settings.logoImg.includes("universe_hub_logo"))
      ? settings.logoImg
      : "assets/universe_hub_logo.png?v=10";
    document.querySelectorAll(".site-main-logo").forEach(el => {
      el.src = activeLogo;
      el.style.background = "transparent";
      el.style.mixBlendMode = "screen";
    });

    // 3. Top bar Location
    const topBarLoc = document.getElementById("top-bar-location-text");
    if (topBarLoc && settings.locationShort) {
      topBarLoc.textContent = settings.locationShort;
    }

    // 4. Physical Store Section Address
    const storeAddr = document.getElementById("store-display-address");
    if (storeAddr && settings.address) {
      storeAddr.innerHTML = `${settings.address}, Sri Lanka<br><small style="color:var(--text-muted);">(Convenient Main Road Location / Dedicated Parking)</small>`;
    }
    const footerAddr = document.getElementById("footer-display-address");
    if (footerAddr && settings.address) {
      footerAddr.textContent = settings.address;
    }

    // 5. Store Hours
    const storeHours = document.getElementById("store-display-hours");
    if (storeHours && settings.openingHours) {
      storeHours.innerHTML = `${settings.openingHours}<br>Sunday & Poya Days: 10:00 AM – 6:30 PM`;
    }
    const footerHours = document.getElementById("footer-display-hours");
    if (footerHours && settings.openingHours) {
      footerHours.textContent = settings.openingHours;
    }

    // 6. Phone & WhatsApp
    const storePhone = document.getElementById("store-display-phone");
    if (storePhone && settings.phone) {
      storePhone.textContent = settings.phone;
    }
    const footerPhone = document.getElementById("footer-display-phone");
    if (footerPhone && settings.phone) {
      footerPhone.textContent = settings.phone;
    }

    if (settings.whatsappLink) {
      const waBtn = document.getElementById("store-display-whatsapp-btn");
      if (waBtn) waBtn.href = settings.whatsappLink;
      const aboutWaBtn = document.getElementById("about-display-whatsapp-link");
      if (aboutWaBtn) {
        aboutWaBtn.href = settings.whatsappLink;
        aboutWaBtn.innerHTML = `💬 WhatsApp ${settings.whatsapp || settings.phone || '074-0219239'}`;
      }
    }

    // 6.1 Store Official Email
    const activeEmail = settings.email || "contact@universehub.store";
    const storeEmail = document.getElementById("store-display-email");
    if (storeEmail) {
      storeEmail.textContent = activeEmail;
    }
    const storeEmailLink = document.getElementById("store-display-email-link");
    if (storeEmailLink) {
      storeEmailLink.href = `mailto:${activeEmail}`;
    }
    const footerEmail = document.getElementById("footer-display-email");
    if (footerEmail) {
      footerEmail.textContent = activeEmail;
    }
    const footerEmailLink = document.getElementById("footer-display-email-link");
    if (footerEmailLink) {
      footerEmailLink.href = `mailto:${activeEmail}`;
    }

    // 7. Google Maps Location URL
    if (settings.googleMapsUrl) {
      const mapBtn = document.getElementById("store-google-maps-btn");
      if (mapBtn) mapBtn.href = settings.googleMapsUrl;
      const topMapLink = document.getElementById("top-store-location-link");
      if (topMapLink) topMapLink.href = settings.googleMapsUrl;
      const footerMapLink = document.getElementById("footer-store-location-link");
      if (footerMapLink) footerMapLink.href = settings.googleMapsUrl;
    }

    // 8. About Modal Dynamic Content
    if (settings.aboutHeading) {
      const aboutH = document.getElementById("about-display-heading");
      if (aboutH) aboutH.textContent = settings.aboutHeading;
    }
    if (settings.aboutStory) {
      const aboutS = document.getElementById("about-display-story");
      if (aboutS) aboutS.textContent = settings.aboutStory;
    }
    if (settings.aboutMission) {
      const aboutM = document.getElementById("about-display-mission");
      if (aboutM) aboutM.textContent = settings.aboutMission;
    }
    const aboutSub = document.getElementById("about-display-subtext");
    if (aboutSub) {
      aboutSub.textContent = `${settings.address || '188/8c, High Level Road, Maharagama'} • ${settings.openingHours || 'Open Daily 9:30 AM – 8:30 PM'}`;
    }

    // 9. Dual Promo Banners (Cases & Chargers)
    const promoCard1 = document.getElementById("promo-banner-1");
    if (promoCard1 && settings.promoBanner1Img) {
      promoCard1.style.backgroundImage = `url('${settings.promoBanner1Img}')`;
    }
    const promo1Title = document.getElementById("promo-1-title");
    if (promo1Title && settings.promoBanner1Title) {
      promo1Title.textContent = settings.promoBanner1Title;
    }
    const promo1Desc = document.getElementById("promo-1-desc");
    if (promo1Desc && settings.promoBanner1Desc) {
      promo1Desc.textContent = settings.promoBanner1Desc;
    }
    const promo1BtnText = document.getElementById("promo-1-btn-text");
    if (promo1BtnText && settings.promoBanner1BtnText) {
      promo1BtnText.textContent = settings.promoBanner1BtnText;
    }
    const promo1Btn = document.getElementById("promo-1-btn");
    if (promo1Btn && settings.promoBanner1Category) {
      promo1Btn.onclick = () => App.filterByCategory(settings.promoBanner1Category);
    }

    const promoCard2 = document.getElementById("promo-banner-2");
    if (promoCard2 && settings.promoBanner2Img) {
      promoCard2.style.backgroundImage = `url('${settings.promoBanner2Img}')`;
    }
    const promo2Title = document.getElementById("promo-2-title");
    if (promo2Title && settings.promoBanner2Title) {
      promo2Title.textContent = settings.promoBanner2Title;
    }
    const promo2Desc = document.getElementById("promo-2-desc");
    if (promo2Desc && settings.promoBanner2Desc) {
      promo2Desc.textContent = settings.promoBanner2Desc;
    }
    const promo2BtnText = document.getElementById("promo-2-btn-text");
    if (promo2BtnText && settings.promoBanner2BtnText) {
      promo2BtnText.textContent = settings.promoBanner2BtnText;
    }
    const promo2Btn = document.getElementById("promo-2-btn");
    if (promo2Btn && settings.promoBanner2Category) {
      promo2Btn.onclick = () => App.filterByCategory(settings.promoBanner2Category);
    }

    // 10. Live sync Category Showcase Slider images across all devices
    this.updateCategorySliderImages();
  },

  updateCategorySliderImages() {
    const slides = document.querySelectorAll(".dbrand-carousel-slide");
    if (slides && slides.length > 0) {
      slides.forEach(slide => {
        const catId = slide.dataset.id;
        const img = slide.querySelector(".dbrand-slide-img");
        if (catId && img) {
          const newImg = this.getCategorySliderImage(catId);
          if (newImg && img.src !== newImg) {
            img.src = newImg;
          }
        }
      });
    } else if (typeof this.renderCategories === "function") {
      this.renderCategories();
    }
  },

  openAboutModal() {
    this.applyStoreSettings();
    this.openModal("about-modal");
  },

  closeAboutModal() {
    this.closeModal("about-modal");
  },

  loadUserSession() {
    const savedUser = localStorage.getItem("UH_AUTH_USER");
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.updateAuthUI();
      } catch (e) {
        this.currentUser = null;
      }
    }
  },

  updateAuthUI() {
    const authBtn = document.getElementById("nav-auth-btn");
    const adminPill = document.getElementById("top-admin-shortcut");
    const adminDivider = document.getElementById("top-admin-divider");

    if (this.currentUser) {
      const isAdmin = this.currentUser.role === "admin";
      if (authBtn) {
        authBtn.innerHTML = `
          <div class="user-avatar" style="${isAdmin ? 'background:linear-gradient(135deg,var(--neon-purple),var(--neon-cyan));' : ''}">
            ${isAdmin ? '🛡️' : this.currentUser.name.charAt(0).toUpperCase()}
          </div>
          <span>${isAdmin ? 'Store Admin' : this.currentUser.name.split(" ")[0]}</span>
          <small style="color:var(--text-muted); cursor:pointer; margin-left:6px;" onclick="event.stopPropagation(); App.logout();" title="Sign Out">✕</small>
        `;
      }
      if (adminPill) {
        adminPill.style.display = isAdmin ? "inline-flex" : "none";
      }
      if (adminDivider) {
        adminDivider.style.display = isAdmin ? "inline" : "none";
      }
    } else {
      if (authBtn) {
        authBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Login</span>
        `;
      }
      if (adminPill) {
        adminPill.style.display = "none";
      }
      if (adminDivider) {
        adminDivider.style.display = "none";
      }
    }
  },

  // --- Admin Access Request Helper ---
  requestAdminAccess() {
    if (this.currentUser && this.currentUser.role === "admin") {
      this.toggleAdminView(true);
    } else {
      this.openCustomerAuthModal();
    }
  },

  // --- Customer Authentication & Account Tabs ---
  switchCustomerAuthTab(tab) {
    const signinForm = document.getElementById("customer-signin-form");
    const registerForm = document.getElementById("customer-register-form");
    const btnSignin = document.getElementById("tab-btn-signin");
    const btnReg = document.getElementById("tab-btn-register");
    const title = document.getElementById("auth-modal-title");
    const errSign = document.getElementById("signin-error-msg");
    const errReg = document.getElementById("register-error-msg");

    if (errSign) errSign.style.display = "none";
    if (errReg) errReg.style.display = "none";

    if (tab === "signin") {
      if (signinForm) signinForm.style.display = "block";
      if (registerForm) registerForm.style.display = "none";
      if (btnSignin) btnSignin.classList.add("active");
      if (btnReg) btnReg.classList.remove("active");
      if (title) title.textContent = "Customer Sign In";
    } else {
      if (signinForm) signinForm.style.display = "none";
      if (registerForm) registerForm.style.display = "block";
      if (btnSignin) btnSignin.classList.remove("active");
      if (btnReg) btnReg.classList.add("active");
      if (title) title.textContent = "Create Customer Account";
    }
  },

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  },

  openCustomerAuthModal(customNotice = null) {
    const notice = document.getElementById("auth-cart-notice");
    const noticeText = document.getElementById("auth-cart-notice-text");
    if (customNotice) {
      if (noticeText) noticeText.textContent = customNotice;
      if (notice) notice.style.display = "block";
    } else {
      if (notice) notice.style.display = "none";
    }
    this.switchCustomerAuthTab("signin");
    this.openModal("auth-modal");
  },

  handleCustomerLogin() {
    const email = (document.getElementById("auth-signin-email")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("auth-signin-password")?.value || "").trim();
    const errBanner = document.getElementById("signin-error-msg");
    const modalBox = document.getElementById("auth-modal-box");

    if (!email || !password) {
      if (errBanner) {
        errBanner.textContent = "Please enter your email and password.";
        errBanner.style.display = "block";
      }
      return;
    }

    // 1. Check if Admin credentials are provided in standard login form
    let adminCfg = typeof DEFAULT_ADMIN_CONFIG !== 'undefined'
      ? DEFAULT_ADMIN_CONFIG
      : { email: "shashikaisuranga143@gmail.com", password: "Kumudinikumari@0709", name: "Store Administrator" };
    try {
      const savedAdmin = localStorage.getItem("UH_ADMIN_CONFIG");
      if (savedAdmin) adminCfg = { ...adminCfg, ...JSON.parse(savedAdmin) };
    } catch (e) { }

    // Strictly block generic demo emails and passwords so nobody can guess them
    const blockedEmails = ["admin@universehub.store", "admin@universehub.lk", "admin"];
    const blockedPasswords = ["admin", "admin123"];

    const isAuthorizedAdminEmail = !blockedEmails.includes(email) &&
      (email === "shashikaisuranga143@gmail.com" || email === (adminCfg.email || "").toLowerCase());

    const isAuthorizedAdminPassword = !blockedPasswords.includes(password) &&
      (password === "Kumudinikumari@0709" || password === adminCfg.password);

    if (isAuthorizedAdminEmail && isAuthorizedAdminPassword) {
      if (errBanner) errBanner.style.display = "none";
      this.closeModal("auth-modal");
      this.login(email, "admin", adminCfg.name || "Store Administrator (Shashika)");
      this.toggleAdminView(true);
      showToast("⚡ Welcome, Store Administrator! Accessing Admin Center...");
      return;
    }

    // 2. Check Customer / Registered Users
    let users = JSON.parse(localStorage.getItem("UH_USERS")) || (typeof INITIAL_USERS !== 'undefined' ? INITIAL_USERS : []);
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (user) {
      if (errBanner) errBanner.style.display = "none";
      if (user.role === "admin") {
        this.closeModal("auth-modal");
        this.login(user.email, "admin", user.name || "Store Administrator");
        this.toggleAdminView(true);
        showToast("⚡ Welcome, Store Administrator! Accessing Admin Center...");
      } else {
        this.onCustomerAuthSuccess(user);
      }
      return;
    }

    // 3. Neither admin nor customer matched
    if (errBanner) {
      errBanner.textContent = "❌ Invalid email or password. Please verify your credentials or create an account.";
      errBanner.style.display = "block";
    }
    if (modalBox) {
      modalBox.classList.remove("auth-shake");
      void modalBox.offsetWidth;
      modalBox.classList.add("auth-shake");
    }
  },

  handleCustomerRegister() {
    const name = (document.getElementById("auth-reg-name")?.value || "").trim();
    const phone = (document.getElementById("auth-reg-phone")?.value || "").trim();
    const email = (document.getElementById("auth-reg-email")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("auth-reg-password")?.value || "").trim();
    const errBanner = document.getElementById("register-error-msg");
    const modalBox = document.getElementById("auth-modal-box");

    if (!name || !phone || !email || !password) {
      if (errBanner) {
        errBanner.textContent = "Please fill in all registration fields.";
        errBanner.style.display = "block";
      }
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 9 || cleanDigits.length > 12) {
      if (errBanner) {
        errBanner.textContent = "Please enter a valid active WhatsApp number (e.g. 0771234567 or 0740219239).";
        errBanner.style.display = "block";
      }
      return;
    }

    let users = JSON.parse(localStorage.getItem("UH_USERS")) || (typeof INITIAL_USERS !== 'undefined' ? INITIAL_USERS : []);
    if (users.some(u => u.email.toLowerCase() === email)) {
      if (errBanner) {
        errBanner.textContent = "An account with this email address already exists. Please sign in.";
        errBanner.style.display = "block";
      }
      return;
    }

    const newUser = {
      id: "usr-" + Date.now(),
      name,
      phone,
      email,
      password,
      role: "customer"
    };

    users.push(newUser);
    localStorage.setItem("UH_USERS", JSON.stringify(users));
    if (window.SupabaseSync && typeof window.SupabaseSync.saveRegisteredUsers === "function") {
      window.SupabaseSync.saveRegisteredUsers(users);
    }

    if (errBanner) errBanner.style.display = "none";
    this.onCustomerAuthSuccess(newUser);
  },

  quickDemoCustomerLogin() {
    showToast("Demo sign-in disabled in production. Please enter your email and password.");
  },

  quickDemoAdminLogin() {
    showToast("Please enter official Store Administrator credentials.");
  },

  onCustomerAuthSuccess(user) {
    this.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role || "customer"
    };
    localStorage.setItem("UH_AUTH_USER", JSON.stringify(this.currentUser));
    this.updateAuthUI();
    this.closeModal("auth-modal");
    showToast(`Welcome, ${this.currentUser.name}! You are now signed in.`);

    // If an item addition was waiting for customer login, add it now!
    if (this.pendingCartProdId) {
      const prodId = this.pendingCartProdId;
      this.pendingCartProdId = null;
      const products = this.getProducts();
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        this.executeAddToCart(prod);
        this.openCart();
      }
    }
  },

  login(email, role = "customer", name = "Valued Customer") {
    this.currentUser = { email, role, name };
    localStorage.setItem("UH_AUTH_USER", JSON.stringify(this.currentUser));
    this.updateAuthUI();
    this.closeModal("auth-modal");
    this.closeModal("admin-auth-modal");
    showToast(`Welcome back, ${name}! Logged in as ${role === 'admin' ? 'Store Administrator' : 'Customer'}.`);

    if (role === "admin") {
      this.toggleAdminView(true);
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem("UH_AUTH_USER");
    this.updateAuthUI();
    this.toggleAdminView(false);
    showToast("You have been signed out.");
  },

  toggleAdminView(showAdmin) {
    const storeView = document.getElementById("storefront-view");
    const adminView = document.getElementById("admin-view");

    if (showAdmin) {
      if (storeView) storeView.style.display = "none";
      if (adminView) {
        adminView.style.display = "block";
        adminView.classList.add("active");
        AdminController.init();
      }
      window.location.hash = "#admin";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      if (storeView) storeView.style.display = "block";
      if (adminView) {
        adminView.style.display = "none";
        adminView.classList.remove("active");
      }
      if (this.currentView === 'shop') {
        this.navigateToShop(this.activeCategory, this.activeBrand, false);
      } else {
        this.navigateToHome(false);
      }
    }
  },

  navigateToShop(catId = 'all', brandId = 'all', pushHash = true) {
    this.currentView = 'shop';
    this.catalogViewMode = 'grid';
    this.catalogCurrentPage = 0;
    const homeSections = document.getElementById("home-view-sections");
    const storeView = document.getElementById("dedicated-store-view");
    const adminView = document.getElementById("admin-view");

    if (adminView) {
      adminView.style.display = "none";
      adminView.classList.remove("active");
    }
    if (homeSections) homeSections.style.display = "none";
    if (storeView) storeView.style.display = "block";

    this.activeCategory = catId || 'all';
    this.activeBrand = brandId || 'all';

    // Update active tab in store catalog
    document.querySelectorAll(".catalog-tabs-bar .tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.cat === this.activeCategory);
    });

    // Update breadcrumb and header title
    const categories = this.getCategories();
    const matchedCat = categories.find(c => c.id === this.activeCategory);
    const catName = (this.activeCategory === 'all' || !matchedCat) ? 'All Products' : matchedCat.name;

    const crumbEl = document.getElementById("store-crumb-active-cat");
    if (crumbEl) crumbEl.textContent = catName;

    const headerBadge = document.getElementById("store-header-badge");
    if (headerBadge) {
      headerBadge.textContent = this.activeCategory === 'all' ? "⚡ OFFICIAL UNIVERSE HUB STORE" : `⚡ ${catName.toUpperCase()}`;
    }

    const headerTitle = document.getElementById("store-header-title");
    if (headerTitle) {
      headerTitle.textContent = this.activeCategory === 'all' ? "All Products & Accessories" : catName;
    }

    const headerDesc = document.getElementById("store-header-desc");
    if (headerDesc) {
      if (matchedCat && matchedCat.tagline) {
        headerDesc.textContent = matchedCat.tagline;
      } else {
        headerDesc.textContent = "Explore our verified collection of authentic smartphones and premium accessories with store warranty.";
      }
    }

    this.renderCatalogTabs();
    this.renderBrandFilterBar();
    this.renderCatalog();

    if (pushHash) {
      const targetHash = (this.activeCategory && this.activeCategory !== 'all') ? `#shop?cat=${this.activeCategory}` : '#shop';
      if (window.location.hash !== targetHash) {
        try { window.history.pushState(null, '', targetHash); } catch(e) { window.location.hash = targetHash; }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  navigateToHome(pushHash = true) {
    this.currentView = 'home';
    const homeSections = document.getElementById("home-view-sections");
    const storeView = document.getElementById("dedicated-store-view");
    const adminView = document.getElementById("admin-view");

    if (adminView) {
      adminView.style.display = "none";
      adminView.classList.remove("active");
    }
    if (storeView) storeView.style.display = "none";
    if (homeSections) homeSections.style.display = "block";

    this.renderHomeFeatured();

    if (pushHash) {
      if (window.location.hash && window.location.hash !== '#' && window.location.hash !== '#home') {
        try { window.history.pushState(null, '', '#home'); } catch(e) { window.location.hash = '#home'; }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  getDirectProductParam() {
    try {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get('prod');
      if (qp && qp.trim()) return qp.trim();
    } catch (e) {}

    const hash = window.location.hash || '';
    if (hash.includes('prod=')) {
      const match = hash.match(/prod=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1].trim();
    }
    return null;
  },

  initRouter() {
    const handleRoute = () => {
      const hash = window.location.hash || '';
      if (hash === '#admin') {
        this.toggleAdminView(true);
        return;
      }

      // Meta Pixel PageView Hook (Deduplicated & Filtered by Route Allowlist)
      if (typeof window !== 'undefined' && window.MetaPixel && typeof window.MetaPixel.trackPageView === 'function') {
        window.MetaPixel.trackPageView(hash || '#home');
      }

      if (hash.startsWith('#shop') || hash.startsWith('#catalog')) {
        let targetCat = 'all';
        if (hash.includes('cat=')) {
          const match = hash.match(/cat=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) targetCat = match[1];
        }
        this.navigateToShop(targetCat, 'all', false);
      } else if (!hash || hash === '#' || hash === '#home') {
        const hasDirectProd = (window.location.search && window.location.search.includes('prod='));
        if (this.currentView !== 'home' && !hasDirectProd) {
          this.navigateToHome(false);
        }
      }

      // Check for direct product deep link via query string (?prod=...) or hash (#shop?prod=...)
      const directProdId = this.getDirectProductParam();
      if (directProdId) {
        const qv = document.getElementById("quickview-modal");
        const isAlreadyOpen = qv && qv.classList.contains("active") && this.quickViewCurrentProdId === directProdId;
        if (!isAlreadyOpen) {
          const products = this.getProducts();
          const prod = Array.isArray(products) ? products.find(p => p.id === directProdId) : null;
          if (prod) {
            this.openQuickView(directProdId);
          } else {
            this.pendingDirectProdId = directProdId;
          }
        }
      }
    };

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', (e) => {
      const qv = document.getElementById("quickview-modal");
      if (qv && qv.classList.contains("active")) {
        this.closeModal("quickview-modal");
      }
    });

    handleRoute();
  },

  renderHomeFeatured() {
    const container = document.getElementById("home-featured-products-container");
    if (!container) return;

    const products = this.getProducts();
    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color:var(--text-secondary);">Loading featured products...</div>`;
      return;
    }

    // On mobile screens, show 2 products (1 clean row, exactly matching screenshot 1).
    // On wider screens (laptop/desktop), show 4 products (1 clean row of 4).
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 680;
    const limit = isMobile ? 2 : 4;
    const featuredList = products.slice(0, limit);
    const wishlist = JSON.parse(localStorage.getItem("UH_WISHLIST")) || [];
    const allBrands = this.getBrands();

    container.innerHTML = featuredList.map(prod => this.renderProductCard(prod, wishlist, allBrands)).join("");
    this.initInteractiveEffects();
  },

  bindEvents() {
    // Category Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.activeCategory = e.currentTarget.dataset.cat;
        this.renderCatalog();
      });
    });

    // Real-time Search input
    const searchInput = document.getElementById("main-search-input");
    const searchDropdown = document.getElementById("search-dropdown-results");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const val = e.target.value.trim().toLowerCase();
        this.handleSearchSuggestions(val, searchDropdown);
      });

      // Hide dropdown on blur
      document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
          searchDropdown.classList.remove("active");
        }
      });
    }

    // Cart Drawer Open/Close
    const cartToggleBtn = document.getElementById("nav-cart-btn");
    const closeCartBtn = document.getElementById("close-cart-btn");
    const cartOverlay = document.getElementById("cart-drawer-overlay");

    if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => this.openCart());
    if (closeCartBtn) closeCartBtn.addEventListener("click", () => this.closeCart());
    if (cartOverlay) cartOverlay.addEventListener("click", () => this.closeCart());

    // Auth Modal Open
    const authBtn = document.getElementById("nav-auth-btn");
    if (authBtn) {
      authBtn.addEventListener("click", () => {
        if (!this.currentUser) {
          this.openCustomerAuthModal();
        } else if (this.currentUser.role === "admin") {
          this.toggleAdminView(true);
        } else {
          if (typeof InvoiceService !== 'undefined') {
            InvoiceService.showCustomerOrders();
          } else {
            showToast(`Logged in as ${this.currentUser.name}`);
          }
        }
      });
    }

    // Modal Close buttons
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const modalId = e.currentTarget.dataset.close;
        if (modalId) this.closeModal(modalId);
      });
    });

    // Click outside modal to close
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.remove("active");
        }
      });
    });

    // Repair Tracking Form Submit
    const trackForm = document.getElementById("repair-track-form");
    if (trackForm) {
      trackForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleTrackRepair();
      });
    }

    // Submit Customer Store Review
    const reviewForm = document.getElementById("store-review-form");
    if (reviewForm) {
      reviewForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmitStoreReview();
      });
    }

    // Star Rating Click in Review Modal
    document.querySelectorAll(".modal-star-pick").forEach(star => {
      star.addEventListener("click", (e) => {
        const val = parseInt(e.currentTarget.dataset.val, 10);
        document.getElementById("review-input-rating").value = val;
        document.querySelectorAll(".modal-star-pick").forEach(s => {
          const sVal = parseInt(s.dataset.val, 10);
          s.style.color = sVal <= val ? "var(--warning)" : "var(--text-muted)";
        });
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  },

  // 1. Dynamic Sub-Navbar Rendering with Smart Dropdown Mega-Menus
  renderNavbar() {
    const navUl = document.getElementById("sub-navbar-links");
    if (!navUl) return;

    const categories = this.getCategories();
    const brands = this.getBrands();
    const products = this.getProducts();

    // Filter active brands for Navbar
    const navBrands = brands.filter(b => b.inNav !== false);

    // Count products per brand
    const getBrandCount = (brandName, brandId) => {
      const bName = (brandName || '').toLowerCase();
      const bId = (brandId || '').toLowerCase();
      return products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === bName || pb === bId;
      }).length;
    };

    const accessoryCategories = categories.filter(c => c && c.group === 'accessories' && c.inNav !== false);

    const isHomeActive = this.activeCategory === 'all' && this.activeBrand === 'all';
    const isIphoneActive = this.activeCategory === 'iphones' || this.activeCategory === 'brand-new-iphones' || this.activeCategory === 'used-iphones';
    const isAccessoryActive = this.activeCategory === 'accessories' || (this.activeCategory !== 'all' && !isIphoneActive);
    const isBrandActive = this.activeBrand !== 'all';

    let html = `
      <!-- 1. Home Link -->
      <li>
        <a href="#" class="${isHomeActive ? 'active' : ''}" onclick="App.filterByCategory('all'); App.filterByBrand('all'); return false;">
          <span>Home</span>
        </a>
      </li>

      <!-- 2. iPhones Dropdown -->
      <li class="nav-dropdown-item">
        <a href="#catalog-section" class="nav-dropdown-trigger ${isIphoneActive ? 'active' : ''}" onclick="App.filterByCategory('iphones'); return false;">
          <span>📱 iPhones</span>
          <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="nav-dropdown-menu">
          <div class="dropdown-header">APPLE IPHONE COLLECTION</div>
          <a href="#catalog-section" class="dropdown-link ${this.activeCategory === 'brand-new-iphones' ? 'active' : ''}" onclick="App.filterByCategory('brand-new-iphones')">
            <span class="dropdown-link-icon">🍏</span>
            <div class="dropdown-link-text">
              <strong>Brand New iPhones</strong>
              <small>Sealed Box with Apple Care Official</small>
            </div>
            <span class="dropdown-badge-count">${products.filter(p => this.isProductInCategory(p, 'brand-new-iphones')).length}</span>
          </a>
          <a href="#catalog-section" class="dropdown-link ${this.activeCategory === 'used-iphones' ? 'active' : ''}" onclick="App.filterByCategory('used-iphones')">
            <span class="dropdown-link-icon">🔄</span>
            <div class="dropdown-link-text">
              <strong>Certified Pre-Owned iPhones</strong>
              <small>Tested Grade A+ with Store Warranty</small>
            </div>
            <span class="dropdown-badge-count">${products.filter(p => this.isProductInCategory(p, 'used-iphones')).length}</span>
          </a>
          <div class="dropdown-divider"></div>
          <a href="#catalog-section" class="dropdown-footer-link" onclick="App.filterByCategory('iphones')">
            <span>View All iPhones & Models (${products.filter(p => this.isProductInCategory(p, 'iphones')).length}) →</span>
          </a>
        </div>
      </li>

      <!-- 3. Accessories Dropdown (Dynamic from Categories) -->
      <li class="nav-dropdown-item">
        <a href="#catalog-section" class="nav-dropdown-trigger ${isAccessoryActive ? 'active' : ''}" onclick="App.filterByCategory('accessories'); return false;">
          <span>⚡ Accessories</span>
          <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="nav-dropdown-menu dropdown-menu-wide">
          <div class="dropdown-header">BROWSE ACCESSORIES BY TYPE</div>
          <div class="dropdown-grid-2col">
            ${accessoryCategories.map(cat => {
      const safeIcon = this.getSafeCategoryIcon(cat);
      const count = products.filter(p => this.isProductInCategory(p, cat.id)).length;
      const subText = cat.tagline || this.getDefaultCategoryTagline(cat.id);
      const isCatActive = this.activeCategory.toLowerCase() === cat.id.toLowerCase();
      return `
                <a href="#catalog-section" class="dropdown-link ${isCatActive ? 'active' : ''}" onclick="App.filterByCategory('${cat.id}')">
                  <span class="dropdown-link-icon">${safeIcon}</span>
                  <div class="dropdown-link-text">
                    <strong>${cat.name}</strong>
                    <small>${subText}</small>
                  </div>
                  <span class="dropdown-badge-count">${count}</span>
                </a>
              `;
    }).join('')}
          </div>
          <div class="dropdown-divider"></div>
          <a href="#catalog-section" class="dropdown-footer-link" onclick="App.filterByCategory('accessories')">
            <span>Explore All 100% Genuine Accessories (${products.filter(p => this.isProductInCategory(p, 'accessories')).length}) →</span>
          </a>
        </div>
      </li>

      <!-- 4. Shop by Brand Dropdown (Anker, Baseus, Ugreen, WiWU, Asper, Spigen, etc.) -->
      <li class="nav-dropdown-item">
        <a href="#catalog-section" class="nav-dropdown-trigger brand-nav-trigger ${isBrandActive ? 'active' : ''}">
          <span style="color:var(--neon-cyan);">🏷️ Shop by Brand</span>
          <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="nav-dropdown-menu dropdown-menu-brands">
          <div class="dropdown-header">OFFICIAL ACCESSORY BRANDS</div>
          <div class="dropdown-grid-brands">
            ${navBrands.map(b => {
      const count = getBrandCount(b.name, b.id);
      const hasLogo = b.logo && typeof b.logo === 'string' && (b.logo.startsWith('http') || b.logo.startsWith('data:') || b.logo.startsWith('assets/'));
      return `
                <a href="#catalog-section" class="dropdown-brand-card" onclick="App.filterByBrand('${b.id}')">
                  <div class="brand-card-top">
                    ${hasLogo
          ? `<img src="${b.logo}" alt="${b.name}" class="dropdown-brand-logo" style="width:24px; height:24px; object-fit:contain; border-radius:4px;">`
          : `<span class="brand-emoji">${b.icon || '🏷️'}</span>`
        }
                    <span class="brand-name-tag">${b.name}</span>
                  </div>
                  <div class="brand-tagline-text">${b.tagline || 'Original Tech'}</div>
                  <div class="brand-stock-pill">${count} Item${count !== 1 ? 's' : ''}</div>
                </a>
              `;
    }).join('')}
          </div>
          <div class="dropdown-divider"></div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 14px;">
            <a href="#catalog-section" class="dropdown-footer-link" onclick="App.filterByBrand('all')">
              <span>Show All Brands</span>
            </a>
            <span style="font-size:11px; color:var(--text-muted);">✓ 100% Guaranteed Genuine</span>
          </div>
        </div>
      </li>

      <!-- 5. Store Sections Links -->
      <li><a href="#repair-center" class="nav-pill-highlight">🔧 Mobile Repair Lab</a></li>
      <li><a href="javascript:void(0)" onclick="App.openStoreReviewsModal()">⭐ Store Reviews (4.9★)</a></li>
      <li><a href="#store-location">📍 Physical Shop</a></li>
    `;

    navUl.innerHTML = html;
  },

  // 2. Dynamic Catalog Tabs Bar (Categories)
  renderCatalogTabs() {
    const tabsBar = document.getElementById("catalog-tabs-bar");
    if (!tabsBar) return;

    const categories = this.getCategories();
    const filterCategories = categories.filter(c => c.inFilter !== false);

    let html = `<button class="tab-btn ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all" onclick="App.filterByCategory('all')">🌟 All Categories</button>`;

    filterCategories.forEach(cat => {
      const isActive = this.activeCategory === cat.id;
      const safeIcon = this.getSafeCategoryIcon(cat);
      html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-cat="${cat.id}" onclick="App.filterByCategory('${cat.id}')">${safeIcon} ${cat.name}</button>`;
    });

    tabsBar.innerHTML = html;
  },

  // 3. Dynamic Brand Filter Pills Bar in Catalog
  renderBrandFilterBar() {
    const bar = document.getElementById("catalog-brand-filter-bar");
    if (!bar) return;

    const brands = this.getBrands();
    const filterBrands = brands.filter(b => b.inFilter !== false);
    const products = this.getProducts();

    const getCount = (bName, bId) => {
      return products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        const brandMatches = pb === bName.toLowerCase() || pb === bId.toLowerCase();
        if (!brandMatches) return false;
        if (this.activeCategory !== 'all') {
          return this.isProductInCategory(p, this.activeCategory);
        }
        return true;
      }).length;
    };

    let html = `
      <div class="brand-filter-pill-wrap">
        <span class="brand-filter-title">🏷️ Filter by Brand:</span>
        <button class="brand-filter-pill ${this.activeBrand === 'all' ? 'active' : ''}" onclick="App.filterByBrand('all')">
          <span>🌟 All Brands</span>
        </button>
        ${filterBrands.map(b => {
      const isSel = this.activeBrand.toLowerCase() === b.id.toLowerCase() || this.activeBrand.toLowerCase() === b.name.toLowerCase();
      const count = getCount(b.name, b.id);
      const hasLogo = b.logo && typeof b.logo === 'string' && (b.logo.startsWith('http') || b.logo.startsWith('data:') || b.logo.startsWith('assets/'));
      return `
            <button class="brand-filter-pill ${isSel ? 'active' : ''}" onclick="App.filterByBrand('${b.id}')">
              ${hasLogo
          ? `<img src="${b.logo}" alt="${b.name}" style="width:16px; height:16px; object-fit:contain; border-radius:3px; vertical-align:middle; margin-right:5px;">`
          : `<span style="margin-right:4px;">${b.icon || '🏷️'}</span>`
        }
              <span>${b.name}</span>
              <span class="brand-pill-count">${count}</span>
            </button>
          `;
    }).join('')}
      </div>
    `;

    bar.innerHTML = html;
  },

  // 4. Categories Showcase on Homepage (Full-Width dbrand Style Auto-Slider)
  currentCatSlide: 0,
  catSlideTimer: null,

  getCategorySliderImage(catId) {
    let settings = this.storeSettings;
    if (!settings || !settings.categorySliderImages) {
      if (typeof window !== "undefined" && window.UH_STORE_SETTINGS_CACHE && window.UH_STORE_SETTINGS_CACHE.categorySliderImages) {
        settings = window.UH_STORE_SETTINGS_CACHE;
      }
    }
    if (!settings || !settings.categorySliderImages) {
      try {
        settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || {};
      } catch (e) { settings = {}; }
    }

    const val = (settings && settings.categorySliderImages && settings.categorySliderImages[catId])
      ? settings.categorySliderImages[catId]
      : "";

    const defaultImages = {
      "brand-new-iphones": "assets/custom_hero_banner.png",
      "used-iphones": "assets/iphone_showcase_banner.jpg",
      "power-banks": "assets/chargers_banner.jpg",
      "chargers": "assets/chargers_banner.jpg",
      "back-covers": "assets/cases_banner.jpg",
      "cables": "assets/chargers_banner.jpg",
      "audio": "assets/chargers_banner.jpg",
      "tempered-glass": "assets/cases_banner.jpg",
      "camera-protectors": "assets/cases_banner.jpg"
    };

    if (val && !val.startsWith("blob:")) {
      return val;
    }

    return defaultImages[catId] || "assets/cases_banner.jpg";
  },

  renderCategories() {
    const container = document.getElementById("category-grid-container");
    if (!container) return;

    const categories = this.getCategories();
    const products = this.getProducts();

    const editorialMeta = {
      "brand-new-iphones": {
        badge: "OFFICIAL FLAGSHIP TECH // SEALED BOX",
        title: "Brand New Apple iPhones",
        desc: "Experience official Apple Care sealed devices with authentic titanium design, Dynamic Island, cutting-edge A-series silicon, and physical store warranty."
      },
      "used-iphones": {
        badge: "100% TESTED & VERIFIED // GRADE A+",
        title: "Certified Pre-Owned iPhones",
        desc: "Thoroughly tested Grade-A+ pre-owned iPhones with verified 3uTools diagnostics, 100% genuine parts, full battery guarantee, and physical store warranty."
      },
      "power-banks": {
        badge: "HIGH-DENSITY QI2 WIRELESS // ANKER & MAGSAFE",
        title: "Power Banks & MagSafe Battery",
        desc: "Certified Qi2 15W wireless charging, digital LED percentage readouts, and up to 20,000mAh bi-directional ultra-fast charging on the go."
      },
      "chargers": {
        badge: "65W–100W GaN FAST CHARGING // DUAL USB-C",
        title: "Fast Chargers & GaN Power Adapters",
        desc: "Next-gen Gallium Nitride (GaN) fast wall adapters from Anker, Ugreen & Baseus. Compact footprint, zero overheating, and maximum wattage delivery."
      },
      "back-covers": {
        badge: "AEROSPACE CARBON & SPIGEN PROTECTION",
        title: "Back Covers & MagSafe Armor",
        desc: "Engineered shockproof drop protection with integrated high-force neodymium MagSafe magnetic arrays and scratch-resistant matte finishes."
      },
      "cables": {
        badge: "240W ULTRA-DURABLE BRAIDED // TYPE-C & LIGHTNING",
        title: "Heavy-Duty Fast Charging Cables",
        desc: "High-speed data transfer and 240W power delivery cables with reinforced Kevlar braided jackets for long-lasting durability."
      },
      "audio": {
        badge: "ACTIVE NOISE CANCELLING // AIRPODS & HI-FI",
        title: "Audio & Original AirPods Pro",
        desc: "Immersive spatial audio, industry-leading active noise cancellation, and crystal-clear acoustic fidelity for seamless everyday listening."
      },
      "tempered-glass": {
        badge: "9H SAPPHIRE GLASS & PRIVACY SHIELDS",
        title: "Tempered Glass & Protectors",
        desc: "Diamond-hard 9H scratch resistance, oleophobic anti-fingerprint coatings, and edge-to-edge full screen coverage."
      },
      "camera-protectors": {
        badge: "TITANIUM INDIVIDUAL LENS RINGS",
        title: "Camera Lens Protectors",
        desc: "Precision-engineered titanium alloy protective lens rings with AR sapphire glass for crystal-clear mobile photography."
      }
    };

    container.innerHTML = categories.map((cat, idx) => {
      const count = products.filter(p => this.isProductInCategory(p, cat.id)).length;
      const sliderImg = this.getCategorySliderImage(cat.id);
      const meta = editorialMeta[cat.id] || {
        badge: `${cat.name.toUpperCase()} // OFFICIAL TECH`,
        title: cat.name,
        desc: cat.tagline || `Discover our wide range of authentic ${cat.name} with certified store warranty and island-wide fast delivery.`
      };

      return `
        <div class="dbrand-carousel-slide" data-idx="${idx}" data-id="${cat.id}">
          <div class="dbrand-slide-media-stage" onclick="App.navigateToShop('${cat.id}')" style="cursor:pointer;" title="Click to browse ${cat.name}">
            <img src="${sliderImg}" alt="${cat.name}" class="dbrand-slide-img" onerror="this.src='assets/cases_banner.jpg'">
            <span class="dbrand-slide-count-badge">${count} In Stock</span>
          </div>

          <div class="dbrand-slide-content">
            <div class="dbrand-slide-badge">${meta.badge}</div>
            <h3 class="dbrand-slide-title" onclick="App.navigateToShop('${cat.id}')" style="cursor:pointer;">${cat.name}</h3>
            <p class="dbrand-slide-desc">${meta.desc}</p>
            <div class="dbrand-slide-action-row">
              <button type="button" class="btn-dbrand-shop-now" onclick="App.navigateToShop('${cat.id}')">
                <span>SHOP NOW</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <div class="dbrand-slide-mobile-nav">
                <button type="button" class="category-nav-btn prev-btn" onclick="event.stopPropagation(); App.prevCategorySlide()" aria-label="Previous Slide">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button type="button" class="category-nav-btn next-btn" onclick="event.stopPropagation(); App.nextCategorySlide()" aria-label="Next Slide">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Populate Dynamic Dots Indicator
    const dotsContainer = document.getElementById("category-slider-dots");
    if (dotsContainer) {
      dotsContainer.innerHTML = categories.map((_, idx) => `
        <button type="button" class="category-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Go to slide ${idx + 1}" onclick="App.goToCategorySlide(${idx})"></button>
      `).join("");
    }

    this.currentCatSlide = 0;
    this.goToCategorySlide(0);
    this.startCategoryAutoSlider(categories.length);
  },

  goToCategorySlide(idx) {
    const track = document.getElementById("category-grid-container");
    const dots = document.querySelectorAll("#category-slider-dots .category-dot");
    if (!track) return;

    const total = track.querySelectorAll(".dbrand-carousel-slide").length;
    if (total === 0) return;

    this.currentCatSlide = (idx + total) % total;
    track.style.transform = `translateX(-${this.currentCatSlide * 100}%)`;

    dots.forEach((dot, dIdx) => {
      dot.classList.toggle("active", dIdx === this.currentCatSlide);
    });
  },

  nextCategorySlide() {
    this.goToCategorySlide(this.currentCatSlide + 1);
  },

  prevCategorySlide() {
    this.goToCategorySlide(this.currentCatSlide - 1);
  },

  startCategoryAutoSlider(totalSlides = 0) {
    clearInterval(this.catSlideTimer);
    const container = document.getElementById("category-showcase-container");
    if (!container) return;

    // Auto-slide every 4.5 seconds
    this.catSlideTimer = setInterval(() => {
      this.nextCategorySlide();
    }, 4500);

    if (!container._autoSlideBound) {
      container._autoSlideBound = true;

      // Pause on mouse hover / resume on leave
      container.addEventListener("mouseenter", () => clearInterval(this.catSlideTimer));
      container.addEventListener("mouseleave", () => {
        clearInterval(this.catSlideTimer);
        this.catSlideTimer = setInterval(() => this.nextCategorySlide(), 4500);
      });

      // Mobile Touch Swipe
      let touchStartX = 0;
      let touchEndX = 0;

      container.addEventListener("touchstart", (e) => {
        clearInterval(this.catSlideTimer);
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      container.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 45) {
          if (diff > 0) {
            this.nextCategorySlide();
          } else {
            this.prevCategorySlide();
          }
        }
        clearInterval(this.catSlideTimer);
        this.catSlideTimer = setInterval(() => this.nextCategorySlide(), 4500);
      }, { passive: true });
    }
  },

  // Helper for safe icon
  getSafeCategoryIcon(cat) {
    if (!cat.icon || cat.icon.length > 3 || cat.icon.toLowerCase() === "card") {
      if (cat.id.includes("wallet") || cat.id.includes("stand")) return "💳";
      if (cat.id.includes("case") || cat.id.includes("cover")) return "🛡️";
      if (cat.id.includes("charger")) return "⚡";
      if (cat.id.includes("cable")) return "🔌";
      if (cat.id.includes("glass") || cat.id.includes("screen")) return "📱";
      if (cat.id.includes("camera")) return "📸";
      if (cat.id.includes("audio") || cat.id.includes("airpod")) return "🎧";
      return "🏷️";
    }
    return cat.icon;
  },

  // 5. Brands Showcase Grid on Homepage
  renderBrandsSection() {
    const container = document.getElementById("homepage-brands-grid");
    if (!container) return;

    const brands = this.getBrands();
    const products = this.getProducts();

    container.innerHTML = brands.map(b => {
      const count = products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === b.name.toLowerCase() || pb === b.id.toLowerCase();
      }).length;

      const hasLogo = b.logo && typeof b.logo === 'string' && (b.logo.startsWith('http') || b.logo.startsWith('data:') || b.logo.startsWith('assets/'));

      return `
        <div class="brand-feature-card" onclick="App.filterByBrand('${b.id}')">
          <div class="brand-feat-icon-box">
            ${hasLogo
          ? `<img src="${b.logo}" alt="${b.name}" style="width:36px; height:36px; object-fit:contain;">`
          : (b.icon || '🏷️')
        }
          </div>
          <div class="brand-feat-content">
            <div class="brand-feat-title">${b.name}</div>
            <div class="brand-feat-sub">${b.tagline || 'Original Products'}</div>
          </div>
          <span class="brand-feat-badge">${count} Products</span>
        </div>
      `;
    }).join("");
    this.initInteractiveEffects();
  },

  // Filter actions
  filterByCategory(catId, resetBrand = true) {
    if (catId === "repair") {
      this.navigateToHome(false);
      const rep = document.getElementById("repair-center");
      if (rep) rep.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (this.currentView !== 'shop') {
      this.navigateToShop(catId, resetBrand ? 'all' : this.activeBrand);
      return;
    }

    this.activeCategory = catId;
    this.catalogViewMode = "grid";
    this.catalogCurrentPage = 0;
    if (resetBrand) {
      this.activeBrand = "all";
    }

    // Update breadcrumb and header title
    const categories = this.getCategories();
    const matchedCat = categories.find(c => c.id === this.activeCategory);
    const catName = (this.activeCategory === 'all' || !matchedCat) ? 'All Products' : matchedCat.name;

    const crumbEl = document.getElementById("store-crumb-active-cat");
    if (crumbEl) crumbEl.textContent = catName;

    const headerBadge = document.getElementById("store-header-badge");
    if (headerBadge) {
      headerBadge.textContent = this.activeCategory === 'all' ? "⚡ OFFICIAL UNIVERSE HUB STORE" : `⚡ ${catName.toUpperCase()}`;
    }

    const headerTitle = document.getElementById("store-header-title");
    if (headerTitle) {
      headerTitle.textContent = this.activeCategory === 'all' ? "All Products & Accessories" : catName;
    }

    const headerDesc = document.getElementById("store-header-desc");
    if (headerDesc && matchedCat && matchedCat.tagline) {
      headerDesc.textContent = matchedCat.tagline;
    }

    this.renderNavbar();
    this.renderCatalogTabs();
    this.renderBrandFilterBar();
    this.renderCatalog();

    const targetHash = (this.activeCategory && this.activeCategory !== 'all') ? `#shop?cat=${this.activeCategory}` : '#shop';
    if (window.location.hash !== targetHash) {
      try { window.history.pushState(null, '', targetHash); } catch(e) { window.location.hash = targetHash; }
    }
  },

  filterByBrand(brandId) {
    if (this.currentView !== 'shop') {
      this.navigateToShop(this.activeCategory, brandId);
      return;
    }

    this.activeBrand = brandId;
    this.catalogViewMode = "grid";
    this.catalogCurrentPage = 0;
    this.renderNavbar();
    this.renderBrandFilterBar();
    this.renderCatalog();
  },

  // Helper to render consistent, responsive, perfectly styled product cards across views
  renderProductCard(prod, wishlist, allBrands) {
    if (!wishlist) wishlist = JSON.parse(localStorage.getItem("UH_WISHLIST")) || [];
    if (!allBrands) allBrands = this.getBrands();

    const isWishlisted = wishlist.includes(prod.id);
    const prodBrand = prod.brand || 'Apple';
    const matchedBrand = allBrands.find(b => (b.name && b.name.toLowerCase() === prodBrand.toLowerCase()) || (b.id && b.id.toLowerCase() === prodBrand.toLowerCase()));
    const brandLogo = matchedBrand && matchedBrand.logo;

    const hasStorageVariants = Array.isArray(prod.storageOptions) && prod.storageOptions.length > 0;
    const hasColorVariants = Array.isArray(prod.colorOptions) && prod.colorOptions.length > 0;
    const minPrice = hasStorageVariants ? Math.min(...prod.storageOptions.map(t => Number(t.price) || prod.price)) : prod.price;

    const isUsed = !!(prod.condition && !prod.condition.toLowerCase().includes("brand new"));

    // Sleek single primary highlight badge (prevents messy badge stacking)
    let primaryBadge = '';
    if (prod.discount) {
      primaryBadge = `<span class="badge-pill badge-discount">${prod.discount}</span>`;
    } else if (prod.batteryHealth) {
      primaryBadge = `<span class="badge-pill badge-battery">🔋 ${prod.batteryHealth}${typeof prod.batteryHealth === 'number' || !String(prod.batteryHealth).includes('%') ? '%' : ''}</span>`;
    } else if (prod.specs?.mah) {
      primaryBadge = `<span class="badge-pill badge-tech">🔋 ${prod.specs.mah}</span>`;
    } else if (prod.specs?.wattage) {
      primaryBadge = `<span class="badge-pill badge-watt">⚡ ${prod.specs.wattage}</span>`;
    } else if (isUsed) {
      primaryBadge = `<span class="badge-pill badge-used">Grade A+</span>`;
    } else if (prod.stockStatus === 'on-request') {
      primaryBadge = `<span class="badge-pill badge-request">On Order</span>`;
    }

    // Sleek 1-line micro-spec text (never wraps or clutters)
    let specLine = '';
    if (hasStorageVariants) {
      specLine = `💾 ${prod.storageOptions.map(t => t.capacity).join(" • ")}`;
    } else if (prod.specs?.mah || prod.specs?.wattage) {
      const parts = [];
      if (prod.specs.mah) parts.push(prod.specs.mah);
      if (prod.specs.wattage) parts.push(prod.specs.wattage);
      if (prod.specs.magsafe) parts.push('MagSafe');
      specLine = `⚡ ${parts.join(" • ")}`;
    } else if (prod.batteryHealth) {
      specLine = `🔋 ${prod.batteryHealth}% Battery • Grade A+ Mint`;
    } else if (prod.specs?.compatibility) {
      specLine = `📱 ${prod.specs.compatibility}`;
    } else if (prod.specs?.ports) {
      specLine = `🔌 ${prod.specs.ports}`;
    } else if (Array.isArray(prod.tags) && prod.tags.length > 0) {
      specLine = `✨ ${prod.tags.slice(0, 2).join(" • ")}`;
    } else {
      specLine = `✓ 100% Genuine Apple & Flagship Tech`;
    }

    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="card-top-badges">
          <span class="badge-pill badge-brand" onclick="event.stopPropagation(); App.filterByBrand('${prodBrand.toLowerCase()}');" title="Filter by ${prodBrand}">
            ${brandLogo
        ? `<img src="${brandLogo}" alt="${prodBrand}" style="width:12px; height:12px; object-fit:contain; vertical-align:middle; margin-right:3px;">`
        : (matchedBrand && matchedBrand.icon ? `${matchedBrand.icon} ` : '🏷️ ')
      }${prodBrand}
          </span>
          ${primaryBadge}
        </div>

        <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="App.toggleWishlist('${prod.id}', this)" title="Add to Wishlist">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>

        <div class="card-media" onclick="App.openQuickView('${prod.id}')">
          <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.src='assets/hero_showcase.jpg'">
          <button class="quick-view-btn">Quick Specs</button>
        </div>

        <div class="card-details">
          <div class="card-rating-row">
            ★ <b>${(Number(prod.rating) || 5.0).toFixed(1)}</b> <span>(${prod.reviewsCount !== undefined ? prod.reviewsCount : (prod.reviews || 0)})</span>
          </div>

          <h3 class="card-title" title="${prod.name}" onclick="App.openQuickView('${prod.id}')">${prod.name}</h3>

          <div class="card-spec-line" title="${specLine}">
            ${specLine}
          </div>

          <div class="card-price-row">
            <span class="current-price">${hasStorageVariants ? `<small style="font-size:11px; font-weight:normal; color:var(--text-muted);">From </small>` : ''}Rs. ${minPrice.toLocaleString()}</span>
            ${prod.originalPrice > minPrice ? `<span class="original-price">Rs. ${prod.originalPrice.toLocaleString()}</span>` : ''}
          </div>

          <div style="display:flex; gap:6px; margin-top:auto;">
            <button class="add-to-cart-btn" style="flex:1;" onclick="${(hasStorageVariants || hasColorVariants) ? `App.openQuickView('${prod.id}')` : `App.addToCart('${prod.id}')`}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              <span>${(hasStorageVariants || hasColorVariants) ? 'Options' : 'Add to Cart'}</span>
            </button>
            <button type="button" class="btn-card-wa" onclick="event.stopPropagation(); App.inquireProductStockWhatsApp('${prod.id}')" title="Check Stock &amp; Inquire on WhatsApp">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.03C9.36 7.03 9.09 7.1 8.87 7.33C8.65 7.57 8.02 8.16 8.02 9.36C8.02 10.56 8.9 11.72 9.02 11.89C9.14 12.05 10.74 14.53 13.2 15.59C13.79 15.84 14.24 16 14.6 16.11C15.19 16.3 15.73 16.27 16.16 16.21C16.64 16.14 17.63 15.61 17.84 15.02C18.05 14.43 18.05 13.92 17.98 13.82C17.92 13.71 17.75 13.65 17.5 13.52C17.25 13.4 16.03 12.8 15.8 12.72C15.58 12.63 15.41 12.59 15.25 12.84C15.08 13.08 14.6 13.65 14.46 13.82C14.31 13.98 14.17 14 13.92 13.88C13.67 13.75 12.88 13.49 11.94 12.65C11.21 11.99 10.71 11.18 10.57 10.93C10.42 10.68 10.55 10.55 10.68 10.42C10.79 10.31 10.93 10.13 11.06 9.98C11.18 9.83 11.22 9.72 11.31 9.55C11.39 9.38 11.35 9.24 11.29 9.11C11.23 8.99 10.73 7.76 10.53 7.26C10.33 6.77 10.12 6.84 9.96 6.83C9.81 6.82 9.67 6.82 9.53 7.03Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 6. Product Catalog Rendering (Filters by BOTH Category & Brand)
  renderCatalog() {
    const container = document.getElementById("products-catalog-container");
    if (!container) return;

    const products = this.getProducts();
    let filtered = products;

    // Filter by Category using universal smart matching
    if (this.activeCategory !== "all") {
      filtered = filtered.filter(p => this.isProductInCategory(p, this.activeCategory));
    }

    // Filter by Brand
    if (this.activeBrand !== "all") {
      const targetBrand = this.activeBrand.toLowerCase();
      filtered = filtered.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === targetBrand || pb.includes(targetBrand);
      });
    }

    // Ensure iPhones appear first, followed by premium accessories
    filtered.sort((a, b) => {
      const aIsPhone = (a.category && a.category.includes("iphone")) || (a.mainCategory === "iphones");
      const bIsPhone = (b.category && b.category.includes("iphone")) || (b.mainCategory === "iphones");
      if (aIsPhone && !bIsPhone) return -1;
      if (!aIsPhone && bIsPhone) return 1;
      return 0;
    });

    const storeCounter = document.getElementById("store-items-counter");
    if (storeCounter) {
      storeCounter.textContent = `Showing ${filtered.length} Product${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      const headerControls = document.getElementById("catalog-slider-header-controls");
      if (headerControls) headerControls.style.display = "none";
      const paginationBar = document.getElementById("catalog-pagination-bar");
      if (paginationBar) paginationBar.style.display = "none";
      container.style.transform = "none";

      if (products.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 70px 20px;">
            <div style="font-size:36px; margin-bottom:12px;">✨</div>
            <h3 style="color:#fff; font-size:18px; font-weight:700; margin-bottom:6px;">Store Inventory Updating</h3>
            <p style="color:var(--text-secondary); font-size:14px; max-width:480px; margin:0 auto;">We are currently uploading our latest stock of authentic iPhones and premium accessories. Please check back shortly or contact us on WhatsApp!</p>
            <div style="margin-top:20px;">
              <a href="https://wa.me/94740219239?text=Hi%20Universe%20Hub,%20I%20want%20to%20inquire%20about%20available%20stock" target="_blank" class="btn-primary-glow" style="display:inline-flex; align-items:center; gap:8px;">
                <span>💬 Inquire on WhatsApp (074-0219239)</span>
              </a>
            </div>
          </div>
        `;
        return;
      }
      if (this.activeCategory === 'brand-new-iphones') {
        const usedCount = products.filter(p => this.isProductInCategory(p, 'used-iphones')).length;
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <div style="font-size:36px; margin-bottom:10px;">🍏</div>
            <h3 style="color:#fff; font-size:18px; font-weight:700; margin-bottom:6px;">Brand New iPhones Stock Updating</h3>
            <p style="color:var(--text-secondary); font-size:14px; max-width:480px; margin:0 auto 16px;">
              We currently have <strong>${usedCount} Certified Pre-Owned iPhones</strong> with 100% battery guarantee &amp; physical store warranty ready for dispatch!
            </p>
            <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
              <button class="btn-primary-glow" onclick="App.filterByCategory('used-iphones')" style="padding:10px 22px; font-size:13px; font-weight:700;">
                Browse Certified Used iPhones (${usedCount}) →
              </button>
              <button class="btn-glass" onclick="App.filterByCategory('all'); App.filterByBrand('all');">View All Products</button>
            </div>
          </div>
        `;
        return;
      }
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <p style="color:var(--text-secondary); font-size:16px;">No products found matching these filters.</p>
          <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
            <button class="btn-glass" onclick="App.filterByBrand('all')">Reset Brand Filter</button>
            <button class="btn-primary-glow" onclick="App.filterByCategory('all'); App.filterByBrand('all');">View All Products</button>
          </div>
        </div>
      `;
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("UH_WISHLIST")) || [];
    const allBrands = this.getBrands();

    container.innerHTML = filtered.map(prod => this.renderProductCard(prod, wishlist, allBrands)).join("");

    if (this.catalogViewMode === "grid") {
      container.classList.remove("catalog-slider-track");
      container.classList.add("products-grid");
      container.style.transform = "none";

      const headerArrows = document.querySelector(".catalog-slider-nav-arrows");
      if (headerArrows) headerArrows.style.display = "none";

      const paginationBar = document.getElementById("catalog-pagination-bar");
      if (paginationBar) {
        paginationBar.innerHTML = "";
        paginationBar.style.display = "none";
      }

      const counterEl = document.getElementById("catalog-slider-counter");
      if (counterEl) {
        counterEl.textContent = `${filtered.length} Product${filtered.length === 1 ? '' : 's'}`;
      }

      const toggleBtn = document.getElementById("catalog-view-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "🎬 5-Card Slider";
    } else {
      container.classList.remove("products-grid");
      container.classList.add("catalog-slider-track");

      const headerArrows = document.querySelector(".catalog-slider-nav-arrows");
      if (headerArrows) headerArrows.style.display = "flex";

      const toggleBtn = document.getElementById("catalog-view-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "⊞ View All Grid";

      this.updateCatalogSliderPosition();
    }

    const headerControls = document.getElementById("catalog-slider-header-controls");
    if (headerControls) headerControls.style.display = "flex";

    this.initInteractiveEffects();
    this.setupCatalogSliderSwipe();
  },

  // 6b. 5-Item Catalog Slider & Pagination Engine
  getCatalogItemsPerPage() {
    if (this.catalogViewMode === "grid") return 999;
    const w = window.innerWidth;
    if (w >= 1200) return 5;
    if (w >= 992) return 4;
    if (w >= 680) return 3;
    return 2;
  },

  nextCatalogPage() {
    const itemsPerPage = this.getCatalogItemsPerPage();
    const container = document.getElementById("products-catalog-container");
    if (!container) return;
    const cards = container.querySelectorAll(".product-card");
    const totalPages = Math.ceil(cards.length / itemsPerPage);
    if (this.catalogCurrentPage < totalPages - 1) {
      this.catalogCurrentPage++;
      this.updateCatalogSliderPosition();
    }
  },

  prevCatalogPage() {
    if (this.catalogCurrentPage > 0) {
      this.catalogCurrentPage--;
      this.updateCatalogSliderPosition();
    }
  },

  goToCatalogPage(pageIdx) {
    this.catalogCurrentPage = pageIdx;
    this.updateCatalogSliderPosition();
  },

  toggleCatalogViewMode() {
    this.catalogViewMode = this.catalogViewMode === "slider" ? "grid" : "slider";
    const container = document.getElementById("products-catalog-container");
    const toggleBtn = document.getElementById("catalog-view-toggle-btn");
    const headerArrows = document.querySelector(".catalog-slider-nav-arrows");
    const paginationBar = document.getElementById("catalog-pagination-bar");
    const counterEl = document.getElementById("catalog-slider-counter");

    if (this.catalogViewMode === "grid") {
      if (container) {
        container.classList.remove("catalog-slider-track");
        container.classList.add("products-grid");
        container.style.transform = "none";
      }
      if (toggleBtn) toggleBtn.textContent = "🎬 5-Card Slider";
      if (headerArrows) headerArrows.style.display = "none";
      if (paginationBar) paginationBar.style.display = "none";
      if (counterEl) {
        const cardsCount = container ? container.querySelectorAll(".product-card").length : 0;
        counterEl.textContent = `All ${cardsCount} Products`;
      }
    } else {
      if (container) {
        container.classList.remove("products-grid");
        container.classList.add("catalog-slider-track");
      }
      if (toggleBtn) toggleBtn.textContent = "⊞ View All Grid";
      if (headerArrows) headerArrows.style.display = "flex";
      this.catalogCurrentPage = 0;
      this.updateCatalogSliderPosition();
    }
  },

  updateCatalogSliderPosition() {
    const container = document.getElementById("products-catalog-container");
    const viewport = document.getElementById("catalog-slider-viewport");
    if (!container) return;

    if (this.catalogViewMode === "grid") {
      container.style.transform = "none";
      const headerArrows = document.querySelector(".catalog-slider-nav-arrows");
      if (headerArrows) headerArrows.style.display = "none";
      const paginationBar = document.getElementById("catalog-pagination-bar");
      if (paginationBar) {
        paginationBar.innerHTML = "";
        paginationBar.style.display = "none";
      }
      return;
    }

    const cards = container.querySelectorAll(".product-card");
    if (cards.length === 0) return;

    const itemsPerPage = this.getCatalogItemsPerPage();
    const totalPages = Math.max(1, Math.ceil(cards.length / itemsPerPage));

    // Clamp page index
    if (this.catalogCurrentPage >= totalPages) {
      this.catalogCurrentPage = Math.max(0, totalPages - 1);
    }
    if (this.catalogCurrentPage < 0) this.catalogCurrentPage = 0;

    // Calculate smooth slide offset
    const targetIndex = Math.min(this.catalogCurrentPage * itemsPerPage, cards.length - 1);
    const targetCard = cards[targetIndex];
    const maxShift = viewport ? Math.max(0, container.scrollWidth - viewport.clientWidth) : 0;

    let shift = 0;
    if (targetCard && maxShift > 0) {
      if (this.catalogCurrentPage === totalPages - 1) {
        shift = maxShift;
      } else {
        shift = Math.min(targetCard.offsetLeft, maxShift);
      }
    }

    container.style.transform = `translateX(-${shift}px)`;

    // Update Header Counter & Arrows
    const counterEl = document.getElementById("catalog-slider-counter");
    if (counterEl) {
      counterEl.textContent = `Page ${this.catalogCurrentPage + 1} / ${totalPages} (${cards.length} Products)`;
    }

    const prevBtn = document.getElementById("catalog-prev-btn");
    const nextBtn = document.getElementById("catalog-next-btn");
    if (prevBtn) prevBtn.disabled = this.catalogCurrentPage === 0;
    if (nextBtn) nextBtn.disabled = this.catalogCurrentPage >= totalPages - 1;

    // Render Bottom Pagination
    this.renderCatalogPagination(totalPages);
  },

  renderCatalogPagination(totalPages) {
    const bar = document.getElementById("catalog-pagination-bar");
    if (!bar) return;

    if (this.catalogViewMode === "grid" || totalPages <= 1) {
      bar.innerHTML = "";
      bar.style.display = "none";
      return;
    }

    bar.style.display = "flex";

    let html = `
      <button type="button" class="catalog-page-btn" onclick="App.prevCatalogPage()" ${this.catalogCurrentPage === 0 ? 'disabled' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>Previous</span>
      </button>
      <div class="catalog-page-dots">
    `;

    for (let i = 0; i < totalPages; i++) {
      const isActive = i === this.catalogCurrentPage;
      html += `
        <button type="button" class="catalog-page-btn ${isActive ? 'active' : ''}" onclick="App.goToCatalogPage(${i})" title="Page ${i + 1}">
          ${i + 1}
        </button>
      `;
    }

    html += `
      </div>
      <button type="button" class="catalog-page-btn" onclick="App.nextCatalogPage()" ${this.catalogCurrentPage >= totalPages - 1 ? 'disabled' : ''}>
        <span>Next</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    `;

    bar.innerHTML = html;
  },

  setupCatalogSliderSwipe() {
    const viewport = document.getElementById("catalog-slider-viewport");
    if (!viewport || viewport.hasAttribute("data-swipe-bound")) return;
    viewport.setAttribute("data-swipe-bound", "true");

    let startX = 0;
    let endX = 0;

    viewport.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      endX = startX;
    }, { passive: true });

    viewport.addEventListener("touchmove", (e) => {
      endX = e.touches[0].clientX;
    }, { passive: true });

    viewport.addEventListener("touchend", () => {
      const diff = startX - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          this.nextCatalogPage();
        } else {
          this.prevCatalogPage();
        }
      }
    });
  },

  // 3. Search Suggestions
  handleSearchSuggestions(query, dropdown) {
    if (!query) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    const products = this.getProducts();
    const matches = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
    ).slice(0, 5);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div style="padding:16px; color:var(--text-muted); font-size:13px; text-align:center;">No matching gadgets found for "${query}"</div>`;
      dropdown.classList.add("active");
      return;
    }

    dropdown.innerHTML = matches.map(prod => `
      <div class="search-res-item" onclick="App.openQuickView('${prod.id}'); document.getElementById('search-dropdown-results').classList.remove('active');">
        <img src="${prod.image}" alt="">
        <div class="search-res-info">
          <h4>${prod.name}</h4>
          <p>Rs. ${prod.price.toLocaleString()}${prod.condition ? ` • <span style="color:#94a3b8; font-weight:normal;">${prod.condition}</span>` : ''}</p>
        </div>
      </div>
    `).join("");

    dropdown.classList.add("active");
  },

  // 4. Quick View Modal with Multi-Image & Video Gallery & Dynamic Storage/Color Matrix
  quickViewMediaList: [],
  quickViewActiveIndex: 0,
  quickViewCurrentProdId: null,
  quickViewSelectedStorage: null,
  quickViewSelectedColor: null,
  quickViewSelectedPrice: 0,
  quickViewSelectedOrigPrice: 0,

  getColorHex(colorName) {
    if (!colorName) return "#38bdf8";
    const c = String(colorName).toLowerCase();
    if (c.includes("black") || c.includes("midnight") || c.includes("space gray")) return "#0f172a";
    if (c.includes("starlight") || c.includes("silver") || c.includes("white")) return "#f1f5f9";
    if (c.includes("blue") || c.includes("sierra") || c.includes("pacific")) return "#2563eb";
    if (c.includes("pink") || c.includes("rose")) return "#f472b6";
    if (c.includes("green") || c.includes("alpine")) return "#15803d";
    if (c.includes("purple")) return "#7e22ce";
    if (c.includes("titanium") && !c.includes("desert")) return "#94a3b8";
    if (c.includes("desert") || c.includes("gold")) return "#d97706";
    if (c.includes("red")) return "#ef4444";
    if (c.includes("yellow")) return "#eab308";
    return "#38bdf8";
  },

  selectQuickViewStorage(capacity, price, origPrice) {
    this.quickViewSelectedStorage = capacity;
    this.quickViewSelectedPrice = price;
    this.quickViewSelectedOrigPrice = origPrice || price;

    document.querySelectorAll(".storefront-storage-pill").forEach(pill => {
      const match = pill.getAttribute("data-capacity") === capacity;
      pill.classList.toggle("active", match);
    });

    const priceEl = document.getElementById("qv-price-display");
    if (priceEl) priceEl.textContent = `Rs. ${Number(price).toLocaleString()}`;

    const origEl = document.getElementById("qv-origprice-display");
    if (origEl) {
      if (origPrice && origPrice > price) {
        origEl.textContent = `Rs. ${Number(origPrice).toLocaleString()}`;
        origEl.style.display = "inline";
      } else {
        origEl.style.display = "none";
      }
    }

    const btn = document.getElementById("qv-add-cart-btn");
    if (btn) {
      btn.innerHTML = `Add to Cart • ${capacity} (Rs. ${Number(price).toLocaleString()})`;
    }
  },

  selectQuickViewColor(colorName) {
    this.quickViewSelectedColor = colorName;

    document.querySelectorAll(".storefront-color-pill").forEach(pill => {
      const match = pill.getAttribute("data-color") === colorName;
      pill.classList.toggle("active", match);
    });
  },

  executeAddToCartFromQuickView() {
    const products = this.getProducts();
    const prod = products.find(p => p.id === this.quickViewCurrentProdId);
    if (!prod) return;

    this.executeAddToCart(
      prod,
      this.quickViewSelectedStorage,
      this.quickViewSelectedColor,
      this.quickViewSelectedPrice
    );
  },

  inquireProductStockWhatsApp(prodId) {
    const products = this.getProducts();
    const prod = products.find(p => String(p.id) === String(prodId));
    if (!prod) return;

    // Use active Quick View selection if inquiring from the open modal, otherwise product defaults
    const isCurrentModal = String(this.quickViewCurrentProdId) === String(prodId);
    const storage = (isCurrentModal && this.quickViewSelectedStorage)
      ? this.quickViewSelectedStorage
      : ((Array.isArray(prod.storageOptions) && prod.storageOptions[0]?.capacity) || "");
    const color = (isCurrentModal && this.quickViewSelectedColor)
      ? this.quickViewSelectedColor
      : ((Array.isArray(prod.colorOptions) && prod.colorOptions[0]) || "");
    const price = (isCurrentModal && this.quickViewSelectedPrice)
      ? this.quickViewSelectedPrice
      : prod.price;

    let details = [];
    if (storage) details.push(`💾 Capacity: ${storage}`);
    if (color) details.push(`🎨 Color: ${color}`);
    if (prod.condition) details.push(`✨ Condition: ${prod.condition}`);
    if (price) details.push(`💰 Price: Rs. ${Number(price).toLocaleString()}`);

    const isSourced = prod.stockStatus === "on-request";
    const statusNote = isSourced ? "\n*(I see this item can be arranged / sourced on request)*" : "";

    const msg = `Hello Universe Hub Store (Maharagama)! 👋\n\nI would like to check stock availability for:\n📱 *${prod.name}*\n${details.join("\n")}${statusNote}\n\nCould you please let me know if this is currently available in the shop, or how fast you can arrange / bring this stock for me?\n\nThank you!`;

    const settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || {};
    const rawWa = (settings.whatsapp || settings.phone || "0740219239").replace(/[^0-9]/g, "");
    let waPhone = rawWa;
    if (waPhone.startsWith("0")) waPhone = "94" + waPhone.substring(1);
    else if (!waPhone.startsWith("94")) waPhone = "94" + waPhone;

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  formatProductDescription(desc) {
    if (!desc) return "";
    let clean = String(desc).trim();

    // If description doesn't have line breaks (crammed single paragraph with common spec keywords), smartly insert line breaks
    if (!clean.includes("\n")) {
      clean = clean
        .replace(/(Key Features:?)/gi, "\n\n$1\n")
        .replace(/\s*(Display:)/gi, "\n• Display:")
        .replace(/\s*(Processor:)/gi, "\n• Processor:")
        .replace(/\s*(Rear Camera:)/gi, "\n• Rear Camera:")
        .replace(/\s*(Front Camera:)/gi, "\n• Front Camera:")
        .replace(/\s*(Battery:)/gi, "\n• Battery:")
        .replace(/\s*(Security:)/gi, "\n• Security:")
        .replace(/\s*(Charging:)/gi, "\n• Charging:")
        .replace(/\s*(Protection:)/gi, "\n• Protection:")
        .replace(/\s*(Operating System:)/gi, "\n• Operating System:")
        .replace(/\s*(Storage:)/gi, "\n• Storage:")
        .replace(/\s*(Warranty:)/gi, "\n• Warranty:")
        .trim();
    }

    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const formatInline = (str) => {
      let s = escapeHtml(str);
      // bold: **text** or <b>text</b>
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ffffff; font-weight:800; text-shadow:0 0 8px rgba(255,255,255,0.25);">$1</strong>');
      s = s.replace(/&lt;b&gt;(.+?)&lt;\/b&gt;/gi, '<strong style="color:#ffffff; font-weight:800; text-shadow:0 0 8px rgba(255,255,255,0.25);">$1</strong>');
      // italic: *text* or <i>text</i>
      s = s.replace(/\*([^\*]+)\*/g, '<em style="color:#e2e8f0; font-style:italic;">$1</em>');
      s = s.replace(/&lt;i&gt;(.+?)&lt;\/i&gt;/gi, '<em style="color:#e2e8f0; font-style:italic;">$1</em>');
      return s;
    };

    const lines = clean.split("\n");
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height:8px;"></div>';

      // Heading detection
      if (/^(Key Features|Specifications|Specs|Highlights|Package Includes|In the Box):?$/i.test(trimmed)) {
        return `<div style="font-weight:800; color:#fff; font-size:13.5px; margin-top:12px; margin-bottom:6px; display:flex; align-items:center; gap:6px; letter-spacing:0.3px;">
          <span style="color:var(--neon-cyan);">⚡</span>
          <span>${formatInline(trimmed)}</span>
        </div>`;
      }

      // Bullet points (•, -, *)
      if (/^[•\-\*]\s*/.test(trimmed)) {
        const text = trimmed.replace(/^[•\-\*]\s*/, '');
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 30) {
          const label = text.substring(0, colonIdx);
          const val = text.substring(colonIdx + 1);
          return `<div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; line-height:1.55; padding-left:4px;">
            <span style="color:var(--neon-cyan); font-size:11px; margin-top:3px;">✦</span>
            <span><strong style="color:#f8fafc; font-weight:700;">${formatInline(label)}:</strong><span style="color:#cbd5e1;">${formatInline(val)}</span></span>
          </div>`;
        }
        return `<div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; line-height:1.55; padding-left:4px;">
          <span style="color:var(--neon-cyan); font-size:11px; margin-top:3px;">✦</span>
          <span style="color:#cbd5e1;">${formatInline(text)}</span>
        </div>`;
      }

      // "Label: Value" format without bullet
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0 && colonIdx < 28 && !trimmed.toLowerCase().startsWith('http')) {
        const label = trimmed.substring(0, colonIdx);
        const val = trimmed.substring(colonIdx + 1);
        return `<div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; line-height:1.55; padding-left:4px;">
          <span style="color:var(--neon-cyan); font-size:11px; margin-top:3px;">✦</span>
          <span><strong style="color:#f8fafc; font-weight:700;">${formatInline(label)}:</strong><span style="color:#cbd5e1;">${formatInline(val)}</span></span>
        </div>`;
      }

      // Normal paragraph
      return `<p style="margin:0 0 8px 0; color:var(--text-secondary); line-height:1.65;">${formatInline(trimmed)}</p>`;
    }).join("");
  },

  openQuickView(prodId) {
    const products = this.getProducts();
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    // Meta Pixel ViewContent Hook (Uses genuine Catalog Product ID & LKR price)
    if (typeof window !== 'undefined' && window.MetaPixel && typeof window.MetaPixel.trackViewContent === 'function') {
      window.MetaPixel.trackViewContent(prod);
    }

    this.quickViewCurrentProdId = prodId;

    // Prepare media items list (sanitized & deduplicated)
    let mediaList = [];
    let rawImages = (prod.images && Array.isArray(prod.images) && prod.images.length > 0) ? [...prod.images] : [prod.image];
    rawImages = rawImages.filter(u => typeof u === 'string' && u.trim().length > 0 && (!u.startsWith('data:image') || (u.length > 100 && u.includes(';base64,'))));
    if (rawImages.length > 1) {
      const genuine = rawImages.filter(u => u !== 'assets/hero_showcase.jpg');
      if (genuine.length > 0) rawImages = genuine;
    }
    rawImages = Array.from(new Set(rawImages));

    rawImages.forEach(imgUrl => {
      if (imgUrl && imgUrl.trim()) {
        mediaList.push({ type: 'image', url: imgUrl.trim() });
      }
    });

    if (prod.video && prod.video.trim()) {
      mediaList.push({ type: 'video', url: prod.video.trim() });
    }

    if (mediaList.length === 0) {
      mediaList.push({ type: 'image', url: 'https://placehold.co/600x600/0f172a/00d2ff?text=Universe+Hub' });
    }

    this.quickViewMediaList = mediaList;
    this.quickViewActiveIndex = 0;

    // Handle Storage Variants
    const hasStorage = Array.isArray(prod.storageOptions) && prod.storageOptions.length > 0;
    if (hasStorage) {
      this.quickViewSelectedStorage = prod.storageOptions[0].capacity;
      this.quickViewSelectedPrice = Number(prod.storageOptions[0].price) || prod.price;
      this.quickViewSelectedOrigPrice = Number(prod.storageOptions[0].originalPrice) || this.quickViewSelectedPrice;
    } else {
      this.quickViewSelectedStorage = null;
      this.quickViewSelectedPrice = Number(prod.price);
      this.quickViewSelectedOrigPrice = Number(prod.originalPrice) || Number(prod.price);
    }

    // Handle Color Variants
    const hasColor = Array.isArray(prod.colorOptions) && prod.colorOptions.length > 0;
    if (hasColor) {
      this.quickViewSelectedColor = prod.colorOptions[0];
    } else {
      this.quickViewSelectedColor = null;
    }

    const isUsed = !!(prod.condition && !prod.condition.toLowerCase().includes("brand new"));
    let condTitle = prod.condition ? "🌟 Brand New (100% Sealed Box)" : "";
    if (isUsed && prod.condition) {
      if (prod.condition.includes("Grade A+")) condTitle = "✨ Grade A+ (99% Mint / Like New)";
      else if (prod.condition.includes("Grade A")) condTitle = "✨ Grade A (95% - 98% Super Clean)";
      else if (prod.condition.includes("Grade B")) condTitle = "⚡ Grade B (90% Good Condition)";
      else condTitle = `✨ ${prod.condition}`;
    }

    const modalBody = document.getElementById("quickview-modal-body");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="quickview-grid-layout">
        <!-- Left: Interactive Gallery -->
        <div class="product-gallery-card" style="min-width:0; width:100%; box-sizing:border-box;">
          <div class="gallery-viewport" id="gallery-viewport-stage">
            <!-- Main media item rendered here -->
          </div>

          <!-- Thumbnail scroll row -->
          <div class="gallery-thumbnails-strip" id="gallery-thumbnails-strip">
            ${mediaList.map((item, idx) => `
              <div class="gallery-thumb-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" onclick="App.setQuickViewMedia(${idx})">
                ${item.type === 'video'
        ? `<div class="gallery-thumb-video-badge">▶<span>VIDEO</span></div>`
        : `<img src="${item.url}" alt="" onerror="this.src='assets/hero_showcase.jpg'">`
      }
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Right: Specs and Details -->
        <div style="min-width:0; width:100%; box-sizing:border-box;">
          <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
            ${prod.condition ? `<span class="badge-pill ${isUsed ? 'badge-used' : 'badge-new'}">${condTitle}</span>` : ''}
            ${prod.batteryHealth ? `<span class="badge-pill badge-battery">🔋 Battery: ${prod.batteryHealth}${typeof prod.batteryHealth === 'number' || !String(prod.batteryHealth).includes('%') ? '%' : ''} Original</span>` : ''}
            ${mediaList.some(m => m.type === 'video') ? `<span class="badge-pill" style="background:rgba(224,86,253,0.18); border:1px solid rgba(224,86,253,0.4); color:#e056fd;">🎬 Video Showcase</span>` : ''}
          </div>

          <h2 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:12px; line-height:1.3;">${prod.name}</h2>

          <!-- Dynamic Live Price Row -->
          <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:14px;">
            <span id="qv-price-display" style="font-size:24px; font-weight:900; color:var(--accent-gold);">Rs. ${this.quickViewSelectedPrice.toLocaleString()}</span>
            <span id="qv-origprice-display" style="font-size:14px; text-decoration:line-through; color:var(--text-muted); ${this.quickViewSelectedOrigPrice > this.quickViewSelectedPrice ? '' : 'display:none;'}">Rs. ${this.quickViewSelectedOrigPrice.toLocaleString()}</span>
          </div>

          <!-- Dynamic Storage Matrix Selection -->
          ${hasStorage ? `
            <div class="quickview-variant-group">
              <label class="quickview-variant-label">💾 Select Storage Capacity:</label>
              <div class="quickview-pills-row" id="qv-storage-pills">
                ${prod.storageOptions.map((tier, idx) => `
                  <button type="button" 
                          class="storefront-storage-pill ${idx === 0 ? 'active' : ''}" 
                          data-capacity="${tier.capacity}" 
                          data-price="${tier.price}" 
                          data-orig="${tier.originalPrice || tier.price}"
                          onclick="App.selectQuickViewStorage('${tier.capacity}', ${tier.price}, ${tier.originalPrice || tier.price})">
                    <span>${tier.capacity}</span>
                    <small style="display:block; font-size:11px; opacity:0.85; margin-top:2px;">Rs. ${Number(tier.price).toLocaleString()}</small>
                  </button>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- Dynamic Stock Colors Selection -->
          ${hasColor ? `
            <div class="quickview-variant-group">
              <label class="quickview-variant-label">🎨 Select Available Color:</label>
              <div class="quickview-pills-row" id="qv-color-pills">
                ${prod.colorOptions.map((c, idx) => `
                  <button type="button" 
                          class="storefront-color-pill ${idx === 0 ? 'active' : ''}" 
                          data-color="${c}"
                          onclick="App.selectQuickViewColor('${c}')">
                    <span class="color-dot" style="background:${App.getColorHex(c)};"></span>
                    <span>${c}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <div class="quickview-desc-formatted" style="font-size:13.5px; color:var(--text-secondary); line-height:1.65; margin-bottom:18px; background:rgba(255,255,255,0.02); padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
            ${this.formatProductDescription(prod.description)}
          </div>

          ${(prod.specs && (prod.specs.mah || prod.specs.wattage || prod.specs.ports || prod.specs.cableLength || prod.specs.compatibility || prod.specs.magsafe || prod.specs.fastCharge || prod.specs.wireless || prod.specs.digitalDisplay || prod.specs.anc)) ? `
            <!-- Accessory Technical Specifications Box -->
            <div class="acc-spec-highlight-box">
              <div style="font-size:12px; font-weight:700; color:var(--accent-gold); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                <span>⚡ Technical Specifications</span>
              </div>
              <div class="acc-spec-grid">
                ${prod.specs.mah ? `
                  <div class="acc-spec-item">
                    <span class="acc-spec-label">Battery Capacity</span>
                    <span class="acc-spec-val" style="color:#10b981;">🔋 ${prod.specs.mah}</span>
                  </div>
                ` : ''}
                ${prod.specs.wattage ? `
                  <div class="acc-spec-item">
                    <span class="acc-spec-label">Power Output</span>
                    <span class="acc-spec-val" style="color:#f59e0b;">⚡ ${prod.specs.wattage}</span>
                  </div>
                ` : ''}
                ${prod.specs.ports ? `
                  <div class="acc-spec-item">
                    <span class="acc-spec-label">Connector / Ports</span>
                    <span class="acc-spec-val">🔌 ${prod.specs.ports}</span>
                  </div>
                ` : ''}
                ${prod.specs.cableLength ? `
                  <div class="acc-spec-item">
                    <span class="acc-spec-label">Length / Build</span>
                    <span class="acc-spec-val">📏 ${prod.specs.cableLength}</span>
                  </div>
                ` : ''}
                ${prod.specs.compatibility ? `
                  <div class="acc-spec-item" style="grid-column: 1 / -1;">
                    <span class="acc-spec-label">Compatible Devices</span>
                    <span class="acc-spec-val" style="color:var(--accent-gold);">📱 ${prod.specs.compatibility}</span>
                  </div>
                ` : ''}
              </div>
              <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                ${prod.specs.magsafe ? `<span class="badge-pill" style="background:rgba(0,210,255,0.12); color:var(--neon-cyan); border:1px solid rgba(0,210,255,0.3); font-size:10.5px;">🧲 MagSafe Magnetic</span>` : ''}
                ${prod.specs.fastCharge ? `<span class="badge-pill" style="background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); font-size:10.5px;">⚡ PD Fast Charging</span>` : ''}
                ${prod.specs.wireless ? `<span class="badge-pill" style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:10.5px;">🔋 Qi Wireless</span>` : ''}
                ${prod.specs.digitalDisplay ? `<span class="badge-pill" style="background:rgba(224,86,253,0.12); color:#e056fd; border:1px solid rgba(224,86,253,0.3); font-size:10.5px;">📊 LED Digital Display</span>` : ''}
                ${prod.specs.anc ? `<span class="badge-pill" style="background:rgba(59,130,246,0.12); color:#3b82f6; border:1px solid rgba(59,130,246,0.3); font-size:10.5px;">🎧 Active Noise Cancelling</span>` : ''}
              </div>
            </div>
          ` : ''}

          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-bottom:20px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:var(--text-muted);">Physical Store Warranty:</span>
              <span style="color:#fff; font-weight:600;">${prod.warranty || '1 Year Store Warranty'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="color:var(--text-muted);">Stock Availability:</span>
              ${prod.stockStatus === 'on-request'
        ? `<span style="color:#f59e0b; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#f59e0b; box-shadow:0 0 8px #f59e0b;"></span> ⚡ Available on Request (Fast Sourcing)</span>`
        : (prod.stockStatus === 'inquire'
          ? `<span style="color:#25d366; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#25d366; box-shadow:0 0 8px #25d366;"></span> 💬 Inquire via WhatsApp</span>`
          : `<span style="color:#10b981; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span> 🟢 In Stock &amp; Ready to Order</span>`
        )
      }
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted);">Store Pickup &amp; Delivery:</span>
              <span style="color:var(--accent-gold); font-weight:600;">Maharagama Flagship &amp; Island-wide</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:9px;">
            <button id="qv-add-cart-btn" class="btn-primary-glow" style="width:100%; justify-content:center; padding:12px; font-size:14px; font-weight:700;" onclick="App.executeAddToCartFromQuickView(); App.closeModal('quickview-modal');">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              Add to Cart ${this.quickViewSelectedStorage ? `• ${this.quickViewSelectedStorage} ` : (prod.specs?.mah ? `• ${prod.specs.mah} ` : '')}(Rs. ${this.quickViewSelectedPrice.toLocaleString()})
            </button>

            <button type="button" class="btn-whatsapp-inquire" style="width:100%; justify-content:center; background:#25d366; color:#061b0f; font-weight:800; font-size:13.5px; border:none; border-radius:8px; padding:11px 16px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 0 16px rgba(37,211,102,0.35);" onclick="App.inquireProductStockWhatsApp('${prod.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.03C9.36 7.03 9.09 7.1 8.87 7.33C8.65 7.57 8.02 8.16 8.02 9.36C8.02 10.56 8.9 11.72 9.02 11.89C9.14 12.05 10.74 14.53 13.2 15.59C13.79 15.84 14.24 16 14.6 16.11C15.19 16.3 15.73 16.27 16.16 16.21C16.64 16.14 17.63 15.61 17.84 15.02C18.05 14.43 18.05 13.92 17.98 13.82C17.92 13.71 17.75 13.65 17.5 13.52C17.25 13.4 16.03 12.8 15.8 12.72C15.58 12.63 15.41 12.59 15.25 12.84C15.08 13.08 14.6 13.65 14.46 13.82C14.31 13.98 14.17 14 13.92 13.88C13.67 13.75 12.88 13.49 11.94 12.65C11.21 11.99 10.71 11.18 10.57 10.93C10.42 10.68 10.55 10.55 10.68 10.42C10.79 10.31 10.93 10.13 11.06 9.98C11.18 9.83 11.22 9.72 11.31 9.55C11.39 9.38 11.35 9.24 11.29 9.11C11.23 8.99 10.73 7.76 10.53 7.26C10.33 6.77 10.12 6.84 9.96 6.83C9.81 6.82 9.67 6.82 9.53 7.03Z"/></svg>
              <span>Check Live Stock &amp; Inquire on WhatsApp</span>
            </button>

            <button type="button" class="btn-glass" style="width:100%; justify-content:center; padding:10px; font-size:12.5px; color:var(--text-secondary); margin-top:4px;" onclick="App.closeQuickView()">
              ← Back to Store / Continue Browsing
            </button>
          </div>
        </div>
      </div>
    `;

    this.setQuickViewMedia(0);
    this.openModal("quickview-modal");

    try {
      const cleanHash = (window.location.hash || '').split('?prod=')[0];
      const baseHash = cleanHash && cleanHash !== '#' ? cleanHash : (this.currentView === 'shop' ? '#shop' : '#home');
      window.history.pushState({ modal: 'quickview', prodId }, '', window.location.pathname + baseHash + `?prod=${prodId}`);
    } catch(e) {}
  },

  closeQuickView() {
    this.closeModal('quickview-modal');
    this.quickViewCurrentProdId = null;
    this.pendingDirectProdId = null;
    try {
      const cleanHash = (window.location.hash || '').split('?prod=')[0];
      const hasSearch = window.location.search && window.location.search.includes('prod=');
      if (hasSearch || window.location.hash.includes('?prod=')) {
        const cleanPath = window.location.pathname + (cleanHash && cleanHash !== '#' ? cleanHash : '');
        window.history.pushState(null, '', cleanPath || '/');
      }
    } catch(e) {}
  },

  setQuickViewMedia(index) {
    if (!this.quickViewMediaList || this.quickViewMediaList.length === 0) return;
    this.quickViewActiveIndex = (index + this.quickViewMediaList.length) % this.quickViewMediaList.length;
    const item = this.quickViewMediaList[this.quickViewActiveIndex];
    const stage = document.getElementById("gallery-viewport-stage");
    if (!stage) return;

    // Render main media
    let mediaHTML = "";
    if (item.type === 'video') {
      if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
        let embedUrl = item.url;
        if (item.url.includes('watch?v=')) {
          const vidId = item.url.split('watch?v=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&controls=1`;
        } else if (item.url.includes('youtu.be/')) {
          const vidId = item.url.split('youtu.be/')[1].split('?')[0];
          embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&controls=1`;
        }
        mediaHTML = `<iframe class="gallery-video-player" src="${embedUrl}" title="Product Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        mediaHTML = `
          <video controls autoplay loop playsinline class="gallery-video-player">
            <source src="${item.url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        `;
      }
    } else {
      mediaHTML = `<img src="${item.url}" class="gallery-main-img" alt="Product Angle" onerror="this.src='assets/hero_showcase.jpg'">`;
    }

    // Include nav arrows and counter
    stage.innerHTML = `
      ${this.quickViewMediaList.length > 1 ? `
        <button class="gallery-arrow-btn prev" onclick="App.prevQuickViewMedia(event)" title="Previous Image">❮</button>
        <button class="gallery-arrow-btn next" onclick="App.nextQuickViewMedia(event)" title="Next Image">❯</button>
      ` : ''}
      <div class="gallery-counter-badge">
        <span class="badge-dot"></span>
        <span>${item.type === 'video' ? '🎬 Video Demo' : `📷 ${this.quickViewActiveIndex + 1} / ${this.quickViewMediaList.length}`}</span>
      </div>
      ${mediaHTML}
    `;

    // Highlight active thumbnail and scroll into view
    document.querySelectorAll(".gallery-thumb-item").forEach((thumb, idx) => {
      const isActive = idx === this.quickViewActiveIndex;
      thumb.classList.toggle("active", isActive);
      if (isActive) {
        thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  },

  nextQuickViewMedia(e) {
    if (e) e.stopPropagation();
    this.setQuickViewMedia(this.quickViewActiveIndex + 1);
  },

  prevQuickViewMedia(e) {
    if (e) e.stopPropagation();
    this.setQuickViewMedia(this.quickViewActiveIndex - 1);
  },

  // 5. Cart Management
  addToCart(prodId, selectedStorage = null, selectedColor = null, selectedPrice = null) {
    const products = this.getProducts();
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    // If product has options and none are selected yet, launch quickview modal
    const hasVariants = (Array.isArray(prod.storageOptions) && prod.storageOptions.length > 0) ||
      (Array.isArray(prod.colorOptions) && prod.colorOptions.length > 0);
    if (hasVariants && !selectedStorage && !selectedColor) {
      this.openQuickView(prodId);
      return;
    }

    this.closeModal("quickview-modal");
    this.executeAddToCart(prod, selectedStorage, selectedColor, selectedPrice);
  },

  executeAddToCart(prod, storage = null, color = null, customPrice = null) {
    let cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    const effectivePrice = (customPrice !== null && customPrice > 0) ? customPrice : Number(prod.price);
    const cartItemId = `${prod.id}${storage ? '-' + storage : ''}${color ? '-' + String(color).replace(/\s+/g, '') : ''}`;

    const existing = cart.find(item => (item.cartItemId && item.cartItemId === cartItemId) ||
      (item.id === prod.id && item.storage === storage && item.color === color));

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        cartItemId: cartItemId,
        id: prod.id,
        name: prod.name,
        price: effectivePrice,
        storage: storage || null,
        color: color || null,
        variant: [storage, color].filter(Boolean).join(" • "),
        image: prod.image,
        condition: prod.condition,
        batteryHealth: prod.batteryHealth || null,
        qty: 1
      });
    }

    localStorage.setItem("UH_CART", JSON.stringify(cart));
    this.updateCartBadge();
    this.renderCartDrawer();
    const variantTag = [storage, color].filter(Boolean).join(" | ");
    showToast(`🛒 Added "${prod.name}${variantTag ? ` (${variantTag})` : ''}" to your cart!`);

    // Meta Pixel AddToCart Hook (Uses genuine Catalog Product ID & quantity)
    if (typeof window !== 'undefined' && window.MetaPixel && typeof window.MetaPixel.trackAddToCart === 'function') {
      window.MetaPixel.trackAddToCart(prod, 1);
    }

    // Automatically slide in / pop up the cart drawer
    this.openCart();
  },

  openCart() {
    this.renderCartDrawer();
    document.getElementById("cart-drawer").classList.add("active");
    document.getElementById("cart-drawer-overlay").classList.add("active");
  },

  closeCart() {
    document.getElementById("cart-drawer").classList.remove("active");
    document.getElementById("cart-drawer-overlay").classList.remove("active");
  },

  renderCartDrawer() {
    const cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    const scrollContainer = document.getElementById("cart-items-scroll");
    const subtotalElem = document.getElementById("cart-subtotal");
    const checkoutBtn = document.getElementById("cart-checkout-btn");

    if (!scrollContainer) return;

    if (cart.length === 0) {
      scrollContainer.innerHTML = `
        <div style="text-align:center; padding: 60px 10px; color:var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; color:#475569;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <p style="font-size:15px; color:#94a3b8; font-weight:600;">Your cart is empty</p>
          <small>Explore iPhones, GaN chargers & MagSafe accessories.</small>
        </div>
      `;
      if (subtotalElem) subtotalElem.textContent = "Rs. 0";
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    let subtotal = 0;
    scrollContainer.innerHTML = cart.map(item => {
      subtotal += item.price * item.qty;
      const key = item.cartItemId || item.id;
      return `
        <div class="cart-item-row">
          <img src="${item.image}" class="cart-item-thumb" alt="" onerror="this.src='https://placehold.co/80x80/0f172a/00d2ff?text=UH'">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            ${(item.storage || item.color) ? `
              <div class="cart-item-variant-chip">
                ${item.storage ? `<span>💾 ${item.storage}</span>` : ''}
                ${item.color ? `<span>🎨 ${item.color}</span>` : ''}
              </div>
            ` : ''}
            ${item.condition ? `<div style="font-size:11px; color:#94a3b8; margin:2px 0;">${item.condition}</div>` : ''}
            <div class="item-price">Rs. ${(item.price * item.qty).toLocaleString()}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:6px;">
              <div class="cart-stepper">
                <button onclick="App.updateCartQty('${key}', -1)">-</button>
                <span>${item.qty}</span>
                <button onclick="App.updateCartQty('${key}', 1)">+</button>
              </div>
              <button class="remove-cart-btn" onclick="App.removeCartItem('${key}')">Remove</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    if (subtotalElem) subtotalElem.textContent = `Rs. ${subtotal.toLocaleString()}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
  },

  updateCartQty(key, delta) {
    let cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    const item = cart.find(i => (i.cartItemId && i.cartItemId === key) || i.id === key);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        cart = cart.filter(i => (i.cartItemId ? i.cartItemId !== key : i.id !== key));
      }
      localStorage.setItem("UH_CART", JSON.stringify(cart));
      this.updateCartBadge();
      this.renderCartDrawer();
    }
  },

  removeCartItem(key) {
    let cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    cart = cart.filter(i => (i.cartItemId ? i.cartItemId !== key : i.id !== key));
    localStorage.setItem("UH_CART", JSON.stringify(cart));
    this.updateCartBadge();
    this.renderCartDrawer();
    showToast("Item removed from cart.");
  },

  updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById("cart-count-badge");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "flex" : "none";
    }
  },

  // 6. Wishlist
  toggleWishlist(prodId, btnElem) {
    let wishlist = JSON.parse(localStorage.getItem("UH_WISHLIST")) || [];
    const exists = wishlist.includes(prodId);

    if (exists) {
      wishlist = wishlist.filter(id => id !== prodId);
      if (btnElem) btnElem.classList.remove("active");
      showToast("Removed from Wishlist.");
    } else {
      wishlist.push(prodId);
      if (btnElem) btnElem.classList.add("active");
      showToast("Saved to your Wishlist! ❤️");
    }

    localStorage.setItem("UH_WISHLIST", JSON.stringify(wishlist));
    this.updateWishlistBadge();
  },

  updateWishlistBadge() {
    const wishlist = JSON.parse(localStorage.getItem("UH_WISHLIST")) || [];
    const badge = document.getElementById("wishlist-count-badge");
    if (badge) {
      badge.textContent = wishlist.length;
      badge.style.display = wishlist.length > 0 ? "flex" : "none";
    }
  },

  // 7. Checkout Process
  openCheckout() {
    if (!this.currentUser) {
      this.openCustomerAuthModal("Please sign in or create an account to proceed with checkout.");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    if (cart.length === 0) {
      showToast("Your cart is empty!");
      return;
    }

    this.closeCart();
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const summaryElem = document.getElementById("checkout-items-summary");
    if (summaryElem) {
      summaryElem.innerHTML = `
        <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:12px; margin-bottom:16px;">
          ${cart.map(i => {
        const variant = [i.storage, i.color].filter(Boolean).join(" • ");
        return `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
              <span>${i.name} ${variant ? `<span style="color:var(--neon-cyan); font-size:11.5px; font-weight:600;">(${variant})</span> ` : ''}× ${i.qty}</span>
              <span style="color:var(--neon-cyan); font-weight:700;">Rs. ${(i.price * i.qty).toLocaleString()}</span>
            </div>`;
      }).join("")}
          <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:800; font-size:15px; color:#fff;">
            <span>Total Payable:</span>
            <span style="color:var(--neon-cyan);">Rs. ${subtotal.toLocaleString()}</span>
          </div>
        </div>
      `;
    }

    // Pre-fill user data if available
    const nameField = document.getElementById("checkout-name");
    if (nameField && this.currentUser.name && !nameField.value) {
      nameField.value = this.currentUser.name;
    }
    const phoneField = document.getElementById("checkout-phone");
    if (phoneField && this.currentUser.phone && !phoneField.value) {
      phoneField.value = this.currentUser.phone;
    }
    const emailField = document.getElementById("checkout-email");
    if (emailField && this.currentUser.email && !emailField.value) {
      emailField.value = this.currentUser.email;
    }

    // Initialize Payment Gateway selector & Koko installment calculator
    if (typeof PaymentGateway !== 'undefined') {
      const activeMethod = PaymentGateway.selectedMethod || 'payhere';
      PaymentGateway.selectPaymentMethod(activeMethod);
      PaymentGateway.updateKokoCalculator(subtotal);
    }

    this.openModal("checkout-modal");

    // Meta Pixel InitiateCheckout Hook (Catalog IDs array & total value)
    if (typeof window !== 'undefined' && window.MetaPixel && typeof window.MetaPixel.trackInitiateCheckout === 'function') {
      window.MetaPixel.trackInitiateCheckout(cart, subtotal);
    }
  },

  handleCompleteCheckout(e) {
    e.preventDefault();
    const name = document.getElementById("checkout-name").value.trim();
    const phone = document.getElementById("checkout-phone").value.trim();
    const address = document.getElementById("checkout-address").value.trim();
    const deliveryMethod = document.getElementById("checkout-delivery-method").value;

    // Detect payment method from radio selector or fallback select
    const methodVal = (document.getElementById("checkout-payment-method-val")?.value ||
      (typeof PaymentGateway !== 'undefined' ? PaymentGateway.selectedMethod : null) ||
      (document.getElementById("checkout-payment-method")?.value) ||
      'payhere').toLowerCase();

    let displayPaymentName = "Cash on Delivery / Store Pickup";
    if (methodVal.includes("payhere")) displayPaymentName = "PayHere Sri Lanka";
    else if (methodVal.includes("stripe")) displayPaymentName = "Stripe International";
    else if (methodVal.includes("koko")) displayPaymentName = "Koko 3-Month BNPL";
    else if (methodVal.includes("card")) displayPaymentName = "Credit / Debit Card on Delivery";

    const cart = JSON.parse(localStorage.getItem("UH_CART")) || [];
    if (!name) {
      alert("Please provide your full name.");
      document.getElementById("checkout-name")?.focus();
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (!phone || cleanDigits.length < 9) {
      alert("⚠️ WhatsApp Contact Number is strictly required!\n\nPlease enter a valid WhatsApp number (e.g. 0771234567 or 0740219239) so Universe Hub can contact you for order confirmation.");
      const pField = document.getElementById("checkout-phone");
      if (pField) {
        pField.focus();
        pField.style.borderColor = "#ef4444";
      }
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    // Save/update phone to user profile so customer doesn't have to re-enter it next time
    if (this.currentUser) {
      this.currentUser.phone = phone;
      localStorage.setItem("UH_AUTH_USER", JSON.stringify(this.currentUser));
      let users = JSON.parse(localStorage.getItem("UH_USERS")) || [];
      const idx = users.findIndex(u => u.id === this.currentUser.id || (u.email && u.email === this.currentUser.email));
      if (idx !== -1) {
        users[idx].phone = phone;
        localStorage.setItem("UH_USERS", JSON.stringify(users));
      }
    }

    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const orderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newOrder = {
      id: orderId,
      customerName: name,
      phone: phone,
      whatsapp: phone,
      email: document.getElementById("checkout-email") ? document.getElementById("checkout-email").value.trim() : "",
      address: address || "Physical Store Pickup (Maharagama Flagship)",
      date: formattedDate,
      items: cart,
      total: subtotal,
      deliveryMethod: deliveryMethod,
      paymentMethod: displayPaymentName,
      method: deliveryMethod + " (" + displayPaymentName + ")",
      status: deliveryMethod.includes("Store") ? "Ready for Store Pickup" : "Processing"
    };

    // If online gateway is selected, transition seamlessly to the IPG modal
    if (methodVal === 'payhere' && typeof PaymentGateway !== 'undefined') {
      this.closeModal("checkout-modal");
      PaymentGateway.openPayHereModal(newOrder);
      return;
    }

    if (methodVal === 'stripe' && typeof PaymentGateway !== 'undefined') {
      this.closeModal("checkout-modal");
      PaymentGateway.openStripeModal(newOrder);
      return;
    }

    // Otherwise, direct placement (COD or Koko BNPL)
    let orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    orders.unshift(newOrder);
    localStorage.setItem("UH_ORDERS", JSON.stringify(orders));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.createOrder === "function") {
      window.SupabaseSync.createOrder(newOrder);
    }

    // Clear cart
    localStorage.setItem("UH_CART", JSON.stringify([]));
    this.updateCartBadge();
    this.closeModal("checkout-modal");

    showToast(`Order ${orderId} confirmed! Tax invoice generated.`);

    // Trigger rich Order Success & PDF Invoice Modal
    if (typeof InvoiceService !== 'undefined') {
      InvoiceService.showOrderSuccess(newOrder);
    }
  },

  // 8. Repair Inquiry & Quotation System
  setupRepairEstimator() {
    // Automatically trigger initial track preview for default demo code
    setTimeout(() => {
      const trackInput = document.getElementById("track-repair-input");
      if (trackInput && trackInput.value) {
        this.handleTrackRepair();
      }
    }, 400);
  },

  openRepairTrackingModal(trackingCode = "") {
    const modal = document.getElementById("repair-tracking-modal");
    if (!modal) return;
    const input = document.getElementById("track-repair-input");
    if (input && trackingCode) {
      input.value = trackingCode;
      this.handleTrackRepair();
    }
    this.openModal("repair-tracking-modal");
    if (input) setTimeout(() => input.focus(), 100);
  },

  openWhatsAppRepairQuote() {
    const devEl = document.getElementById("estimator-device");
    const srvEl = document.getElementById("estimator-service");
    const device = devEl ? devEl.value.trim() : "Mobile Phone";
    const service = srvEl ? srvEl.value.trim() : "General Diagnostic & Repair";

    const msg = `Hello Universe Hub Repair Desk (Maharagama)! 👋\n\nI would like to get a price quotation and part availability for my device:\n• Device Model: ${device || 'Mobile Phone'}\n• Service / Fault: ${service || 'General Diagnostic'}\n\nCould you please let me know the current repair cost and how long it will take? Thank you!`;
    const settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || {};
    const rawWa = (settings.whatsapp || settings.phone || "0740219239").replace(/[^0-9]/g, "");
    let waPhone = rawWa;
    if (waPhone.startsWith("0")) waPhone = "94" + waPhone.substring(1);
    else if (!waPhone.startsWith("94")) waPhone = "94" + waPhone;

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  openRepairBookingModal() {
    const devEl = document.getElementById("estimator-device");
    const srvEl = document.getElementById("estimator-service");
    const bookDev = document.getElementById("book-cust-device");
    const bookIss = document.getElementById("book-cust-issue");

    if (devEl && bookDev && devEl.value.trim()) {
      bookDev.value = devEl.value.trim();
    }
    if (srvEl && bookIss && srvEl.value.trim()) {
      bookIss.value = srvEl.value.trim();
    }

    this.openModal("repair-booking-modal");
  },

  handleBookRepairAppointment(e) {
    e.preventDefault();
    const name = document.getElementById("book-cust-name").value.trim();
    const phone = document.getElementById("book-cust-phone").value.trim();
    const device = document.getElementById("book-cust-device").value;
    const issue = document.getElementById("book-cust-issue").value;
    const date = document.getElementById("book-cust-date").value;

    if (!name || !phone) {
      alert("Please fill your name and phone number.");
      return;
    }

    const trackingCode = "UH-" + Math.floor(1000 + Math.random() * 9000);
    const newJob = {
      trackingCode,
      customerName: name,
      phone,
      device,
      issue,
      status: "Received",
      stepIndex: 1,
      estimatedCompletion: date || "Today at Maharagama Counter",
      desk: "In-Store Express Bay",
      cost: 0,
      notes: "Booked online for Physical Store inspection."
    };

    let repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    repairs.unshift(newJob);
    localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.createRepairOrder === "function") {
      window.SupabaseSync.createRepairOrder(newJob);
    }

    // Auto Email Alert to Store Owner
    if (typeof NotificationService !== 'undefined') {
      NotificationService.sendRepairEmail(newJob);
    }

    this.closeModal("repair-booking-modal");

    // Auto populate tracking input with new code
    const trackInp = document.getElementById("track-repair-input");
    if (trackInp) {
      trackInp.value = trackingCode;
      this.handleTrackRepair();
    }

    const sendWa = confirm(`⚡ Repair Slot Reserved!\n\nTracking Code: ${trackingCode}\nDevice: ${device}\n\nWould you like to send this repair reservation directly to Universe Hub WhatsApp Desk (074-0219239)?`);
    if (sendWa) {
      const waMsg = `Hello Universe Hub Repair Desk! I have reserved an in-store repair slot for my ${device}.\n\n• Job Tracking ID: ${trackingCode}\n• Customer: ${name}\n• Contact / WhatsApp: ${phone}\n• Fault: ${issue}\n• Preferred Visit Time: ${date || 'Today'}\n\nPlease confirm desk availability.`;
      const settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || {};
      const rawWa = (settings.whatsapp || settings.phone || "0740219239").replace(/[^0-9]/g, "");
      let waPhone = rawWa;
      if (waPhone.startsWith("0")) waPhone = "94" + waPhone.substring(1);
      else if (!waPhone.startsWith("94")) waPhone = "94" + waPhone;
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`, '_blank');
    }
    showToast(`Repair job ${trackingCode} reserved!`);
  },

  // 9. Real-time Repair Status Tracking
  async handleTrackRepair() {
    const input = document.getElementById("track-repair-input");
    const code = input ? input.value.trim().toUpperCase() : "";
    const card = document.getElementById("track-result-container");
    if (!card) return;

    const modal = document.getElementById("repair-tracking-modal");
    if (modal && !modal.classList.contains("active")) {
      this.openModal("repair-tracking-modal");
    }

    if (!code) {
      card.innerHTML = `
        <div style="padding:18px; text-align:center; color:var(--text-muted); font-size:13.5px;">
          Please enter your Job Tracking ID (e.g. UH-8821) from your receipt or booking confirmation.
        </div>
      `;
      card.classList.add("active");
      return;
    }

    let repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    let record = repairs.find(r =>
      (r.trackingCode || '').toUpperCase() === code ||
      (r.ticketNumber || '').toUpperCase() === code ||
      (r.id || '').toUpperCase() === code
    );

    // Fallback to DEMO_REPAIR_ORDERS if not found in custom repairs
    if (!record && typeof DEMO_REPAIR_ORDERS !== 'undefined' && Array.isArray(DEMO_REPAIR_ORDERS)) {
      record = DEMO_REPAIR_ORDERS.find(r =>
        (r.trackingCode || '').toUpperCase() === code ||
        (r.ticketNumber || '').toUpperCase() === code ||
        (r.id || '').toUpperCase() === code
      );
    }

    // If not found in localStorage or demo, attempt Supabase Cloud Query
    if (!record && window.SupabaseSync && window.SupabaseSync.client && window.SupabaseSync.isConnected) {
      try {
        const { data } = await window.SupabaseSync.client
          .from("repair_orders")
          .select("*")
          .or(`ticket_number.ilike.${code},id.ilike.${code}`)
          .limit(1);
        if (data && data.length > 0) {
          const row = data[0];
          record = {
            trackingCode: row.ticket_number || row.id,
            customerName: row.customer_name,
            phone: row.phone,
            device: row.device_model || `${row.device_brand || ''} ${row.device_model || ''}`.trim() || "Mobile Device",
            issue: row.issue_description || row.issue_type || "Diagnostic",
            status: row.status || "Received",
            stepIndex: row.status === "Completed" ? 5 : (row.status === "Ready for Pickup" ? 4 : (row.status === "In Progress" || row.status === "In Process" ? 3 : (row.status === "Diagnostic" ? 2 : 1))),
            estimatedCompletion: "In-Store Lab",
            desk: "Maharagama Counter Desk",
            cost: Number(row.estimated_cost || 0),
            notes: row.notes || "Synced from Universe Hub Cloud Lab."
          };
        }
      } catch (e) { }
    }

    if (!record) {
      card.innerHTML = `
        <div style="padding:18px; text-align:center; color:#f87171; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px;">
          <div style="font-size:22px; margin-bottom:6px;">⚠️</div>
          <div style="font-weight:700; margin-bottom:4px;">No repair record found for: <b>${code}</b></div>
          <p style="font-size:12.5px; color:var(--text-secondary); margin:0;">
            Please verify the Tracking Code on your physical store receipt or booking confirmation, or contact our Maharagama desk directly on WhatsApp.
          </p>
        </div>
      `;
      card.classList.add("active");
      return;
    }

    // Determine current step index (1 to 5)
    let currentStep = record.stepIndex || 1;
    const stNorm = (record.status || '').toLowerCase();
    if (stNorm.includes('ready')) currentStep = 4;
    else if (stNorm.includes('progress') || stNorm.includes('repair')) currentStep = 3;
    else if (stNorm.includes('diag')) currentStep = 2;
    else if (stNorm.includes('complete')) currentStep = 5;
    else if (stNorm.includes('receive')) currentStep = 1;

    const steps = [
      { num: 1, label: "Received", desc: "Checked in at Maharagama" },
      { num: 2, label: "Diagnostic", desc: "Inspection & Testing" },
      { num: 3, label: "In Process", desc: "Undergoing Repair" },
      { num: 4, label: "Ready for Pickup", desc: "Completed & Ready!" },
      { num: 5, label: "Completed", desc: "Delivered to Customer" }
    ];

    // Status Badge Details & Banner
    let badgeBg = "rgba(0,210,255,0.15)";
    let badgeColor = "var(--neon-cyan)";
    let badgeBorder = "rgba(0,210,255,0.3)";
    let statusText = record.status || "Received";
    let statusBannerHtml = "";

    if (currentStep === 4) {
      badgeBg = "rgba(16,185,129,0.2)";
      badgeColor = "#34d399";
      badgeBorder = "rgba(16,185,129,0.4)";
      statusText = "✅ Ready for Pickup";
      statusBannerHtml = `
        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:12px 14px; margin-top:14px; color:#34d399; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🎉</span>
          <span><b>Your phone is ready for pickup!</b> You can collect it right now from our Maharagama Flagship Store front counter (188/8c High Level Rd).</span>
        </div>
      `;
    } else if (currentStep === 3) {
      badgeBg = "rgba(56,189,248,0.2)";
      badgeColor = "#38bdf8";
      badgeBorder = "rgba(56,189,248,0.4)";
      statusText = "⚙️ In Process (Repairing)";
      statusBannerHtml = `
        <div style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:12px 14px; margin-top:14px; color:#38bdf8; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">⚙️</span>
          <span><b>Repair in progress:</b> Certified technician is currently servicing your device using genuine parts. Est. Completion: ${record.estimatedCompletion || 'Today'}.</span>
        </div>
      `;
    } else if (currentStep === 2) {
      badgeBg = "rgba(245,158,11,0.2)";
      badgeColor = "#fbbf24";
      badgeBorder = "rgba(245,158,11,0.4)";
      statusText = "🔍 Diagnostic / Inspection";
      statusBannerHtml = `
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:12px 14px; margin-top:14px; color:#fbbf24; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🔍</span>
          <span><b>Diagnostic in progress:</b> Tech bench is testing display, power rails, and logic board components.</span>
        </div>
      `;
    } else if (currentStep === 5) {
      badgeBg = "rgba(34,197,94,0.2)";
      badgeColor = "#4ade80";
      badgeBorder = "rgba(34,197,94,0.4)";
      statusText = "🎉 Completed & Collected";
      statusBannerHtml = `
        <div style="background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.3); border-radius:8px; padding:12px 14px; margin-top:14px; color:#4ade80; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🏆</span>
          <span><b>Device Collected:</b> Repair completed and device handed over to customer. Warranty is active.</span>
        </div>
      `;
    } else {
      badgeBg = "rgba(147,51,234,0.2)";
      badgeColor = "#c084fc";
      badgeBorder = "rgba(147,51,234,0.4)";
      statusText = "📥 Received at Store Desk";
      statusBannerHtml = `
        <div style="background:rgba(147,51,234,0.12); border:1px solid rgba(147,51,234,0.3); border-radius:8px; padding:12px 14px; margin-top:14px; color:#c084fc; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">📥</span>
          <span><b>Device received:</b> Safely stored in our Maharagama repair queue. Technician inspection starting shortly.</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Job Tracking ID</span>
          <h4 style="font-size:20px; color:var(--neon-cyan); font-weight:800; font-family:monospace; margin:2px 0 0;">${record.trackingCode}</h4>
        </div>
        <div style="text-align:right;">
          <span class="badge-pill" style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-size:12px; font-weight:700; padding:4px 10px;">
            ${statusText}
          </span>
        </div>
      </div>

      <div style="font-size:13.5px; line-height:1.6; margin-bottom:14px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px;">
        <div><b>Device:</b> <span style="color:#fff;">${record.device}</span></div>
        <div><b>Reported Fault:</b> <span style="color:#94a3b8;">${record.issue}</span></div>
        <div><b>Lab Bench:</b> <span style="color:#94a3b8;">${record.desk || 'Maharagama Flagship Tech Bay'}</span></div>
        <div><b>Ready Time:</b> <span style="color:${badgeColor}; font-weight:700;">${record.estimatedCompletion || 'In Service'}</span></div>
      </div>

      <div class="status-timeline">
        ${steps.map(s => {
      let statusClass = "";
      if (s.num < currentStep) statusClass = "completed";
      else if (s.num === currentStep) statusClass = "active";
      return `
            <div class="status-node ${statusClass}">
              <div class="node-icon">${s.num < currentStep ? '✓' : s.num}</div>
              <div class="node-label">${s.label}</div>
            </div>
          `;
    }).join("")}
      </div>

      ${statusBannerHtml}

      ${record.notes ? `
        <div style="background:rgba(0,210,255,0.06); border-radius:8px; padding:10px 14px; font-size:12px; color:#cbd5e1; margin-top:12px; border:1px solid rgba(0,210,255,0.15);">
          <b style="color:var(--neon-cyan);">Technician Note:</b> ${record.notes}
        </div>
      ` : ''}

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
        <a href="https://wa.me/94740219239?text=${encodeURIComponent(`Hello Universe Hub Repair Desk! I am checking on my device repair (${record.device}) with Job Tracking ID #${record.trackingCode}. Current status shown online is "${statusText}".`)}"
           target="_blank" class="btn-primary-glow" style="background:#25d366; box-shadow:0 0 16px rgba(37,211,102,0.3); font-size:12px; padding:8px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <span>💬</span>
          <span>WhatsApp Tech Desk (074-0219239)</span>
        </a>
        <button class="btn-glass" onclick="showToast('🔔 Real-time status notifications active for ${record.phone || 'your device'}!')" style="font-size:12px; padding:8px 14px;">
          🔔 Store Updates Subscribed
        </button>
      </div>
    `;

    card.classList.add("active");
  },

  // 10. Customer Reviews
  renderReviews() {
    const container = document.getElementById("reviews-grid-container");
    if (!container) return;

    const reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];

    container.innerHTML = reviews.map(rev => `
      <div class="review-card">
        <div class="reviewer-header">
          <div class="reviewer-meta">
            <div class="reviewer-avatar">${rev.avatar || rev.author.charAt(0)}</div>
            <div>
              <div class="reviewer-name">${rev.author}</div>
              <div class="visit-badge">✓ ${rev.visitType || 'Verified Physical Store Visitor'}</div>
            </div>
          </div>
          <div class="review-stars">${'★'.repeat(rev.rating)}</div>
        </div>

        <p class="review-comment">"${rev.comment}"</p>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span class="review-device-tag">📱 ${rev.service || 'Genuine Apple & Accessories'}</span>
          <span style="font-size:11px; color:var(--text-muted);">${rev.date || 'Recent'}</span>
        </div>

        ${rev.storeReply ? `
          <div class="store-reply-box">
            <span>Universe Hub Store Team:</span>
            ${rev.storeReply}
          </div>
        ` : ''}
      </div>
    `).join("");
  },

  openStoreReviewsModal() {
    this.renderReviews();
    this.openModal("modal-store-reviews");
  },

  closeStoreReviewsModal() {
    this.closeModal("modal-store-reviews");
  },

  openWriteReviewModal() {
    this.openModal("review-modal");
  },

  handleSubmitStoreReview() {
    const name = document.getElementById("review-author-name").value.trim();
    const service = document.getElementById("review-service-input").value.trim();
    const comment = document.getElementById("review-comment-input").value.trim();
    const rating = parseInt(document.getElementById("review-input-rating").value, 10) || 5;

    if (!name || !comment) {
      alert("Please enter your name and review details.");
      return;
    }

    const newReview = {
      id: "rev-" + Date.now(),
      author: name,
      rating,
      date: "Today",
      visitType: "Verified Physical Store Customer",
      service: service || "Store Visit & Purchases",
      verified: true,
      avatar: name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
      comment,
      storeReply: "Thank you for visiting Universe Hub! We appreciate your honest feedback."
    };

    let reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
    reviews.unshift(newReview);
    localStorage.setItem("UH_REVIEWS", JSON.stringify(reviews));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.createReview === "function") {
      window.SupabaseSync.createReview(newReview);
    }

    document.getElementById("store-review-form").reset();
    this.closeModal("review-modal");
    this.renderReviews();
    showToast("Thank you! Your store review has been published.");
  }
};

// Expose App globally
window.App = App;
window.isProductInCategory = App.isProductInCategory.bind(App);

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

