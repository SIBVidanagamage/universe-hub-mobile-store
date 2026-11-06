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

  init() {
    this.loadUserSession();
    this.applyStoreSettings();
    this.renderNavbar();
    this.renderCatalogTabs();
    this.renderBrandFilterBar();
    this.renderCategories();
    this.renderBrandsSection();
    this.renderCatalog();
    this.renderReviews();
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.bindEvents();
    this.setupRepairEstimator();

    // Fetch fresh cloud products & settings if Supabase is connected
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchProducts === "function") {
      window.SupabaseSync.fetchProducts().then(() => {
        this.renderCatalog();
        this.renderCategories();
        this.renderBrandsSection();
      });
    }
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchStoreSettings === "function") {
      window.SupabaseSync.fetchStoreSettings().then(() => {
        this.applyStoreSettings();
      });
    }

    // Check if URL has admin hash
    if (window.location.hash === "#admin") {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.toggleAdminView(true);
      } else {
        this.requestAdminAccess();
      }
    }
  },

  applyStoreSettings() {
    let settings = typeof DEFAULT_STORE_SETTINGS !== 'undefined' ? DEFAULT_STORE_SETTINGS : {};
    try {
      const saved = localStorage.getItem("UH_STORE_SETTINGS");
      if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch (e) {
      // keep fallback
    }

    // 1. Hero Showcase Image (Banner)
    const heroImg = document.getElementById("hero-showcase-img");
    if (heroImg && settings.heroBannerImg) {
      heroImg.src = settings.heroBannerImg;
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
    } catch (e) {}

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
      const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
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
      window.location.hash = "";
      this.renderCatalog();
    }
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

    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];

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
          <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('brand-new-iphones')">
            <span class="dropdown-link-icon">🍏</span>
            <div class="dropdown-link-text">
              <strong>Brand New iPhones</strong>
              <small>Sealed Box with Apple Care Official</small>
            </div>
            <span class="dropdown-badge-count">${products.filter(p => p.category === 'brand-new-iphones').length}</span>
          </a>
          <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('used-iphones')">
            <span class="dropdown-link-icon">🔄</span>
            <div class="dropdown-link-text">
              <strong>Certified Pre-Owned iPhones</strong>
              <small>Tested Grade A+ with Store Warranty</small>
            </div>
            <span class="dropdown-badge-count">${products.filter(p => p.category === 'used-iphones').length}</span>
          </a>
          <div class="dropdown-divider"></div>
          <a href="#catalog-section" class="dropdown-footer-link" onclick="App.filterByCategory('iphones')">
            <span>View All iPhones & Models →</span>
          </a>
        </div>
      </li>

      <!-- 3. Accessories Dropdown -->
      <li class="nav-dropdown-item">
        <a href="#catalog-section" class="nav-dropdown-trigger ${isAccessoryActive ? 'active' : ''}" onclick="App.filterByCategory('accessories'); return false;">
          <span>⚡ Accessories</span>
          <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="nav-dropdown-menu dropdown-menu-wide">
          <div class="dropdown-header">BROWSE ACCESSORIES BY TYPE</div>
          <div class="dropdown-grid-2col">
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('chargers')">
              <span class="dropdown-link-icon">⚡</span>
              <div class="dropdown-link-text">
                <strong>Fast Chargers &amp; GaN</strong>
                <small>65W-100W Anker, Ugreen &amp; Baseus</small>
              </div>
            </a>
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('cables')">
              <span class="dropdown-link-icon">🔌</span>
              <div class="dropdown-link-text">
                <strong>Charging Cables</strong>
                <small>240W Braided Type-C &amp; Lightning</small>
              </div>
            </a>
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('back-covers')">
              <span class="dropdown-link-icon">🛡️</span>
              <div class="dropdown-link-text">
                <strong>Back Covers &amp; Cases</strong>
                <small>MagSafe, Spigen &amp; Carbon Fiber</small>
              </div>
            </a>
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('tempered-glass')">
              <span class="dropdown-link-icon">📱</span>
              <div class="dropdown-link-text">
                <strong>Tempered Glass</strong>
                <small>9H Sapphire &amp; Privacy Protectors</small>
              </div>
            </a>
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('camera-protectors')">
              <span class="dropdown-link-icon">📸</span>
              <div class="dropdown-link-text">
                <strong>Camera Protectors</strong>
                <small>Titanium Individual Lens Rings</small>
              </div>
            </a>
            <a href="#catalog-section" class="dropdown-link" onclick="App.filterByCategory('audio')">
              <span class="dropdown-link-icon">🎧</span>
              <div class="dropdown-link-text">
                <strong>Audio &amp; AirPods</strong>
                <small>AirPods Pro, Earphones &amp; Hi-Fi</small>
              </div>
            </a>
          </div>
          <div class="dropdown-divider"></div>
          <a href="#catalog-section" class="dropdown-footer-link" onclick="App.filterByCategory('accessories')">
            <span>Explore All 100% Genuine Accessories →</span>
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
              return `
                <a href="#catalog-section" class="dropdown-brand-card" onclick="App.filterByBrand('${b.id}')">
                  <div class="brand-card-top">
                    <span class="brand-emoji">${b.icon || '🏷️'}</span>
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
      <li><a href="#store-reviews">⭐ Store Reviews (4.9★)</a></li>
      <li><a href="#store-location">📍 Physical Shop</a></li>
    `;

    navUl.innerHTML = html;
  },

  // 2. Dynamic Catalog Tabs Bar (Categories)
  renderCatalogTabs() {
    const tabsBar = document.getElementById("catalog-tabs-bar");
    if (!tabsBar) return;

    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
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

    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const filterBrands = brands.filter(b => b.inFilter !== false);
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];

    const getCount = (bName, bId) => {
      return products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === bName.toLowerCase() || pb === bId.toLowerCase();
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
          return `
            <button class="brand-filter-pill ${isSel ? 'active' : ''}" onclick="App.filterByBrand('${b.id}')">
              <span>${b.icon || '🏷️'} ${b.name}</span>
              <span class="brand-pill-count">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    bar.innerHTML = html;
  },

  // 4. Categories Grid on Homepage (with safe icon fallback)
  renderCategories() {
    const container = document.getElementById("category-grid-container");
    if (!container) return;

    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];

    container.innerHTML = categories.map(cat => {
      const count = products.filter(p => {
        if (cat.id === "brand-new-iphones") return p.category === "brand-new-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Brand New"));
        if (cat.id === "used-iphones") return p.category === "used-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Used"));
        if (cat.id === "back-covers") return p.category === "back-covers" || p.category === "cases";
        return p.category === cat.id || p.mainCategory === cat.id;
      }).length;

      const safeIcon = this.getSafeCategoryIcon(cat);

      return `
        <div class="category-card" onclick="App.filterByCategory('${cat.id}')">
          <div class="cat-icon-frame">
            <span style="font-size:26px;">${safeIcon}</span>
          </div>
          <div class="cat-name">${cat.name}</div>
          <div class="cat-count">${count} Products</div>
        </div>
      `;
    }).join("");
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

    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];

    container.innerHTML = brands.map(b => {
      const count = products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === b.name.toLowerCase() || pb === b.id.toLowerCase();
      }).length;

      return `
        <div class="brand-feature-card" onclick="App.filterByBrand('${b.id}')">
          <div class="brand-feat-icon-box">${b.icon || '🏷️'}</div>
          <div class="brand-feat-content">
            <div class="brand-feat-title">${b.name}</div>
            <div class="brand-feat-sub">${b.tagline || 'Original Products'}</div>
          </div>
          <span class="brand-feat-badge">${count} in stock</span>
        </div>
      `;
    }).join("");
  },

  // Filter actions
  filterByCategory(catId) {
    if (catId === "repair") {
      const rep = document.getElementById("repair-center");
      if (rep) rep.scrollIntoView({ behavior: "smooth" });
      return;
    }

    this.activeCategory = catId;
    this.renderNavbar();
    this.renderCatalogTabs();
    this.renderCatalog();

    const catalogSec = document.getElementById("catalog-section");
    if (catalogSec) catalogSec.scrollIntoView({ behavior: "smooth" });
  },

  filterByBrand(brandId) {
    this.activeBrand = brandId;
    this.renderNavbar();
    this.renderBrandFilterBar();
    this.renderCatalog();

    const catalogSec = document.getElementById("catalog-section");
    if (catalogSec) catalogSec.scrollIntoView({ behavior: "smooth" });
  },

  // 6. Product Catalog Rendering (Filters by BOTH Category & Brand)
  renderCatalog() {
    const container = document.getElementById("products-catalog-container");
    if (!container) return;

    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    let filtered = products;

    // Filter by Category
    if (this.activeCategory !== "all") {
      filtered = filtered.filter(p => {
        if (this.activeCategory === "brand-new-iphones" || this.activeCategory === "brand-new") {
          return p.category === "brand-new-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Brand New"));
        }
        if (this.activeCategory === "used-iphones" || this.activeCategory === "used") {
          return p.category === "used-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Used"));
        }
        if (this.activeCategory === "iphones") {
          return p.mainCategory === "iphones" || p.category === "brand-new-iphones" || p.category === "used-iphones";
        }
        if (this.activeCategory === "accessories") {
          return p.mainCategory === "accessories" || (p.category !== "brand-new-iphones" && p.category !== "used-iphones");
        }
        if (this.activeCategory === "cases" || this.activeCategory === "back-covers") {
          return p.category === "back-covers" || p.category === "cases";
        }
        return p.category === this.activeCategory || p.subCategory === this.activeCategory;
      });
    }

    // Filter by Brand
    if (this.activeBrand !== "all") {
      const targetBrand = this.activeBrand.toLowerCase();
      filtered = filtered.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === targetBrand || pb.includes(targetBrand);
      });
    }

    if (filtered.length === 0) {
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

    container.innerHTML = filtered.map(prod => {
      const isWishlisted = wishlist.includes(prod.id);
      const prodBrand = prod.brand || 'Apple';

      const hasStorageVariants = Array.isArray(prod.storageOptions) && prod.storageOptions.length > 0;
      const hasColorVariants = Array.isArray(prod.colorOptions) && prod.colorOptions.length > 0;
      const minPrice = hasStorageVariants ? Math.min(...prod.storageOptions.map(t => Number(t.price) || prod.price)) : prod.price;

      const isUsed = prod.condition && !prod.condition.toLowerCase().includes("brand new");
      let conditionLabel = "Brand New (Sealed)";
      if (isUsed) {
        if (prod.condition.includes("Grade A+")) conditionLabel = "Grade A+ (99% Mint)";
        else if (prod.condition.includes("Grade A")) conditionLabel = "Grade A (95%-98%)";
        else if (prod.condition.includes("Grade B")) conditionLabel = "Grade B (90% Good)";
        else conditionLabel = prod.condition;
      }

      return `
        <div class="product-card" data-id="${prod.id}">
          <div class="card-top-badges">
            ${isUsed 
              ? `<span class="badge-pill badge-used">${conditionLabel}</span>` 
              : `<span class="badge-pill badge-new">Brand New Sealed</span>`
            }
            <span class="badge-pill badge-brand" onclick="event.stopPropagation(); App.filterByBrand('${prodBrand.toLowerCase()}');" title="Filter by ${prodBrand}">
              🏷️ ${prodBrand}
            </span>
            ${prod.batteryHealth ? `<span class="badge-pill badge-battery">🔋 ${prod.batteryHealth}${typeof prod.batteryHealth === 'number' || !String(prod.batteryHealth).includes('%') ? '%' : ''}</span>` : ''}
            ${prod.discount ? `<span class="badge-pill badge-discount">${prod.discount}</span>` : ''}
          </div>

          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="App.toggleWishlist('${prod.id}', this)" title="Add to Wishlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>

          <div class="card-media" onclick="App.openQuickView('${prod.id}')">
            <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.src='assets/hero_showcase.jpg'">
            <button class="quick-view-btn">Quick Specs &amp; Storage</button>
          </div>

          <div class="card-details">
            <div class="card-rating-row">
              ★ <b>${prod.rating.toFixed(1)}</b> <span>(${prod.reviewsCount})</span>
            </div>

            <h3 class="card-title" title="${prod.name}" onclick="App.openQuickView('${prod.id}')">${prod.name}</h3>

            <div class="card-meta-tags">
              ${hasStorageVariants ? `<span class="meta-chip" style="color:var(--neon-cyan); border-color:rgba(0,210,255,0.3); font-weight:600;">💾 ${prod.storageOptions.map(t => t.capacity).join(" • ")}</span>` : ''}
              ${hasColorVariants ? `<span class="meta-chip" style="color:#e056fd; border-color:rgba(224,86,253,0.3);">🎨 ${prod.colorOptions.length} Colors</span>` : ''}
              ${(prod.tags || []).slice(0, 2).map(tag => `<span class="meta-chip">${tag}</span>`).join("")}
            </div>

            <div class="card-price-row">
              <span class="current-price">${hasStorageVariants ? `<small style="font-size:12px; font-weight:normal; color:var(--text-muted);">From </small>` : ''}Rs. ${minPrice.toLocaleString()}</span>
              ${prod.originalPrice > minPrice ? `<span class="original-price">Rs. ${prod.originalPrice.toLocaleString()}</span>` : ''}
            </div>

            <button class="add-to-cart-btn" onclick="${(hasStorageVariants || hasColorVariants) ? `App.openQuickView('${prod.id}')` : `App.addToCart('${prod.id}')`}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              <span>${(hasStorageVariants || hasColorVariants) ? 'Select Capacity & Color' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  // 3. Search Suggestions
  handleSearchSuggestions(query, dropdown) {
    if (!query) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
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
          <p>Rs. ${prod.price.toLocaleString()} • <span style="color:#94a3b8; font-weight:normal;">${prod.condition}</span></p>
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
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const prod = products.find(p => p.id === this.quickViewCurrentProdId);
    if (!prod) return;

    this.executeAddToCart(
      prod, 
      this.quickViewSelectedStorage, 
      this.quickViewSelectedColor, 
      this.quickViewSelectedPrice
    );
  },

  openQuickView(prodId) {
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    this.quickViewCurrentProdId = prodId;

    // Prepare media items list
    let mediaList = [];
    if (prod.images && Array.isArray(prod.images) && prod.images.length > 0) {
      prod.images.forEach(imgUrl => {
        if (imgUrl && imgUrl.trim()) {
          mediaList.push({ type: 'image', url: imgUrl.trim() });
        }
      });
    } else if (prod.image) {
      mediaList.push({ type: 'image', url: prod.image });
    }

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

    const isUsed = prod.condition && !prod.condition.toLowerCase().includes("brand new");
    let condTitle = "🌟 Brand New (100% Sealed Box)";
    if (isUsed) {
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
        <div class="product-gallery-card">
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
        <div>
          <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
            <span class="badge-pill ${isUsed ? 'badge-used' : 'badge-new'}">${condTitle}</span>
            ${prod.batteryHealth ? `<span class="badge-pill badge-battery">🔋 Battery: ${prod.batteryHealth}${typeof prod.batteryHealth === 'number' || !String(prod.batteryHealth).includes('%') ? '%' : ''} Original</span>` : ''}
            ${mediaList.some(m => m.type === 'video') ? `<span class="badge-pill" style="background:rgba(224,86,253,0.18); border:1px solid rgba(224,86,253,0.4); color:#e056fd;">🎬 Video Showcase</span>` : ''}
          </div>

          <h2 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:12px; line-height:1.3;">${prod.name}</h2>

          <!-- Dynamic Live Price Row -->
          <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:14px;">
            <span id="qv-price-display" style="font-size:24px; font-weight:900; color:var(--neon-cyan);">Rs. ${this.quickViewSelectedPrice.toLocaleString()}</span>
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

          <p style="font-size:13.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">${prod.description}</p>

          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-bottom:20px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:var(--text-muted);">Physical Store Warranty:</span>
              <span style="color:#fff; font-weight:600;">${prod.warranty || '1 Year Store Warranty'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:var(--text-muted);">Stock Availability:</span>
              <span style="color:var(--success); font-weight:700;">In Stock (${prod.stock} units)</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted);">Store Pickup &amp; Delivery:</span>
              <span style="color:var(--neon-cyan); font-weight:600;">Maharagama Flagship &amp; Island-wide</span>
            </div>
          </div>

          <button id="qv-add-cart-btn" class="btn-primary-glow" style="width:100%; justify-content:center;" onclick="App.executeAddToCartFromQuickView(); App.closeModal('quickview-modal');">
            Add to Cart ${this.quickViewSelectedStorage ? `• ${this.quickViewSelectedStorage} ` : ''}(Rs. ${this.quickViewSelectedPrice.toLocaleString()})
          </button>
        </div>
      </div>
    `;

    this.setQuickViewMedia(0);
    this.openModal("quickview-modal");
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
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
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

  // 8. Repair Interactive Estimator
  setupRepairEstimator() {
    const serviceSelect = document.getElementById("estimator-service");
    const deviceSelect = document.getElementById("estimator-device");
    if (!serviceSelect || !deviceSelect) return;

    const updateEstimate = () => {
      const serviceId = serviceSelect.value;
      const deviceId = deviceSelect.value;
      const servicesList = (typeof REPAIR_SERVICES !== 'undefined' ? REPAIR_SERVICES : (window.REPAIR_SERVICES || []));
      const service = servicesList.find(s => s.id === serviceId) || servicesList[0] || { basePrice: 5000, duration: "1 Hour", warranty: "6 Months" };

      let multiplier = 1.0;
      if (deviceId.includes("16") || deviceId.includes("15")) multiplier = 1.6;
      else if (deviceId.includes("14") || deviceId.includes("13")) multiplier = 1.3;
      else if (deviceId.includes("12") || deviceId.includes("11")) multiplier = 1.0;

      const estimatedCost = Math.round(service.basePrice * multiplier);
      const priceElem = document.getElementById("estimator-price-display");
      const timeElem = document.getElementById("estimator-time-display");
      const warrantyElem = document.getElementById("estimator-warranty-display");

      if (priceElem) priceElem.textContent = `Rs. ${estimatedCost.toLocaleString()} - ${(estimatedCost + 3500).toLocaleString()}`;
      if (timeElem) timeElem.textContent = `⏱️ Est. Time: ${service.duration}`;
      if (warrantyElem) warrantyElem.textContent = `🛡️ Includes: ${service.warranty}`;
    };

    serviceSelect.addEventListener("change", updateEstimate);
    deviceSelect.addEventListener("change", updateEstimate);
    updateEstimate();
  },

  openRepairBookingModal() {
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
      estimatedCompletion: date || "Today within 1 hour",
      desk: "In-Store Express Bay",
      cost: 8500,
      notes: "Booked online for Physical Store visit."
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
    
    const sendWa = confirm(`⚡ Repair Slot Reserved!\n\nTracking Code: ${trackingCode}\nDevice: ${device}\n\nWould you like to send this repair reservation directly to Universe Hub WhatsApp Desk (074-0219239)?`);
    if (sendWa) {
      const waMsg = `Hello Universe Hub Repair Desk! I have reserved an in-store repair slot for my ${device}.\n\n• Job Tracking ID: ${trackingCode}\n• Customer: ${name}\n• Contact / WhatsApp: ${phone}\n• Fault: ${issue}\n• Preferred Visit Time: ${date || 'Today'}\n\nPlease confirm desk availability.`;
      window.open(`https://wa.me/94740219239?text=${encodeURIComponent(waMsg)}`, '_blank');
    }
    showToast(`Repair job ${trackingCode} reserved!`);
  },

  // 9. Real-time Repair Status Tracking
  handleTrackRepair() {
    const input = document.getElementById("track-repair-input");
    const code = input ? input.value.trim().toUpperCase() : "";
    const card = document.getElementById("track-result-container");
    if (!code || !card) return;

    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const record = repairs.find(r => r.trackingCode.toUpperCase() === code);

    if (!record) {
      card.innerHTML = `
        <div style="padding:16px; text-align:center; color:#f87171;">
          ❌ No repair record found with tracking code <b>${code}</b>. Please check your physical receipt or try sample demo code: <b>UH-8821</b> or <b>UH-8902</b>.
        </div>
      `;
      card.classList.add("active");
      return;
    }

    const steps = [
      { num: 1, label: "Received" },
      { num: 2, label: "Diagnostic" },
      { num: 3, label: "In Repair" },
      { num: 4, label: "Quality Check" },
      { num: 5, label: "Ready" }
    ];

    const currentStep = record.stepIndex || 2;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; margin-bottom:14px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Tracking Code</span>
          <h4 style="font-size:18px; color:var(--neon-cyan); font-weight:800;">${record.trackingCode}</h4>
        </div>
        <div style="text-align:right;">
          <span class="badge-pill" style="background:rgba(0,210,255,0.15); color:var(--neon-cyan); border:1px solid rgba(0,210,255,0.3); font-size:12px;">
            ${record.status}
          </span>
        </div>
      </div>

      <div style="font-size:13.5px; line-height:1.6; margin-bottom:14px;">
        <div><b>Device:</b> ${record.device}</div>
        <div><b>Reported Issue:</b> ${record.issue}</div>
        <div><b>Lab Location:</b> ${record.desk || 'Main Tech Bay'}</div>
        <div><b>Est. Completion:</b> <span style="color:var(--success); font-weight:700;">${record.estimatedCompletion}</span></div>
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

      ${record.notes ? `
        <div style="background:rgba(0,210,255,0.06); border-radius:6px; padding:10px; font-size:12px; color:#cbd5e1; margin-top:12px;">
          <b style="color:var(--neon-cyan);">Technician Note:</b> ${record.notes}
        </div>
      ` : ''}

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
        <a href="https://wa.me/94740219239?text=${encodeURIComponent(`Hello Universe Hub Repair Desk! I am checking on my device repair (${record.device}) with Job Tracking ID #${record.trackingCode}. Current status shown online is "${record.status}".`)}"
           target="_blank" class="btn-primary-glow" style="background:#25d366; box-shadow:0 0 16px rgba(37,211,102,0.3); font-size:12px; padding:8px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <span>💬</span>
          <span>WhatsApp Repair Desk (074-0219239)</span>
        </a>
        <button class="btn-glass" onclick="showToast('🔔 Real-time WhatsApp & SMS updates are active for ${record.phone || 'your phone number'}!')" style="font-size:12px; padding:8px 14px;">
          🔔 Subscribed to WhatsApp &amp; SMS
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

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

