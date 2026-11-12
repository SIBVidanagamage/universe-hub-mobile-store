/**
 * Universe Hub - Admin Panel Controller
 * Handles inventory CRUD, repair order status updates, review moderation, and store analytics
 */

const AdminController = {
  activeTab: "products",
  inventoryFilterCat: "all",

  init() {
    this.renderStats();
    this.bindEvents();
    this.populateCategoryDropdowns();
    this.populateBrandDropdowns();
    this.initStorageAndColorVariants();
    this.renderCurrentTab();
    if (typeof BulkUploader !== 'undefined') {
      BulkUploader.init();
    }
    // Auto-sync laptop's active inventory with cloud database so mobile phones match instantly
    if (window.SupabaseSync && typeof window.SupabaseSync.syncLocalCatalogToCloud === 'function') {
      window.SupabaseSync.syncLocalCatalogToCloud();
    }
  },

  async syncCatalogToCloud() {
    showToast("☁️ Syncing Laptop inventory with Supabase Cloud...");
    if (window.SupabaseSync && typeof window.SupabaseSync.syncLocalCatalogToCloud === "function") {
      const ok = await window.SupabaseSync.syncLocalCatalogToCloud();
      if (ok) {
        showToast("✅ Cloud database updated! Phone will now show the exact same products.");
        this.renderProductsTable();
        this.renderStats();
      } else {
        showToast("⚠️ Cloud sync notice. Operating safely.");
      }
    }
  },

  openBulkUploader(type = 'products') {
    if (typeof BulkUploader !== 'undefined') {
      BulkUploader.openModal(type);
    } else {
      console.warn('BulkUploader is not loaded yet');
    }
  },

  exportProductsCSV() {
    if (typeof BulkUploader !== 'undefined') {
      BulkUploader.exportProductsCSV();
    }
  },

  exportCategoriesCSV() {
    if (typeof BulkUploader !== 'undefined') {
      BulkUploader.exportCategoriesCSV();
    }
  },

  bindEvents() {
    // Admin tab switching
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Add Product Form Submit
    const addProductForm = document.getElementById("admin-add-product-form");
    if (addProductForm) {
      addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddProduct();
      });
    }

    // New Repair Form Submit (from admin)
    const adminRepairForm = document.getElementById("admin-new-repair-form");
    if (adminRepairForm) {
      adminRepairForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAdminAddRepair();
      });
    }
  },

  // ==========================================
  // DYNAMIC STORAGE & COLOR VARIANT CONTROLLER
  // ==========================================
  PRESET_STORAGE_CAPACITIES: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  PRESET_STOCK_COLORS: [
    { name: "Midnight / Black", hex: "#0f172a" },
    { name: "Starlight / Silver", hex: "#f1f5f9" },
    { name: "Blue / Sierra Blue", hex: "#2563eb" },
    { name: "Pink", hex: "#f472b6" },
    { name: "Green / Alpine", hex: "#15803d" },
    { name: "Deep Purple", hex: "#6b21a8" },
    { name: "Natural Titanium", hex: "#94a3b8" },
    { name: "Desert Titanium / Gold", hex: "#d97706" },
    { name: "White", hex: "#ffffff" },
    { name: "Product RED", hex: "#ef4444" }
  ],

  initStorageAndColorVariants() {
    this.renderStorageTiersInputs('adm');
    this.renderColorPillSelectors('adm');
  },

  renderStorageTiersInputs(prefix, existingTiers = []) {
    const grid = document.getElementById(`${prefix}-storage-tiers-grid`);
    if (!grid) return;

    grid.innerHTML = this.PRESET_STORAGE_CAPACITIES.map(cap => {
      const match = (existingTiers || []).find(t => t && (t.capacity === cap || t.storage === cap));
      const isChecked = !!match;
      const priceVal = match ? (match.price || '') : '';
      const origVal = match ? (match.originalPrice || '') : '';

      return `
        <div class="storage-tier-card ${isChecked ? 'checked' : ''}" id="${prefix}-tier-card-${cap}">
          <label class="storage-tier-header">
            <input type="checkbox" id="${prefix}-storage-chk-${cap}" ${isChecked ? 'checked' : ''} onchange="AdminController.handleStorageCheckChange('${prefix}', '${cap}')">
            <span>💾 ${cap}</span>
          </label>
          <div class="storage-tier-inputs">
            <div>
              <label>Selling Price (Rs.):</label>
              <input type="number" id="${prefix}-storage-price-${cap}" placeholder="e.g. 165000" value="${priceVal}" ${isChecked ? '' : 'disabled'}>
            </div>
            <div>
              <label>Original Price (Rs.):</label>
              <input type="number" id="${prefix}-storage-orig-${cap}" placeholder="Optional (e.g. 180000)" value="${origVal}" ${isChecked ? '' : 'disabled'}>
            </div>
          </div>
        </div>
      `;
    }).join("");
  },

  handleStorageCheckChange(prefix, cap) {
    const chk = document.getElementById(`${prefix}-storage-chk-${cap}`);
    const card = document.getElementById(`${prefix}-tier-card-${cap}`);
    const priceInput = document.getElementById(`${prefix}-storage-price-${cap}`);
    const origInput = document.getElementById(`${prefix}-storage-orig-${cap}`);
    if (!chk || !card || !priceInput || !origInput) return;

    const checked = chk.checked;
    card.classList.toggle("checked", checked);
    priceInput.disabled = !checked;
    origInput.disabled = !checked;

    if (checked) {
      if (!priceInput.value) {
        const mainPriceInput = document.getElementById(prefix === 'adm' ? 'adm-prod-price' : 'edit-prod-price');
        if (mainPriceInput && mainPriceInput.value) {
          priceInput.value = mainPriceInput.value;
        }
      }
      priceInput.focus();
    }
  },

  quickEnableCommonTiers(prefix) {
    const mainPriceInput = document.getElementById(prefix === 'adm' ? 'adm-prod-price' : 'edit-prod-price');
    const basePrice = parseInt(mainPriceInput?.value, 10) || 165000;

    const tiers = [
      { capacity: "128GB", price: basePrice, originalPrice: basePrice + 15000 },
      { capacity: "256GB", price: basePrice + 15000, originalPrice: basePrice + 30000 },
      { capacity: "512GB", price: basePrice + 35000, originalPrice: basePrice + 55000 }
    ];
    this.renderStorageTiersInputs(prefix, tiers);
    if (typeof showToast === "function") showToast("⚡ Enabled 128GB, 256GB & 512GB tiers with smart step pricing!");
  },

  resetStorageTiers(prefix) {
    this.renderStorageTiersInputs(prefix, []);
  },

  renderColorPillSelectors(prefix, selectedColors = []) {
    const wrap = document.getElementById(`${prefix}-color-presets-wrap`);
    if (!wrap) return;

    const activeNames = (selectedColors || []).map(c => typeof c === 'string' ? c.trim().toLowerCase() : (c.name || '').trim().toLowerCase());
    let allColors = [...this.PRESET_STOCK_COLORS];

    (selectedColors || []).forEach(custom => {
      const cName = typeof custom === 'string' ? custom : custom.name;
      if (cName && !allColors.some(p => p.name.toLowerCase() === cName.toLowerCase())) {
        allColors.push({ name: cName, hex: "#38bdf8" });
      }
    });

    wrap.innerHTML = allColors.map(c => {
      const isActive = activeNames.includes(c.name.toLowerCase());
      return `
        <div class="color-preset-pill ${isActive ? 'active' : ''}" data-color="${c.name}" onclick="AdminController.toggleColorPill('${prefix}', '${c.name}', this)">
          <span class="color-dot" style="background:${c.hex};"></span>
          <span>${c.name}</span>
        </div>
      `;
    }).join("");
  },

  toggleColorPill(prefix, colorName, elem) {
    if (!elem) return;
    elem.classList.toggle("active");
  },

  addCustomColor(prefix) {
    const input = document.getElementById(`${prefix}-custom-color-input`);
    const val = input ? input.value.trim() : "";
    if (!val) {
      if (typeof showToast === "function") showToast("Please type a color name first!");
      return;
    }

    const wrap = document.getElementById(`${prefix}-color-presets-wrap`);
    if (!wrap) return;

    const existing = wrap.querySelector(`.color-preset-pill[data-color="${val}"]`);
    if (existing) {
      existing.classList.add("active");
      existing.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      input.value = "";
      return;
    }

    const div = document.createElement("div");
    div.className = "color-preset-pill active";
    div.dataset.color = val;
    div.onclick = (e) => this.toggleColorPill(prefix, val, div);
    div.innerHTML = `<span class="color-dot" style="background:#38bdf8;"></span><span>${val}</span>`;
    wrap.appendChild(div);
    input.value = "";
    if (typeof showToast === "function") showToast(`Added color "${val}"!`);
  },

  getStorageOptionsFromForm(prefix) {
    const options = [];
    this.PRESET_STORAGE_CAPACITIES.forEach(cap => {
      const chk = document.getElementById(`${prefix}-storage-chk-${cap}`);
      const priceInput = document.getElementById(`${prefix}-storage-price-${cap}`);
      const origInput = document.getElementById(`${prefix}-storage-orig-${cap}`);
      if (chk && chk.checked) {
        const price = parseInt(priceInput?.value, 10);
        if (!isNaN(price) && price > 0) {
          const orig = parseInt(origInput?.value, 10) || price;
          options.push({
            capacity: cap,
            price: price,
            originalPrice: orig
          });
        }
      }
    });
    return options;
  },

  getColorOptionsFromForm(prefix) {
    const wrap = document.getElementById(`${prefix}-color-presets-wrap`);
    if (!wrap) return [];
    const activePills = wrap.querySelectorAll(".color-preset-pill.active");
    const colors = [];
    activePills.forEach(p => {
      const c = p.getAttribute("data-color");
      if (c && !colors.includes(c)) colors.push(c);
    });
    return colors;
  },

  switchTab(tabName) {
    if (!tabName) return;
    this.activeTab = tabName;
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
      const match = (btn.dataset && btn.dataset.tab === tabName) || (btn.getAttribute("data-tab") === tabName);
      btn.classList.toggle("active", !!match);
    });

    document.querySelectorAll(".admin-tab-content").forEach(content => {
      content.style.display = content.id === `admin-tab-${tabName}` ? "block" : "none";
    });

    try {
      this.renderCurrentTab();
    } catch (err) {
      console.error("Error rendering tab " + tabName + ":", err);
    }
  },

  renderStats() {
    try {
      const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      const orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
      const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
      const reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];

      const totalRevenue = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
      const activeRepairs = repairs.filter(r => r.status !== "Completed").length;

      const revElem = document.getElementById("admin-stat-revenue");
      if (revElem) revElem.textContent = `Rs. ${totalRevenue.toLocaleString()}`;

      const ordElem = document.getElementById("admin-stat-orders");
      if (ordElem) ordElem.textContent = orders.length;

      const repElem = document.getElementById("admin-stat-repairs");
      if (repElem) repElem.textContent = activeRepairs;

      const revsElem = document.getElementById("admin-stat-reviews");
      if (revsElem) revsElem.textContent = reviews.length;

      const prodElem = document.getElementById("admin-stat-products");
      if (prodElem) prodElem.textContent = products.length;
    } catch (e) {
      console.warn("renderStats notice:", e);
    }
  },

  renderCurrentTab() {
    this.renderStats();
    try {
      if (this.activeTab === "products") {
        this.renderInventoryFilterBar();
        this.renderProductsTable();
      } else if (this.activeTab === "brands") {
        this.renderBrandsManager();
      } else if (this.activeTab === "categories") {
        this.renderCategoriesManager();
      } else if (this.activeTab === "repairs") {
        this.renderRepairsTable();
      } else if (this.activeTab === "reviews") {
        this.renderReviewsTable();
      } else if (this.activeTab === "orders") {
        this.renderOrdersTable();
      } else if (this.activeTab === "store") {
        this.renderStoreSettings();
      } else if (this.activeTab === "payments") {
        if (typeof PaymentGateway !== 'undefined' && typeof PaymentGateway.renderAdminGatewayManager === 'function') {
          PaymentGateway.renderAdminGatewayManager();
        }
      }
    } catch (tabErr) {
      console.error(`Error rendering active tab "${this.activeTab}":`, tabErr);
    }
  },

  // Set filter for Inventory Table
  setInventoryFilter(catId) {
    this.inventoryFilterCat = catId;
    this.renderInventoryFilterBar();
    this.renderProductsTable();
  },

  // Category Filter Pills Bar for Inventory Table
  renderInventoryFilterBar() {
    const bar = document.getElementById("admin-inventory-filter-bar");
    if (!bar) return;

    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];

    const getCount = (catId) => {
      if (catId === "all") return products.length;
      if (catId === "iphones") return products.filter(p => p.mainCategory === "iphones" || p.category === "brand-new-iphones" || p.category === "used-iphones").length;
      if (catId === "accessories") return products.filter(p => p.mainCategory === "accessories" || (p.category !== "brand-new-iphones" && p.category !== "used-iphones")).length;
      if (catId === "brand-new-iphones") return products.filter(p => p.category === "brand-new-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Brand New"))).length;
      if (catId === "used-iphones") return products.filter(p => p.category === "used-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Used"))).length;
      if (catId === "back-covers") return products.filter(p => p.category === "back-covers" || p.category === "cases").length;
      return products.filter(p => p.category === catId).length;
    };

    let html = `
      <button class="admin-cat-pill ${this.inventoryFilterCat === 'all' ? 'active' : ''}" onclick="AdminController.setInventoryFilter('all')">
        <span>🌟 All Products</span>
        <span class="cat-count-badge">${getCount('all')}</span>
      </button>

      <button class="admin-cat-pill ${this.inventoryFilterCat === 'iphones' ? 'active' : ''}" onclick="AdminController.setInventoryFilter('iphones')" style="border-color:rgba(0,210,255,0.4);">
        <span>📱 All iPhones</span>
        <span class="cat-count-badge">${getCount('iphones')}</span>
      </button>

      <button class="admin-cat-pill ${this.inventoryFilterCat === 'accessories' ? 'active' : ''}" onclick="AdminController.setInventoryFilter('accessories')" style="border-color:rgba(157,78,221,0.4);">
        <span>⚡ All Accessories</span>
        <span class="cat-count-badge">${getCount('accessories')}</span>
      </button>
    `;

    categories.forEach(cat => {
      const isSel = this.inventoryFilterCat === cat.id;
      const count = getCount(cat.id);
      html += `
        <button class="admin-cat-pill ${isSel ? 'active' : ''}" onclick="AdminController.setInventoryFilter('${cat.id}')">
          <span>${cat.icon || '🏷️'} ${cat.name}</span>
          <span class="cat-count-badge">${count}</span>
        </button>
      `;
    });

    bar.innerHTML = html;

    const label = document.getElementById("admin-inventory-filter-label");
    if (label) {
      if (this.inventoryFilterCat === "all") label.textContent = "All Categories";
      else if (this.inventoryFilterCat === "iphones") label.textContent = "📱 All iPhones";
      else if (this.inventoryFilterCat === "accessories") label.textContent = "⚡ All Accessories";
      else {
        const c = categories.find(c => c.id === this.inventoryFilterCat);
        label.textContent = c ? `${c.icon || ''} ${c.name}` : this.inventoryFilterCat;
      }
    }
  },

  // 1. Inventory / Products Table with Category Badges and Filter
  renderProductsTable() {
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    let filtered = products;
    if (this.inventoryFilterCat !== "all") {
      filtered = products.filter(p => {
        if (this.inventoryFilterCat === "iphones") {
          return p.mainCategory === "iphones" || p.category === "brand-new-iphones" || p.category === "used-iphones";
        }
        if (this.inventoryFilterCat === "accessories") {
          return p.mainCategory === "accessories" || (p.category !== "brand-new-iphones" && p.category !== "used-iphones");
        }
        if (this.inventoryFilterCat === "brand-new-iphones") {
          return p.category === "brand-new-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Brand New"));
        }
        if (this.inventoryFilterCat === "used-iphones") {
          return p.category === "used-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Used"));
        }
        if (this.inventoryFilterCat === "back-covers") {
          return p.category === "back-covers" || p.category === "cases";
        }
        return p.category === this.inventoryFilterCat || p.subCategory === this.inventoryFilterCat;
      });
    }

    const countSpan = document.getElementById("admin-inventory-items-count");
    if (countSpan) countSpan.textContent = `Showing ${filtered.length} of ${products.length} Products`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No products found in this category filter. Try selecting "All Products" or add one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(prod => {
      const imgsCount = (prod.images && Array.isArray(prod.images)) ? prod.images.length : (prod.image ? 1 : 0);
      const hasVideo = !!(prod.video && prod.video.trim());
      const catObj = categories.find(c => c.id === prod.category);
      const isIphone = prod.mainCategory === "iphones" || (prod.category && prod.category.includes("iphone"));

      let categoryBadge = "";
      if (isIphone) {
        const sub = prod.category === "brand-new-iphones" ? "Brand New" : (prod.category === "used-iphones" ? "Certified Used" : (prod.condition ? (prod.condition.includes("Used") ? "Used" : "Brand New") : ""));
        categoryBadge = `<span class="badge-pill badge-cat-iphone">📱 iPhone${sub ? ` • ${sub}` : ''}</span>`;
      } else {
        const catName = catObj ? catObj.name : (prod.category || "Accessory");
        categoryBadge = `<span class="badge-pill badge-cat-accessory">⚡ ${catName}</span>`;
      }

      const brandBadge = `<span class="badge-pill badge-brand" style="margin-left:4px;">🏷️ ${prod.brand || 'Apple'}</span>`;

      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap: 10px;">
            <img src="${prod.image || (prod.images && prod.images[0]) || 'assets/hero_showcase.jpg'}" style="width:44px; height:44px; border-radius:6px; object-fit:cover; background:#0c101a;" alt="" onerror="this.src='assets/hero_showcase.jpg'">
            <div>
              <div style="font-weight:700; color:#fff;">${prod.name}</div>
              <div style="display:flex; gap:6px; margin-top:2px;">
                <span style="font-size:10.5px; color:var(--neon-cyan); background:rgba(0,210,255,0.1); padding:1px 6px; border-radius:4px;">📷 ${imgsCount} Img${imgsCount > 1 ? 's' : ''}</span>
                ${hasVideo ? `<span style="font-size:10.5px; color:#e056fd; background:rgba(224,86,253,0.12); padding:1px 6px; border-radius:4px;">🎬 Video</span>` : ''}
              </div>
            </div>
          </div>
        </td>
        <td>
          ${prod.condition ? `
            <span class="badge-pill ${prod.condition.toLowerCase().includes('brand new') ? 'badge-new' : 'badge-used'}">
              ${prod.condition}
            </span>
          ` : `<span style="color:var(--text-muted); font-size:11.5px;">— None —</span>`}
          ${prod.batteryHealth ? `<span class="badge-pill badge-battery" style="margin-left:4px;">${prod.batteryHealth}% Batt</span>` : ''}
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
            ${categoryBadge}
            ${brandBadge}
          </div>
        </td>
        <td style="color:var(--neon-cyan); font-weight:700;">Rs. ${prod.price.toLocaleString()}</td>
        <td>
          <div style="font-weight:700; font-size:12px; color:${prod.stockStatus === 'on-request' ? '#f59e0b' : (prod.stockStatus === 'inquire' ? 'var(--neon-cyan)' : 'var(--success)')};">
            ${prod.stockStatus === 'on-request' ? '⚡ On Request' : (prod.stockStatus === 'inquire' ? '💬 WhatsApp' : '🟢 In Store')}
          </div>
          <div style="font-size:11px; color:var(--text-muted);">${prod.stock || 0} internal units</div>
        </td>
        <td>
          <div class="table-action-btns">
            <button class="btn-icon-action btn-edit" title="Edit Full Product & Media" onclick="AdminController.openEditProduct('${prod.id}')">
              ✏️
            </button>
            <button class="btn-icon-action btn-delete" title="Delete Product" onclick="AdminController.deleteProduct('${prod.id}')">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `}).join("");
  },

  // Populate dynamic grouped options for Add and Edit product dropdowns
  populateCategoryDropdowns() {
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const addSelect = document.getElementById("adm-prod-category");
    const editSelect = document.getElementById("edit-prod-category");

    const buildOptions = () => {
      const iphoneCats = categories.filter(c => c.group === "iphones");
      const accessoryCats = categories.filter(c => c.group === "accessories");
      const otherCats = categories.filter(c => c.group !== "iphones" && c.group !== "accessories");

      let html = "";
      if (iphoneCats.length > 0) {
        html += `<optgroup label="📱 iPhones">`;
        iphoneCats.forEach(c => {
          html += `<option value="${c.id}">${c.name}</option>`;
        });
        html += `</optgroup>`;
      }
      if (accessoryCats.length > 0) {
        html += `<optgroup label="⚡ Accessories">`;
        accessoryCats.forEach(c => {
          html += `<option value="${c.id}">${c.name}</option>`;
        });
        html += `</optgroup>`;
      }
      if (otherCats.length > 0) {
        html += `<optgroup label="✨ Other Categories">`;
        otherCats.forEach(c => {
          html += `<option value="${c.id}">${c.name}</option>`;
        });
        html += `</optgroup>`;
      }
      return html;
    };

    const optionsHtml = buildOptions();
    if (addSelect) addSelect.innerHTML = optionsHtml;
    if (editSelect) editSelect.innerHTML = optionsHtml;
  },

  // Populate brand dropdowns for Add and Edit product forms
  populateBrandDropdowns() {
    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const addSelect = document.getElementById("adm-prod-brand");
    const editSelect = document.getElementById("edit-prod-brand");

    let optionsHtml = brands.map(b => `<option value="${b.name}">${b.icon || '🏷️'} ${b.name}</option>`).join("");
    optionsHtml += `<option value="__NEW__" style="color:var(--neon-cyan); font-weight:700;">➕ Add New Brand...</option>`;

    if (addSelect) {
      const prev = addSelect.value;
      addSelect.innerHTML = optionsHtml;
      if (prev && prev !== "__NEW__" && brands.some(b => b.name === prev)) addSelect.value = prev;
      addSelect.onchange = (e) => {
        if (e.target.value === "__NEW__") {
          this.openQuickAddBrandModal("adm");
        }
      };
    }
    if (editSelect) {
      const prev = editSelect.value;
      editSelect.innerHTML = optionsHtml;
      if (prev && prev !== "__NEW__" && brands.some(b => b.name === prev)) editSelect.value = prev;
      editSelect.onchange = (e) => {
        if (e.target.value === "__NEW__") {
          this.openQuickAddBrandModal("edit");
        }
      };
    }
  },

  quickBrandTarget: "adm",

  openQuickAddBrandModal(target = "adm") {
    this.quickBrandTarget = target;
    const modal = document.getElementById("admin-quick-brand-modal");
    if (modal) {
      modal.classList.add("active");
      const nameInp = document.getElementById("quick-brand-name");
      if (nameInp) {
        nameInp.value = "";
        setTimeout(() => nameInp.focus(), 100);
      }
      const tagInp = document.getElementById("quick-brand-tagline");
      if (tagInp) tagInp.value = "";
      const iconInp = document.getElementById("quick-brand-icon");
      if (iconInp) iconInp.value = "🏷️";
      const navCheck = document.getElementById("quick-brand-in-nav");
      if (navCheck) navCheck.checked = true;
      const filterCheck = document.getElementById("quick-brand-in-filter");
      if (filterCheck) filterCheck.checked = true;
    }
  },

  closeQuickAddBrandModal() {
    const modal = document.getElementById("admin-quick-brand-modal");
    if (modal) modal.classList.remove("active");
    // Reset select if it was left on __NEW__
    if (this.quickBrandTarget === "adm") {
      const sel = document.getElementById("adm-prod-brand");
      if (sel && sel.value === "__NEW__") sel.selectedIndex = 0;
    } else {
      const sel = document.getElementById("edit-prod-brand");
      if (sel && sel.value === "__NEW__") sel.selectedIndex = 0;
    }
  },

  handleQuickAddBrandSubmit(e) {
    if (e) e.preventDefault();
    const name = document.getElementById("quick-brand-name").value.trim();
    const icon = document.getElementById("quick-brand-icon").value.trim() || "🏷️";
    const tagline = document.getElementById("quick-brand-tagline").value.trim() || `${name} Official Accessories`;
    const inNav = document.getElementById("quick-brand-in-nav") ? document.getElementById("quick-brand-in-nav").checked : true;
    const inFilter = document.getElementById("quick-brand-in-filter") ? document.getElementById("quick-brand-in-filter").checked : true;

    if (!name) {
      alert("Please enter a brand name.");
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;

    let existing = brands.find(b => b.name.toLowerCase() === name.toLowerCase() || b.id.toLowerCase() === slug);
    if (!existing) {
      const newBrand = {
        id: slug,
        name,
        icon,
        tagline,
        inNav,
        inFilter,
        order: brands.length + 1
      };
      brands.push(newBrand);
      localStorage.setItem("UH_BRANDS", JSON.stringify(brands));
    }

    this.populateBrandDropdowns();

    // Select the new brand in whichever form opened the modal
    if (this.quickBrandTarget === "adm") {
      const sel = document.getElementById("adm-prod-brand");
      if (sel) sel.value = name;
    } else {
      const sel = document.getElementById("edit-prod-brand");
      if (sel) sel.value = name;
    }

    this.closeQuickAddBrandModal();

    if (window.App) {
      App.renderNavbar();
      App.renderBrandFilterBar();
      App.renderBrandsSection();
      App.renderCatalog();
    }

    if (this.activeTab === "brands") {
      this.renderBrandsManager();
    }

    showToast(`Brand "${name}" added to system and selected!`);
  },

  // 2. Brands & Accessories Management Tab
  renderBrandsManager() {
    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const tbody = document.getElementById("admin-brands-tbody");
    if (!tbody) return;

    tbody.innerHTML = brands.map(b => {
      const count = products.filter(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === b.name.toLowerCase() || pb === b.id.toLowerCase();
      }).length;

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px; width:38px; height:38px; display:inline-flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.04); border-radius:8px;">
                ${b.icon || '🏷️'}
              </span>
              <div>
                <strong style="color:#fff; font-size:14px;">${b.name}</strong>
              </div>
            </div>
          </td>
          <td><span style="color:var(--text-secondary); font-size:12.5px;">${b.tagline || 'Original Tech'}</span></td>
          <td><code style="color:var(--neon-cyan); font-size:12px;">${b.id}</code></td>
          <td>
            <span style="font-weight:700; color:${count > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)'};">
              ${count} Item${count !== 1 ? 's' : ''}
            </span>
          </td>
          <td>
            <button class="toggle-switch-btn ${b.inNav !== false ? 'on' : 'off'}" onclick="AdminController.toggleBrandNav('${b.id}')">
              ${b.inNav !== false ? '✓ In Dropdown' : '✕ Hidden'}
            </button>
          </td>
          <td>
            <button class="toggle-switch-btn ${b.inFilter !== false ? 'on' : 'off'}" onclick="AdminController.toggleBrandFilter('${b.id}')">
              ${b.inFilter !== false ? '✓ In Filter' : '✕ Hidden'}
            </button>
          </td>
          <td>
            <button class="btn-icon-action btn-delete" title="Delete Brand" onclick="AdminController.deleteBrand('${b.id}')">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  handleAddBrand(e) {
    if (e) e.preventDefault();
    const name = document.getElementById("adm-brand-name").value.trim();
    const icon = document.getElementById("adm-brand-icon").value.trim() || "🏷️";
    const tagline = document.getElementById("adm-brand-tagline").value.trim() || `${name} Official Accessories`;
    let slug = document.getElementById("adm-brand-slug").value.trim();
    const inNav = document.getElementById("adm-brand-in-nav").checked;
    const inFilter = document.getElementById("adm-brand-in-filter").checked;

    if (!name) {
      alert("Please enter a brand name.");
      return;
    }

    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    if (brands.some(b => b.id === slug)) {
      alert(`Brand with ID "${slug}" already exists!`);
      return;
    }

    const newBrand = {
      id: slug,
      name,
      icon,
      tagline,
      inNav,
      inFilter,
      order: brands.length + 1
    };

    brands.push(newBrand);
    localStorage.setItem("UH_BRANDS", JSON.stringify(brands));

    document.getElementById("admin-add-brand-form").reset();
    document.getElementById("adm-brand-icon").value = "🏷️";
    document.getElementById("adm-brand-in-nav").checked = true;
    document.getElementById("adm-brand-in-filter").checked = true;

    this.populateBrandDropdowns();
    this.renderBrandsManager();

    if (window.App) {
      App.renderNavbar();
      App.renderBrandFilterBar();
      App.renderBrandsSection();
      App.renderCatalog();
    }

    showToast(`Brand "${name}" added to Universe Hub and synced live!`);
  },

  toggleBrandNav(brandId) {
    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const b = brands.find(brand => brand.id === brandId);
    if (!b) return;

    b.inNav = b.inNav === false ? true : false;
    localStorage.setItem("UH_BRANDS", JSON.stringify(brands));

    this.renderBrandsManager();
    if (window.App) App.renderNavbar();

    showToast(`Brand "${b.name}" ${b.inNav ? 'is now visible in Navbar dropdown' : 'is hidden from Navbar dropdown'}`);
  },

  toggleBrandFilter(brandId) {
    const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    const b = brands.find(brand => brand.id === brandId);
    if (!b) return;

    b.inFilter = b.inFilter === false ? true : false;
    localStorage.setItem("UH_BRANDS", JSON.stringify(brands));

    this.renderBrandsManager();
    if (window.App) App.renderBrandFilterBar();

    showToast(`Brand "${b.name}" ${b.inFilter ? 'is shown in Catalog Filter' : 'is hidden from Catalog Filter'}`);
  },

  async deleteBrand(brandId) {
    if (!brandId) return;
    if (!confirm(`Are you sure you want to permanently delete brand "${brandId}"?`)) return;

    const strId = String(brandId);
    let deletedBrandIds = [];
    try {
      deletedBrandIds = JSON.parse(localStorage.getItem("UH_DELETED_BRAND_IDS") || "[]");
    } catch (e) { deletedBrandIds = []; }
    if (!deletedBrandIds.includes(strId)) {
      deletedBrandIds.push(strId);
      try { localStorage.setItem("UH_DELETED_BRAND_IDS", JSON.stringify(deletedBrandIds)); } catch (e) {}
    }

    let brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || INITIAL_BRANDS;
    brands = brands.filter(b => String(b.id) !== strId && String(b.name).toLowerCase() !== strId.toLowerCase());
    localStorage.setItem("UH_BRANDS", JSON.stringify(brands));

    if (window.SupabaseSync && typeof window.SupabaseSync.deleteBrand === "function") {
      try { await window.SupabaseSync.deleteBrand(strId); } catch (e) {}
    }

    this.populateBrandDropdowns();
    this.renderBrandsManager();

    if (window.App) {
      App.renderNavbar();
      App.renderBrandFilterBar();
      App.renderBrandsSection();
      App.renderCatalog();
    }

    showToast(`Brand removed from system.`);
  },

  // 2. Categories & Navbar Management Tab
  renderCategoriesManager() {
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const tbody = document.getElementById("admin-categories-tbody");
    if (!tbody) return;

    tbody.innerHTML = categories.map(cat => {
      const count = products.filter(p => {
        if (cat.id === "brand-new-iphones") return p.category === "brand-new-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Brand New"));
        if (cat.id === "used-iphones") return p.category === "used-iphones" || (p.mainCategory === "iphones" && p.condition && p.condition.includes("Used"));
        if (cat.id === "back-covers") return p.category === "back-covers" || p.category === "cases";
        return p.category === cat.id;
      }).length;

      const groupBadge = cat.group === "iphones" 
        ? `<span class="badge-pill badge-cat-iphone">📱 iPhones</span>` 
        : (cat.group === "accessories" ? `<span class="badge-pill badge-cat-accessory">⚡ Accessories</span>` : `<span class="badge-pill" style="background:rgba(255,255,255,0.1); color:#fff;">✨ ${cat.groupName || cat.group}</span>`);

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:20px; width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.04); border-radius:6px;">
                ${cat.icon || '🏷️'}
              </span>
              <span style="font-weight:700; color:#fff;">${cat.name}</span>
            </div>
          </td>
          <td>${groupBadge}</td>
          <td><code style="color:var(--text-secondary); font-size:12px;">${cat.id}</code></td>
          <td>
            <span style="font-weight:700; color:var(--neon-cyan);">${count} Product${count !== 1 ? 's' : ''}</span>
          </td>
          <td>
            <button class="toggle-switch-btn ${cat.inNav !== false ? 'on' : 'off'}" onclick="AdminController.toggleCategoryNav('${cat.id}')">
              ${cat.inNav !== false ? '✓ In Navbar' : '✕ Hidden'}
            </button>
          </td>
          <td>
            <button class="toggle-switch-btn ${cat.inFilter !== false ? 'on' : 'off'}" onclick="AdminController.toggleCategoryFilter('${cat.id}')">
              ${cat.inFilter !== false ? '✓ In Filter' : '✕ Hidden'}
            </button>
          </td>
          <td>
            <button class="btn-icon-action btn-delete" title="Delete Category" onclick="AdminController.deleteCategory('${cat.id}')">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  handleAddCategory(e) {
    if (e) e.preventDefault();
    const name = document.getElementById("adm-cat-name").value.trim();
    const group = document.getElementById("adm-cat-group").value;
    const icon = document.getElementById("adm-cat-icon").value.trim() || "🏷️";
    let slug = document.getElementById("adm-cat-slug").value.trim();
    const inNav = document.getElementById("adm-cat-in-nav").checked;
    const inFilter = document.getElementById("adm-cat-in-filter").checked;

    if (!name) {
      alert("Please enter a category name.");
      return;
    }

    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    if (categories.some(c => c.id === slug)) {
      alert(`Category with ID "${slug}" already exists! Please choose another slug.`);
      return;
    }

    const newCat = {
      id: slug,
      name,
      group,
      groupName: group === "iphones" ? "iPhones" : (group === "accessories" ? "Accessories" : "Other"),
      icon,
      inNav,
      inFilter,
      order: categories.length + 1
    };

    categories.push(newCat);
    localStorage.setItem("UH_CATEGORIES", JSON.stringify(categories));

    document.getElementById("admin-add-category-form").reset();
    document.getElementById("adm-cat-icon").value = "🏷️";
    document.getElementById("adm-cat-in-nav").checked = true;
    document.getElementById("adm-cat-in-filter").checked = true;

    this.populateCategoryDropdowns();
    this.renderCategoriesManager();
    this.renderInventoryFilterBar();

    // Instant sync to storefront!
    if (window.App) {
      App.renderNavbar();
      App.renderCatalogTabs();
      App.renderCategories();
    }

    showToast(`Category "${name}" created and added to Navbar & Filters!`);
  },

  toggleCategoryNav(catId) {
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    cat.inNav = cat.inNav === false ? true : false;
    localStorage.setItem("UH_CATEGORIES", JSON.stringify(categories));

    this.renderCategoriesManager();
    if (window.App) App.renderNavbar();

    showToast(`Category "${cat.name}" is now ${cat.inNav ? 'visible in Navbar' : 'hidden from Navbar'}!`);
  },

  toggleCategoryFilter(catId) {
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    cat.inFilter = cat.inFilter === false ? true : false;
    localStorage.setItem("UH_CATEGORIES", JSON.stringify(categories));

    this.renderCategoriesManager();
    if (window.App) App.renderCatalogTabs();

    showToast(`Category "${cat.name}" is now ${cat.inFilter ? 'shown in Catalog Filter' : 'hidden from Catalog Filter'}!`);
  },

  async deleteCategory(catId) {
    if (!catId) return;
    if (!confirm(`Are you sure you want to permanently delete category "${catId}"?`)) return;

    const strId = String(catId);
    let deletedCategoryIds = [];
    try {
      deletedCategoryIds = JSON.parse(localStorage.getItem("UH_DELETED_CATEGORY_IDS") || "[]");
    } catch (e) { deletedCategoryIds = []; }
    if (!deletedCategoryIds.includes(strId)) {
      deletedCategoryIds.push(strId);
      try { localStorage.setItem("UH_DELETED_CATEGORY_IDS", JSON.stringify(deletedCategoryIds)); } catch (e) {}
    }

    let categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    categories = categories.filter(c => String(c.id) !== strId);
    localStorage.setItem("UH_CATEGORIES", JSON.stringify(categories));

    if (window.SupabaseSync && typeof window.SupabaseSync.deleteCategory === "function") {
      try { await window.SupabaseSync.deleteCategory(strId); } catch (e) {}
    }

    this.populateCategoryDropdowns();
    this.renderCategoriesManager();
    this.renderInventoryFilterBar();

    if (window.App) {
      App.renderNavbar();
      App.renderCatalogTabs();
      App.renderCategories();
    }

    showToast(`Category removed from system and Navbar.`);
  },

  async handleAddProduct(event) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }

    const btn = document.getElementById("btn-admin-add-product");
    const originalBtnText = btn ? btn.innerHTML : "Add Product to Live Store";

    try {
      const nameInput = document.getElementById("adm-prod-name");
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        if (typeof showToast === "function") showToast("⚠️ Please enter a Product Title (e.g. iPhone 15 Pro Max)!");
        if (nameInput) {
          nameInput.focus();
          nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      const priceInput = document.getElementById("adm-prod-price");
      const priceVal = priceInput ? priceInput.value.trim() : "";
      const price = parseInt(priceVal, 10);
      if (isNaN(price) || price <= 0) {
        if (typeof showToast === "function") showToast("⚠️ Please enter a valid Selling Price in Rupees!");
        if (priceInput) {
          priceInput.focus();
          priceInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Check if media is still compressing/processing
      if (window.MediaUploader && typeof MediaUploader.isProcessing === "function" && MediaUploader.isProcessing("adm")) {
        if (typeof showToast === "function") showToast("⏳ Processing and optimizing photos, please wait a moment...");
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block; width:13px; height:13px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></span> Adding Product...`;
      }

      const catEl = document.getElementById("adm-prod-category");
      const category = (catEl && catEl.value) ? catEl.value : "brand-new-iphones";

      const condEl = document.getElementById("adm-prod-condition");
      const condition = (condEl && condEl.value) ? condEl.value.trim() : "";

      const origEl = document.getElementById("adm-prod-origprice");
      const origPrice = origEl && parseInt(origEl.value, 10) ? parseInt(origEl.value, 10) : price;

      const battEl = document.getElementById("adm-prod-battery");
      const battery = battEl && battEl.value.trim() ? battEl.value.trim() : null;

      const stockStatusEl = document.getElementById("adm-prod-stock-status");
      const stockStatus = (stockStatusEl && stockStatusEl.value) ? stockStatusEl.value : "available";

      const stockEl = document.getElementById("adm-prod-stock");
      const stock = stockEl && parseInt(stockEl.value, 10) ? parseInt(stockEl.value, 10) : 10;

      const warEl = document.getElementById("adm-prod-warranty");
      const warranty = (warEl && warEl.value.trim()) ? warEl.value.trim() : "1 Year Warranty";

      const descEl = document.getElementById("adm-prod-desc");
      const desc = (descEl && descEl.value.trim()) ? descEl.value.trim() : name;

      const rawImages = document.getElementById("adm-prod-image") ? document.getElementById("adm-prod-image").value.trim() : "";
      let video = (window.MediaUploader && MediaUploader.getVideo("adm")) || (document.getElementById("adm-prod-video") ? document.getElementById("adm-prod-video").value.trim() : "");

      // Determine parent group from UH_CATEGORIES
      const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || (typeof INITIAL_CATEGORIES !== "undefined" ? INITIAL_CATEGORIES : []);
      const catObj = categories.find(c => c && c.id === category);
      const mainCategory = catObj ? catObj.group : (category && category.includes("iphone") ? "iphones" : "accessories");

      // Brand Selection
      const brandSelect = document.getElementById("adm-prod-brand");
      const brand = (brandSelect && brandSelect.value && brandSelect.value !== "__NEW__") 
        ? brandSelect.value 
        : (typeof detectProductBrand === "function" ? detectProductBrand({ name }) : "Apple");

      // Images list from MediaUploader or manual textarea fallback
      let imagesList = (window.MediaUploader) ? MediaUploader.getImages("adm") : [];
      if (imagesList.length === 0 && rawImages) {
        imagesList = rawImages.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      }
      if (imagesList.length === 0) {
        imagesList = ["assets/hero_showcase.jpg"];
      }

      const isUsed = !!(condition && !condition.toLowerCase().includes("brand new"));
      const storageOptions = this.getStorageOptionsFromForm('adm');
      const colorOptions = this.getColorOptionsFromForm('adm');

      let effectivePrice = price;
      let effectiveOrigPrice = origPrice;
      if (storageOptions.length > 0) {
        effectivePrice = storageOptions[0].price;
        effectiveOrigPrice = storageOptions[0].originalPrice || effectivePrice;
      }

      const newProduct = {
        id: "prod-" + Date.now(),
        name,
        title: name,
        brand,
        mainCategory,
        category,
        subCategory: isUsed ? "used" : "brand-new",
        condition,
        conditionBadge: condition 
          ? (isUsed 
              ? (battery ? `${battery} Battery` : (condition.includes("Grade A+") ? "99% Mint" : condition.includes("Grade A") ? "Grade A" : "Grade B"))
              : "Brand New Sealed")
          : null,
        batteryHealth: battery,
        price: effectivePrice,
        originalPrice: effectiveOrigPrice,
        discount: effectiveOrigPrice > effectivePrice ? `${Math.round(((effectiveOrigPrice - effectivePrice)/effectiveOrigPrice)*100)}% OFF` : "Best Price",
        rating: 5.0,
        reviewsCount: 1,
        stock,
        stockStatus,
        isFeatured: true,
        warranty,
        image: imagesList[0],
        images: imagesList,
        video: video,
        storageOptions: storageOptions,
        colorOptions: colorOptions,
        tags: [condition, category, battery ? `${battery} Battery` : "Official Genuine"].filter(Boolean),
        description: desc
      };

      // 1. Safe Save to localStorage with Quota Guard
      let products = [];
      try {
        products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) {
        products = [];
      }
      products.unshift(newProduct);

      try {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(products));
      } catch (quotaErr) {
        console.warn("⚠️ LocalStorage quota exceeded, sanitizing cached images...", quotaErr);
        try {
          // If quota hit, strip heavy base64 strings from local products list so storage doesn't crash
          const sanitized = products.map(p => {
            const clean = { ...p };
            if (clean.image && clean.image.startsWith("data:") && clean.image.length > 80000) {
              clean.image = "assets/hero_showcase.jpg";
            }
            if (Array.isArray(clean.images)) {
              clean.images = clean.images.map(img => (img && img.startsWith("data:") && img.length > 80000) ? "assets/hero_showcase.jpg" : img);
            }
            if (clean.video && (clean.video.startsWith("data:") || clean.video.startsWith("blob:"))) {
              clean.video = "";
            }
            return clean;
          });
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(sanitized.slice(0, 30)));
        } catch (err2) {
          console.warn("Could not save to localStorage, continuing with Supabase cloud save:", err2);
        }
      }

      // 2. Sync to Supabase Cloud Database
      if (window.SupabaseSync && typeof window.SupabaseSync.saveProduct === "function") {
        try {
          await window.SupabaseSync.saveProduct(newProduct);
        } catch (cloudErr) {
          console.error("Supabase cloud save error:", cloudErr);
        }
      }

      // 3. Reset Form and UI
      const form = document.getElementById("admin-add-product-form");
      if (form) form.reset();
      this.resetStorageTiers("adm");
      this.renderColorPillSelectors("adm");
      if (window.MediaUploader) MediaUploader.reset("adm");

      if (typeof showToast === "function") {
        showToast(`✅ Product "${name}" added to Live Store with ${imagesList.length} photos!`);
      }

      if (typeof this.renderProductsTable === "function") this.renderProductsTable();
      if (typeof this.renderInventoryFilterBar === "function") this.renderInventoryFilterBar();
      if (typeof this.renderStats === "function") this.renderStats();

      // Trigger re-render of storefront catalog if open
      if (window.App && typeof App.renderCatalog === "function") {
        App.renderCatalog();
        App.renderCategories();
        App.renderBrandsSection();
      }
    } catch (criticalErr) {
      console.error("Critical error in handleAddProduct:", criticalErr);
      if (typeof showToast === "function") {
        showToast("❌ Error adding product: " + (criticalErr.message || criticalErr));
      } else {
        alert("Error adding product: " + (criticalErr.message || criticalErr));
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
      }
    }
  },

  // Open Full Edit Product Modal
  openEditProduct(prodId) {
    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    this.populateCategoryDropdowns();
    this.populateBrandDropdowns();

    document.getElementById("edit-prod-id").value = prod.id;
    document.getElementById("edit-prod-name").value = prod.name;
    if (document.getElementById("edit-prod-brand")) {
      document.getElementById("edit-prod-brand").value = prod.brand || "Apple";
    }
    document.getElementById("edit-prod-category").value = prod.category;
    document.getElementById("edit-prod-condition").value = prod.condition || "";
    document.getElementById("edit-prod-price").value = prod.price;
    document.getElementById("edit-prod-origprice").value = prod.originalPrice || prod.price;
    document.getElementById("edit-prod-battery").value = prod.batteryHealth || "";
    if (document.getElementById("edit-prod-stock-status")) {
      document.getElementById("edit-prod-stock-status").value = prod.stockStatus || "available";
    }
    document.getElementById("edit-prod-stock").value = prod.stock !== undefined ? prod.stock : 10;
    document.getElementById("edit-prod-warranty").value = prod.warranty || "";
    document.getElementById("edit-prod-desc").value = prod.description || "";
    document.getElementById("edit-prod-video").value = prod.video || "";

    // Render storage matrix and stock colors for edit modal
    this.renderStorageTiersInputs('edit', prod.storageOptions || []);
    this.renderColorPillSelectors('edit', prod.colorOptions || []);

    // Fill images and video into MediaUploader dropzones & previews
    const imgArray = (prod.images && Array.isArray(prod.images) && prod.images.length > 0) ? prod.images : [prod.image || ""];
    if (document.getElementById("edit-prod-images")) {
      document.getElementById("edit-prod-images").value = imgArray.join("\n");
    }
    if (window.MediaUploader) {
      MediaUploader.setImages('edit', imgArray);
      MediaUploader.setVideo('edit', prod.video || "");
    }

    if (window.App && typeof App.openModal === "function") {
      App.openModal("admin-edit-product-modal");
    }
  },

  // Save Full Product Edit
  handleSaveEditProduct(e) {
    e.preventDefault();
    const prodId = document.getElementById("edit-prod-id").value;
    const name = document.getElementById("edit-prod-name").value.trim();
    const brand = (document.getElementById("edit-prod-brand") && document.getElementById("edit-prod-brand").value !== "__NEW__")
      ? document.getElementById("edit-prod-brand").value
      : "Apple";
    const category = document.getElementById("edit-prod-category").value;
    const condition = (document.getElementById("edit-prod-condition")?.value || "").trim();
    const price = parseInt(document.getElementById("edit-prod-price").value, 10);
    const origPrice = parseInt(document.getElementById("edit-prod-origprice").value, 10) || price;
    const battery = (document.getElementById("edit-prod-battery")?.value || "").trim() || null;
    const stockStatus = document.getElementById("edit-prod-stock-status")?.value || "available";
    const stock = parseInt(document.getElementById("edit-prod-stock").value, 10) || 10;
    const warranty = document.getElementById("edit-prod-warranty") ? document.getElementById("edit-prod-warranty").value.trim() : "1 Year Warranty";
    const video = (window.MediaUploader && MediaUploader.getVideo('edit')) || (document.getElementById("edit-prod-video") ? document.getElementById("edit-prod-video").value.trim() : "");
    const desc = document.getElementById("edit-prod-desc").value.trim();

    // Determine parent group
    const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || INITIAL_CATEGORIES;
    const catObj = categories.find(c => c.id === category);
    const mainCategory = catObj ? catObj.group : (category.includes("iphone") ? "iphones" : "accessories");

    // Gather storage options & stock colors
    const storageOptions = this.getStorageOptionsFromForm('edit');
    const colorOptions = this.getColorOptionsFromForm('edit');

    // Parse image URLs from direct dropzone or textarea
    let imagesList = (window.MediaUploader) ? MediaUploader.getImages('edit') : [];
    if (imagesList.length === 0) {
      const rawImgs = document.getElementById("edit-prod-images") ? document.getElementById("edit-prod-images").value.trim() : "";
      if (rawImgs) {
        imagesList = rawImgs.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      }
    }
    if (imagesList.length === 0) imagesList = ["assets/hero_showcase.jpg"];

    const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const isUsed = !!(condition && !condition.toLowerCase().includes("brand new"));

    prod.name = name;
    prod.brand = brand;
    prod.mainCategory = mainCategory;
    prod.category = category;
    prod.subCategory = isUsed ? "used" : "brand-new";
    prod.condition = condition;
    prod.conditionBadge = condition
      ? (isUsed 
          ? (battery ? `${battery} Battery` : (condition.includes("Grade A+") ? "99% Mint" : condition.includes("Grade A") ? "Grade A" : "Grade B"))
          : "Brand New Sealed")
      : null;
    prod.batteryHealth = battery;
    prod.price = price;
    prod.originalPrice = origPrice;
    prod.discount = origPrice > price ? `${Math.round(((origPrice - price)/origPrice)*100)}% OFF` : "Best Deal";
    prod.stock = stock;
    prod.stockStatus = stockStatus;
    prod.warranty = warranty;
    prod.images = imagesList;
    prod.image = imagesList[0];
    prod.video = video;
    prod.storageOptions = storageOptions;
    prod.colorOptions = colorOptions;
    prod.description = desc;

    localStorage.setItem("UH_PRODUCTS", JSON.stringify(products));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveProduct === "function") {
      window.SupabaseSync.saveProduct(prod);
    }

    if (window.App && typeof App.closeModal === "function") {
      App.closeModal("admin-edit-product-modal");
    }

    this.renderProductsTable();
    this.renderInventoryFilterBar();
    this.renderStats();
    showToast(`Updated "${name}" with ${imagesList.length} photos and video!`);

    if (window.App && typeof App.renderCatalog === "function") {
      App.renderCatalog();
      App.renderCategories();
    }
  },

  promptStockEdit(prodId, currentStock) {
    const newStock = prompt(`Update stock count for ${prodId}:`, currentStock);
    if (newStock !== null && !isNaN(parseInt(newStock, 10))) {
      const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        prod.stock = parseInt(newStock, 10);
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(products));

        // Sync to Supabase Cloud Database
        if (window.SupabaseSync && typeof window.SupabaseSync.saveProduct === "function") {
          window.SupabaseSync.saveProduct(prod);
        }
        this.renderProductsTable();
        showToast(`Stock updated to ${prod.stock}!`);
      }
    }
  },

  async deleteProduct(prodId) {
    if (!prodId) return;
    if (confirm("Are you sure you want to permanently delete this product from Universe Hub inventory?")) {
      const strId = String(prodId);

      // Track in deleted IDs so it never re-appears on refresh
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
      } catch (e) { deletedIds = []; }
      if (!deletedIds.includes(strId)) {
        deletedIds.push(strId);
        try { localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(deletedIds)); } catch (e) {}
      }

      // 1. Remove from local storage
      let products = [];
      try {
        products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) { products = []; }
      products = products.filter(p => String(p.id) !== strId);
      try {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(products));
      } catch (e) {}

      // 2. Permanently delete from Supabase Cloud Database
      if (window.SupabaseSync && typeof window.SupabaseSync.deleteProduct === "function") {
        try {
          await window.SupabaseSync.deleteProduct(strId);
        } catch (e) {
          console.warn("Supabase delete notice:", e);
        }
      }

      this.renderProductsTable();
      this.renderInventoryFilterBar();
      this.renderStats();
      showToast("🗑️ Product permanently deleted from store.");
      if (window.App && typeof App.renderCatalog === "function") {
        App.renderCatalog();
        App.renderCategories();
      }
    }
  },

  // 2. Repair Orders Management & Notification System
  renderRepairsTable() {
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const tbody = document.getElementById("admin-repairs-tbody");
    if (!tbody) return;

    if (repairs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No repair jobs logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = repairs.map(rep => {
      let waDigits = (rep.phone || '').replace(/\D/g, '');
      if (waDigits.startsWith('0')) waDigits = '94' + waDigits.substring(1);
      else if (!waDigits.startsWith('94') && waDigits.length === 9) waDigits = '94' + waDigits;
      const waMsg = `Hello ${rep.customerName || 'Customer'}! This is Universe Hub Repair Lab (Maharagama). Regarding your device repair (${rep.device || 'Phone'}) with Job ID #${rep.trackingCode}: Current Status is "${rep.status}".`;
      const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}` : '#';

      return `
        <tr>
          <td style="font-weight:700; color:var(--neon-cyan); font-family:monospace;">${rep.trackingCode}</td>
          <td>
            <div style="font-weight:700; color:#fff;">${rep.customerName}</div>
            <div style="margin-top:4px;">
              ${waDigits ? `
                <a href="${waLink}" target="_blank" rel="noopener noreferrer"
                   style="background:#25d366; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; box-shadow:0 0 8px rgba(37,211,102,0.3);"
                   title="Directly message customer on WhatsApp">
                  <span>💬</span>
                  <span>${rep.phone}</span>
                </a>
              ` : `<small style="color:var(--text-muted);">${rep.phone || 'No phone'}</small>`}
            </div>
          </td>
          <td>
            <div style="font-weight:700; color:#f1f5f9;">${rep.device}</div>
            <small style="color:var(--text-secondary);">${rep.issue}</small>
          </td>
          <td>
            <select onchange="AdminController.handleRepairStatusChange('${rep.trackingCode}', this.value)" style="padding:5px 8px; font-size:12px; border-radius:6px; font-weight:700; background:#1e293b; color:${this.getStatusColor(rep.status)}; border:1px solid rgba(255,255,255,0.15); cursor:pointer;">
              <option value="Received" ${rep.status === 'Received' ? 'selected' : ''}>📥 Received</option>
              <option value="Diagnostic" ${rep.status === 'Diagnostic' ? 'selected' : ''}>🔍 Diagnostic</option>
              <option value="In Progress" ${rep.status === 'In Progress' ? 'selected' : ''}>⚙️ In Progress</option>
              <option value="Ready for Pickup" ${rep.status === 'Ready for Pickup' ? 'selected' : ''}>✅ Ready for Pickup</option>
              <option value="Completed" ${rep.status === 'Completed' ? 'selected' : ''}>🎉 Completed</option>
            </select>
          </td>
          <td style="color:#fff; font-weight:700;">Rs. ${(rep.cost || 0).toLocaleString()}</td>
          <td>
            <div style="font-size:12px; color:var(--text-secondary);">${rep.notes || 'In store queue'}</div>
            ${rep.lastNotified ? `
              <div style="font-size:10.5px; color:#25d366; font-weight:700; margin-top:3px; display:flex; align-items:center; gap:3px;">
                <span>🔔</span>
                <span>${rep.lastNotified}</span>
              </div>
            ` : ''}
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-primary-glow" style="padding:4px 9px; font-size:11px; background:linear-gradient(135deg, #0284c7, #25d366); box-shadow:0 0 10px rgba(37,211,102,0.3);" title="Send SMS / WhatsApp Status Notification" onclick="AdminController.openRepairNotifyModal('${rep.trackingCode}')">
                🔔 Notify
              </button>
              <button class="btn-icon-action btn-delete" title="Delete Record" onclick="AdminController.deleteRepair('${rep.trackingCode}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  getStatusColor(status) {
    switch (status) {
      case "Received": return "#94a3b8";
      case "Diagnostic": return "#f59e0b";
      case "In Progress": return "#00d2ff";
      case "Ready for Pickup": return "#10b981";
      case "Completed": return "#a855f7";
      default: return "#fff";
    }
  },

  // Called when Admin changes status dropdown
  handleRepairStatusChange(trackingCode, newStatus) {
    this.updateRepairStatus(trackingCode, newStatus);
    // Automatically trigger notification composer for the customer!
    this.openRepairNotifyModal(trackingCode, newStatus);
  },

  updateRepairStatus(trackingCode, newStatus) {
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const rep = repairs.find(r => r.trackingCode === trackingCode);
    if (rep) {
      rep.status = newStatus;
      if (newStatus === "Ready for Pickup") {
        rep.stepIndex = 4;
        rep.estimatedCompletion = "Ready Now at Front Desk!";
      } else if (newStatus === "In Progress") {
        rep.stepIndex = 3;
      } else if (newStatus === "Diagnostic") {
        rep.stepIndex = 2;
      } else if (newStatus === "Received") {
        rep.stepIndex = 1;
      } else if (newStatus === "Completed") {
        rep.stepIndex = 5;
        rep.estimatedCompletion = "Collected by Customer";
      }
      localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));
      showToast(`Repair ${trackingCode} status updated to: ${newStatus}`);
      this.renderStats();
    }
  },

  // Open the Notification Sender Modal (WhatsApp & SMS)
  openRepairNotifyModal(trackingCode, targetStatus = null) {
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const rep = repairs.find(r => r.trackingCode === trackingCode);
    if (!rep) {
      showToast("Repair record not found: " + trackingCode);
      return;
    }

    const status = targetStatus || rep.status || "Received";

    document.getElementById("notify-rep-code").value = rep.trackingCode;
    document.getElementById("notify-rep-code-display").textContent = rep.trackingCode;
    
    const badge = document.getElementById("notify-rep-status-badge");
    if (badge) {
      badge.textContent = status;
      badge.style.color = this.getStatusColor(status);
    }

    document.getElementById("notify-rep-cust-name").textContent = rep.customerName || "Customer";
    document.getElementById("notify-rep-device-info").textContent = `${rep.device} • ${rep.issue} (Est. Rs. ${(rep.cost || 0).toLocaleString()})`;
    document.getElementById("notify-rep-phone-display").textContent = `📱 Contact / WhatsApp: ${rep.phone || 'Not Provided'}`;

    // Highlight template button
    document.querySelectorAll(".btn-notify-template").forEach(btn => {
      btn.style.borderColor = btn.dataset.status === status ? "var(--neon-cyan)" : "rgba(255,255,255,0.15)";
      btn.style.background = btn.dataset.status === status ? "rgba(0,210,255,0.15)" : "transparent";
    });

    // Populate message
    const textarea = document.getElementById("notify-message-textarea");
    if (textarea) {
      textarea.value = this.getRepairNotificationMessage(rep, status);
    }

    App.openModal("admin-repair-notify-modal");
  },

  selectNotificationTemplate(status) {
    const code = document.getElementById("notify-rep-code").value;
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const rep = repairs.find(r => r.trackingCode === code);
    if (!rep) return;

    const badge = document.getElementById("notify-rep-status-badge");
    if (badge) {
      badge.textContent = status;
      badge.style.color = this.getStatusColor(status);
    }

    document.querySelectorAll(".btn-notify-template").forEach(btn => {
      btn.style.borderColor = btn.dataset.status === status ? "var(--neon-cyan)" : "rgba(255,255,255,0.15)";
      btn.style.background = btn.dataset.status === status ? "rgba(0,210,255,0.15)" : "transparent";
    });

    const textarea = document.getElementById("notify-message-textarea");
    if (textarea) {
      textarea.value = this.getRepairNotificationMessage(rep, status);
    }
  },

  // Generates tailored, professional customer messages
  getRepairNotificationMessage(rep, status) {
    const cust = rep.customerName || 'Valued Customer';
    const code = rep.trackingCode;
    const device = rep.device || 'Phone';
    const costStr = rep.cost ? `Rs. ${Number(rep.cost).toLocaleString()}` : 'Standard';

    switch (status) {
      case 'Received':
        return `Hello ${cust}! 🛠️\n\nYour device (${device}) has been safely received at Universe Hub Repair Lab (Maharagama).\n\n• Job Tracking ID: ${code}\n• Reported Issue: ${rep.issue || 'Diagnostic Inspection'}\n• Track Live Status: http://localhost:3000/#repair-center\n\nOur hardware specialist will inspect your phone shortly. For questions, reply to this chat or call 074-0219239.`;

      case 'Diagnostic':
        return `Hello ${cust}! 🔍\n\nDiagnostic testing has begun on your ${device} (Job ID: ${code}) at Universe Hub Maharagama.\n\nOur senior hardware technician is testing components and evaluating board schematics. We will update you with exact cost & timeline shortly.\n\nLive Status Tracker: http://localhost:3000/#repair-center`;

      case 'In Progress':
        return `Hello ${cust}! ⚙️\n\nRepair work is actively IN PROGRESS for your ${device} (Job ID: ${code}) at Universe Hub Lab.\n\n• Service: ${rep.issue || 'Hardware Repair'}\n• Est. Cost: ${costStr}\n• Lab Desk: ${rep.desk || 'Main Tech Bay'}\n\nOur technician is using 100% genuine replacement parts and precision micro-soldering tools. We will notify you as soon as testing is complete!`;

      case 'Ready for Pickup':
        return `🎉 GREAT NEWS ${cust}!\n\nYour ${device} repair is 100% COMPLETE and has passed our 40-point quality check! (Job ID: ${code}).\n\n• Final Amount Payable: ${costStr}\n• Pickup Location: Universe Hub Flagship Store, 188/8c, High Level Road, Maharagama.\n• Hours: Open Daily 9:30 AM – 8:30 PM\n• Includes 6-Month Store Hardware Warranty!\n\nPlease bring this tracking code (${code}) to counter for instant collection.`;

      case 'Completed':
        return `Thank you ${cust} for choosing Universe Hub Repair Lab! 🙏\n\nYour ${device} (Job ID: ${code}) has been collected successfully. Your 6-Month warranty is active from today.\n\nIf you need any future assistance, accessories, or flagship tech, WhatsApp us anytime at 074-0219239!`;

      default:
        return `Hello ${cust}! Update on your ${device} repair (Job ID: ${code}): Current Status is "${status}". Universe Hub Maharagama Lab (Hotline: 074-0219239).`;
    }
  },

  // 1-Click Send via WhatsApp
  sendRepairWhatsAppNotification() {
    const code = document.getElementById("notify-rep-code").value;
    const msg = document.getElementById("notify-message-textarea").value.trim();
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const rep = repairs.find(r => r.trackingCode === code);

    if (!rep) return;

    let waDigits = (rep.phone || '').replace(/\D/g, '');
    if (waDigits.startsWith('0')) waDigits = '94' + waDigits.substring(1);
    else if (!waDigits.startsWith('94') && waDigits.length === 9) waDigits = '94' + waDigits;

    if (!waDigits) {
      alert("No valid phone number found for this customer.");
      return;
    }

    const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    rep.lastNotified = `WhatsApp: ${rep.status} (${nowStr})`;
    localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));

    this.renderRepairsTable();
    App.closeModal("admin-repair-notify-modal");
    showToast(`💬 WhatsApp notification sent to ${rep.customerName}!`);
  },

  // 1-Click Send via SMS / Copy
  sendRepairSmsNotification() {
    const code = document.getElementById("notify-rep-code").value;
    const msg = document.getElementById("notify-message-textarea").value.trim();
    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    const rep = repairs.find(r => r.trackingCode === code);

    if (!rep) return;

    let waDigits = (rep.phone || '').replace(/\D/g, '');

    // Copy formatted text to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
    }

    // Try native SMS URI
    if (waDigits) {
      window.open(`sms:${waDigits}?body=${encodeURIComponent(msg)}`, '_blank');
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    rep.lastNotified = `SMS: ${rep.status} (${nowStr})`;
    localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));

    this.renderRepairsTable();
    App.closeModal("admin-repair-notify-modal");
    showToast(`📱 SMS text copied to clipboard & message prompt opened!`);
  },

  deleteRepair(code) {
    if (confirm(`Delete repair record ${code}?`)) {
      let repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
      repairs = repairs.filter(r => r.trackingCode !== code);
      localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));
      this.renderRepairsTable();
      this.renderStats();
      showToast("Repair record deleted.");
    }
  },

  handleAdminAddRepair() {
    const cust = document.getElementById("adm-rep-cust").value.trim();
    const phone = document.getElementById("adm-rep-phone").value.trim();
    const device = document.getElementById("adm-rep-device").value.trim();
    const issue = document.getElementById("adm-rep-issue").value.trim();
    const cost = parseInt(document.getElementById("adm-rep-cost").value, 10) || 5000;
    const code = "UH-" + Math.floor(1000 + Math.random() * 9000);

    if (!cust || !device) {
      alert("Please provide customer name and device model.");
      return;
    }

    const newRepair = {
      trackingCode: code,
      customerName: cust,
      phone: phone || "Not Provided",
      device,
      issue,
      status: "In Progress",
      stepIndex: 3,
      estimatedCompletion: "Tomorrow 2:00 PM",
      desk: "Bay #1",
      cost,
      notes: "Booked directly via Universe Hub Physical Counter."
    };

    const repairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
    repairs.unshift(newRepair);
    localStorage.setItem("UH_REPAIRS", JSON.stringify(repairs));

    document.getElementById("admin-new-repair-form").reset();
    showToast(`New Repair Job created! Tracking Code: ${code}`);
    this.renderRepairsTable();
    this.renderStats();
  },

  // 3. Customer Reviews Moderation
  renderReviewsTable() {
    const reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
    const tbody = document.getElementById("admin-reviews-tbody");
    if (!tbody) return;

    tbody.innerHTML = reviews.map(rev => `
      <tr>
        <td>
          <div style="font-weight:700; color:#fff;">${rev.author}</div>
          <small style="color:var(--neon-cyan);">${rev.visitType || 'Store Customer'}</small>
        </td>
        <td>
          <span style="color:var(--warning); font-size:14px;">${'★'.repeat(rev.rating)}</span>
          <span style="color:var(--text-muted); font-size:12px;">(${rev.rating}.0)</span>
        </td>
        <td style="max-width:300px;">
          <div style="color:var(--text-secondary); font-size:13px; line-height:1.4;">${rev.comment}</div>
          ${rev.storeReply ? `<small style="color:var(--neon-cyan); display:block; margin-top:4px;"><b>Store:</b> ${rev.storeReply}</small>` : ''}
        </td>
        <td style="color:var(--text-muted); font-size:12px;">${rev.date || 'Recent'}</td>
        <td>
          <div class="table-action-btns">
            <button class="btn-icon-action btn-approve" title="Reply to Review" onclick="AdminController.replyToReview('${rev.id}')">
              💬
            </button>
            <button class="btn-icon-action btn-delete" title="Delete Review" onclick="AdminController.deleteReview('${rev.id}')">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join("");
  },

  replyToReview(revId) {
    const reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
    const rev = reviews.find(r => r.id === revId);
    if (rev) {
      const reply = prompt("Enter official Universe Hub store reply to " + rev.author + ":", rev.storeReply || "Thank you for visiting Universe Hub!");
      if (reply) {
        rev.storeReply = reply;
        localStorage.setItem("UH_REVIEWS", JSON.stringify(reviews));
        this.renderReviewsTable();
        showToast("Official store reply published!");
        if (window.App && typeof App.renderReviews === "function") {
          App.renderReviews();
        }
      }
    }
  },

  deleteReview(revId) {
    if (confirm("Delete this review from storefront?")) {
      let reviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
      reviews = reviews.filter(r => r.id !== revId);
      localStorage.setItem("UH_REVIEWS", JSON.stringify(reviews));
      this.renderReviewsTable();
      this.renderStats();
      showToast("Review deleted.");
      if (window.App && typeof App.renderReviews === "function") {
        App.renderReviews();
      }
    }
  },

  // 4. Store Orders Table
  renderOrdersTable() {
    if (window.SupabaseSync && typeof window.SupabaseSync.fetchOrders === 'function') {
      window.SupabaseSync.fetchOrders().then(() => {
        this._renderOrdersRows();
      });
    }
    this._renderOrdersRows();
  },

  _renderOrdersRows() {
    let orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    let deletedOrderIds = [];
    try {
      deletedOrderIds = JSON.parse(localStorage.getItem("UH_DELETED_ORDER_IDS") || "[]");
    } catch (e) { deletedOrderIds = []; }
    orders = orders.filter(o => !deletedOrderIds.includes(String(o.id)));

    const tbody = document.getElementById("admin-orders-tbody");
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No orders recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(ord => {
      const waNumber = ord.whatsapp || ord.phone || '';
      let waDigits = waNumber.replace(/\D/g, '');
      if (waDigits.startsWith('0')) waDigits = '94' + waDigits.substring(1);
      else if (!waDigits.startsWith('94') && waDigits.length === 9) waDigits = '94' + waDigits;
      
      const itemNames = (ord.items || []).map(i => `${i.name || i.title} (x${i.qty})`).join(', ');
      const waMsg = `Hello ${ord.customerName || 'Customer'}! This is Universe Hub Store (Maharagama). We have received your Order #${ord.id} for ${itemNames}. Total: Rs. ${(ord.total || 0).toLocaleString()} (${ord.method || 'Standard'}). We are contacting you via WhatsApp to confirm your delivery and order dispatch.`;
      const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}` : '#';

      return `
        <tr>
          <td style="font-weight:700; color:var(--neon-cyan);">${ord.id}</td>
          <td>
            <div style="font-weight:700; color:#fff; font-size:13.5px; margin-bottom:4px;">${ord.customerName}</div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
              ${waDigits ? `
                <a href="${waLink}" target="_blank" rel="noopener noreferrer" 
                   style="background:#25d366; color:#fff; font-size:11.5px; font-weight:700; padding:4px 9px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:5px; box-shadow:0 0 10px rgba(37,211,102,0.35); transition:all 0.2s ease;"
                   title="Click to directly chat with customer on WhatsApp">
                  <span>💬</span>
                  <span>${waNumber}</span>
                  <span style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 4px; border-radius:3px;">CHAT</span>
                </a>
              ` : `
                <span style="color:#ef4444; font-size:11px; font-weight:600;">⚠️ ${waNumber || 'No WhatsApp'}</span>
              `}
            </div>
            ${ord.address ? `<div style="font-size:11px; color:var(--text-muted); line-height:1.3; max-width:210px;">📍 ${ord.address}</div>` : ''}
            ${ord.email ? `<div style="font-size:10.5px; color:#94a3b8; margin-top:2px;">✉️ ${ord.email}</div>` : ''}
          </td>
          <td>
            ${(ord.items || []).map(i => `<div style="font-size:12px; color:#cbd5e1;">• ${i.name || i.title} × ${i.qty}</div>`).join("")}
          </td>
          <td style="font-weight:800; color:#38bdf8;">Rs. ${(ord.total || 0).toLocaleString()}</td>
          <td><span class="badge-pill" style="background:rgba(59,130,246,0.15); color:#60a5fa;">${ord.method || 'Courier'}</span></td>
          <td style="color:var(--text-muted); font-size:12px;">${ord.date || 'Recent'}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" class="btn-invoice-download" onclick="InvoiceService.showInvoice('${ord.id}')" style="padding:4px 8px; font-size:11px;" title="View &amp; Print Official Tax Invoice">
                📄 Invoice
              </button>
              <button type="button" class="btn-invoice-print" onclick="InvoiceService.showInvoice('${ord.id}'); setTimeout(() => InvoiceService.downloadPDF('${ord.id}'), 300);" style="padding:4px 8px; font-size:11px;" title="1-Click Download A4 PDF">
                📥 PDF
              </button>
              <button type="button" onclick="AdminController.promptDeleteOrder('${ord.id}')" style="padding:4px 8px; font-size:11px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; cursor:pointer; font-weight:700; transition:all 0.2s ease;" title="Delete this order record" onmouseover="this.style.background='rgba(239,68,68,0.3)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  // 5. Store Identity, Hero Banner & About Us Manager
  hasBoundStoreEvents: false,

  renderStoreSettings() {
    let settings = typeof DEFAULT_STORE_SETTINGS !== 'undefined' ? DEFAULT_STORE_SETTINGS : {};
    try {
      const saved = localStorage.getItem("UH_STORE_SETTINGS");
      if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch (e) {
      // keep fallback
    }

    // Hero Banner Preview
    const bannerPreview = document.getElementById("admin-hero-banner-preview");
    if (bannerPreview && settings.heroBannerImg) {
      bannerPreview.src = settings.heroBannerImg;
    }
    this.attachDimensionWatcher(bannerPreview, document.getElementById("admin-hero-dims-badge"));

    const bannerUrlInput = document.getElementById("admin-banner-url-input");
    if (bannerUrlInput) {
      bannerUrlInput.value = settings.heroBannerImg || "";
    }

    // Logo Preview
    const logoPreview = document.getElementById("admin-logo-preview");
    if (logoPreview) {
      const activeLogo = (settings && settings.logoImg && settings.logoImg.includes("universe_hub_logo")) 
        ? settings.logoImg 
        : "assets/universe_hub_logo.png?v=10";
      logoPreview.src = activeLogo;
      logoPreview.style.background = "transparent";
      logoPreview.style.mixBlendMode = "screen";
      this.attachDimensionWatcher(logoPreview, document.getElementById("admin-logo-dims-badge"));
    }

    // Dual Promo Banners (Cases & Fast Chargers)
    // Promo 1 (Cases)
    const p1Preview = document.getElementById("admin-promo1-preview");
    if (p1Preview) {
      p1Preview.src = settings.promoBanner1Img || "assets/cases_banner.jpg";
      this.attachDimensionWatcher(p1Preview, document.getElementById("admin-promo1-dims-badge"));
    }
    const p1Url = document.getElementById("admin-promo1-url-input");
    if (p1Url) p1Url.value = settings.promoBanner1Img || "";
    const p1Title = document.getElementById("admin-promo1-title");
    if (p1Title) p1Title.value = settings.promoBanner1Title || "Keep Your Phone Safe & Stylish";
    const p1Desc = document.getElementById("admin-promo1-desc");
    if (p1Desc) p1Desc.value = settings.promoBanner1Desc || "Premium aerospace carbon fiber, MagSafe clear cases and camera lens protection for every model.";
    const p1Btn = document.getElementById("admin-promo1-btn-text");
    if (p1Btn) p1Btn.value = settings.promoBanner1BtnText || "Explore Cases";
    const p1Cat = document.getElementById("admin-promo1-category");
    if (p1Cat) p1Cat.value = settings.promoBanner1Category || "cases";

    const p1PrevTitle = document.getElementById("admin-promo1-preview-title");
    if (p1PrevTitle) p1PrevTitle.textContent = settings.promoBanner1Title || "Keep Your Phone Safe & Stylish";
    const p1PrevDesc = document.getElementById("admin-promo1-preview-desc");
    if (p1PrevDesc) p1PrevDesc.textContent = settings.promoBanner1Desc || "Premium aerospace carbon fiber...";
    const p1PrevBtn = document.getElementById("admin-promo1-preview-btn");
    if (p1PrevBtn) p1PrevBtn.textContent = (settings.promoBanner1BtnText || "Explore Cases") + " →";

    // Promo 2 (Chargers)
    const p2Preview = document.getElementById("admin-promo2-preview");
    if (p2Preview) {
      p2Preview.src = settings.promoBanner2Img || "assets/chargers_banner.jpg";
      this.attachDimensionWatcher(p2Preview, document.getElementById("admin-promo2-dims-badge"));
    }
    const p2Url = document.getElementById("admin-promo2-url-input");
    if (p2Url) p2Url.value = settings.promoBanner2Img || "";
    const p2Title = document.getElementById("admin-promo2-title");
    if (p2Title) p2Title.value = settings.promoBanner2Title || "Power Up Your Life";
    const p2Desc = document.getElementById("admin-promo2-desc");
    if (p2Desc) p2Desc.value = settings.promoBanner2Desc || "65W GaN fast dual chargers, 240W braided cables & digital battery packs for non-stop performance.";
    const p2Btn = document.getElementById("admin-promo2-btn-text");
    if (p2Btn) p2Btn.value = settings.promoBanner2BtnText || "Shop Chargers";
    const p2Cat = document.getElementById("admin-promo2-category");
    if (p2Cat) p2Cat.value = settings.promoBanner2Category || "chargers";

    const p2PrevTitle = document.getElementById("admin-promo2-preview-title");
    if (p2PrevTitle) p2PrevTitle.textContent = settings.promoBanner2Title || "Power Up Your Life";
    const p2PrevDesc = document.getElementById("admin-promo2-preview-desc");
    if (p2PrevDesc) p2PrevDesc.textContent = settings.promoBanner2Desc || "65W GaN fast dual chargers...";
    const p2PrevBtn = document.getElementById("admin-promo2-preview-btn");
    if (p2PrevBtn) p2PrevBtn.textContent = (settings.promoBanner2BtnText || "Shop Chargers") + " →";

    // Contact & Location Fields
    const nameInput = document.getElementById("admin-store-name");
    if (nameInput) nameInput.value = settings.storeName || "Universe Hub";

    const phoneInput = document.getElementById("admin-store-phone");
    if (phoneInput) phoneInput.value = settings.phone || "074-0219239";

    const waInput = document.getElementById("admin-store-whatsapp");
    if (waInput) waInput.value = settings.whatsapp || "074-0219239";

    const emailInput = document.getElementById("admin-store-email");
    if (emailInput) emailInput.value = settings.email || "universehubstore00@gmail.com";

    const hoursInput = document.getElementById("admin-store-hours");
    if (hoursInput) hoursInput.value = settings.openingHours || "Open Daily: 9:30 AM – 8:30 PM";

    const addrInput = document.getElementById("admin-store-address");
    if (addrInput) addrInput.value = settings.address || "188/8c, High Level Road, Maharagama";

    const mapsInput = document.getElementById("admin-store-maps");
    if (mapsInput) mapsInput.value = settings.googleMapsUrl || "https://maps.app.goo.gl/r1BY5dMznxRunVC58";

    // About Us Content Fields
    const aboutHInput = document.getElementById("admin-about-heading");
    if (aboutHInput) aboutHInput.value = settings.aboutHeading || "";

    const aboutSInput = document.getElementById("admin-about-story");
    if (aboutSInput) aboutSInput.value = settings.aboutStory || "";

    const aboutMInput = document.getElementById("admin-about-mission");
    if (aboutMInput) aboutMInput.value = settings.aboutMission || "";

    // 5. Admin Security Configuration
    let adminCfg = typeof DEFAULT_ADMIN_CONFIG !== 'undefined' ? DEFAULT_ADMIN_CONFIG : { email: "shashikaisuranga143@gmail.com", password: "Kumudinikumari@0709" };
    try {
      const savedAdmin = localStorage.getItem("UH_ADMIN_CONFIG");
      if (savedAdmin) adminCfg = { ...adminCfg, ...JSON.parse(savedAdmin) };
    } catch (e) {}
    const adminEmailInput = document.getElementById("admin-cfg-email");
    if (adminEmailInput) adminEmailInput.value = adminCfg.email || "shashikaisuranga143@gmail.com";
    const adminPassInput = document.getElementById("admin-cfg-password");
    if (adminPassInput) adminPassInput.value = adminCfg.password || "Kumudinikumari@0709";

    const deletePinInput = document.getElementById("admin-order-delete-pin");
    if (deletePinInput) deletePinInput.value = settings.orderDeletePin || "1234";

    // Bind Dropzones once
    if (!this.hasBoundStoreEvents) {
      this.bindStoreUploaderEvents();
      this.hasBoundStoreEvents = true;
    }
  },

  bindStoreUploaderEvents() {
    // 1. Hero Banner Dropzone & File Input
    const bannerDropzone = document.getElementById("admin-banner-dropzone");
    const bannerInput = document.getElementById("admin-banner-file-input");

    if (bannerDropzone && bannerInput) {
      bannerDropzone.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
          bannerInput.click();
        }
      });

      bannerInput.addEventListener("change", (e) => {
        if (bannerInput.files && bannerInput.files.length > 0) {
          this.handleHeroBannerFile(bannerInput.files[0]);
          bannerInput.value = "";
        }
      });

      ["dragenter", "dragover"].forEach(eventName => {
        bannerDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          bannerDropzone.style.borderColor = "var(--neon-purple)";
          bannerDropzone.style.background = "rgba(157,78,221,0.1)";
        });
      });

      ["dragleave", "dragend"].forEach(eventName => {
        bannerDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          bannerDropzone.style.borderColor = "var(--neon-cyan)";
          bannerDropzone.style.background = "rgba(0,210,255,0.03)";
        });
      });

      bannerDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        bannerDropzone.style.borderColor = "var(--neon-cyan)";
        bannerDropzone.style.background = "rgba(0,210,255,0.03)";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleHeroBannerFile(e.dataTransfer.files[0]);
        }
      });
    }

    // 2. Logo Dropzone & File Input
    const logoDropzone = document.getElementById("admin-logo-dropzone");
    const logoInput = document.getElementById("admin-logo-file-input");

    if (logoDropzone && logoInput) {
      logoDropzone.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
          logoInput.click();
        }
      });

      logoInput.addEventListener("change", (e) => {
        if (logoInput.files && logoInput.files.length > 0) {
          this.handleLogoFile(logoInput.files[0]);
          logoInput.value = "";
        }
      });

      ["dragenter", "dragover"].forEach(eventName => {
        logoDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          logoDropzone.style.borderColor = "var(--neon-cyan)";
        });
      });

      ["dragleave", "dragend"].forEach(eventName => {
        logoDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          logoDropzone.style.borderColor = "rgba(255,255,255,0.2)";
        });
      });

      logoDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        logoDropzone.style.borderColor = "rgba(255,255,255,0.2)";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleLogoFile(e.dataTransfer.files[0]);
        }
      });
    }

    // 3. Promo Banner 1 (Cases) Dropzone & File Input
    const promo1Dropzone = document.getElementById("admin-promo1-dropzone");
    const promo1Input = document.getElementById("admin-promo1-file-input");

    if (promo1Dropzone && promo1Input) {
      promo1Dropzone.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
          promo1Input.click();
        }
      });

      promo1Input.addEventListener("change", (e) => {
        if (promo1Input.files && promo1Input.files.length > 0) {
          this.handlePromoBannerFile(1, promo1Input.files[0]);
          promo1Input.value = "";
        }
      });

      ["dragenter", "dragover"].forEach(eventName => {
        promo1Dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          promo1Dropzone.style.borderColor = "var(--neon-cyan)";
          promo1Dropzone.style.background = "rgba(0,210,255,0.08)";
        });
      });

      ["dragleave", "dragend"].forEach(eventName => {
        promo1Dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          promo1Dropzone.style.borderColor = "rgba(0,210,255,0.35)";
          promo1Dropzone.style.background = "rgba(0,210,255,0.02)";
        });
      });

      promo1Dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        promo1Dropzone.style.borderColor = "rgba(0,210,255,0.35)";
        promo1Dropzone.style.background = "rgba(0,210,255,0.02)";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handlePromoBannerFile(1, e.dataTransfer.files[0]);
        }
      });
    }

    // 4. Promo Banner 2 (Chargers) Dropzone & File Input
    const promo2Dropzone = document.getElementById("admin-promo2-dropzone");
    const promo2Input = document.getElementById("admin-promo2-file-input");

    if (promo2Dropzone && promo2Input) {
      promo2Dropzone.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
          promo2Input.click();
        }
      });

      promo2Input.addEventListener("change", (e) => {
        if (promo2Input.files && promo2Input.files.length > 0) {
          this.handlePromoBannerFile(2, promo2Input.files[0]);
          promo2Input.value = "";
        }
      });

      ["dragenter", "dragover"].forEach(eventName => {
        promo2Dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          promo2Dropzone.style.borderColor = "var(--neon-purple)";
          promo2Dropzone.style.background = "rgba(157,78,221,0.1)";
        });
      });

      ["dragleave", "dragend"].forEach(eventName => {
        promo2Dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          promo2Dropzone.style.borderColor = "rgba(157,78,221,0.45)";
          promo2Dropzone.style.background = "rgba(157,78,221,0.02)";
        });
      });

      promo2Dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        promo2Dropzone.style.borderColor = "rgba(157,78,221,0.45)";
        promo2Dropzone.style.background = "rgba(157,78,221,0.02)";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handlePromoBannerFile(2, e.dataTransfer.files[0]);
        }
      });
    }
  },

  // Helper: Live Dimension Watcher
  attachDimensionWatcher(imgEl, badgeEl) {
    if (!imgEl || !badgeEl) return;
    const update = () => {
      if (imgEl.naturalWidth && imgEl.naturalHeight) {
        badgeEl.textContent = `Detected: ${imgEl.naturalWidth} × ${imgEl.naturalHeight} px`;
        badgeEl.classList.remove('loading');
      }
    };
    if (imgEl.complete && imgEl.naturalWidth) {
      update();
    } else {
      badgeEl.classList.add('loading');
      imgEl.addEventListener('load', update);
    }
  },

  async handleHeroBannerFile(file) {
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      showToast("Please drop or choose a valid PNG, JPG, or WebP image.");
      return;
    }

    const preview = document.getElementById("admin-hero-banner-preview");
    const statusText = document.getElementById("admin-banner-status-text");
    const urlInput = document.getElementById("admin-banner-url-input");
    const badge = document.getElementById("admin-hero-dims-badge");

    // Local instant preview
    const tempUrl = URL.createObjectURL(file);
    if (preview) preview.src = tempUrl;
    if (statusText) statusText.innerHTML = `<span style="color:#e056fd;">⏳ Uploading ${file.name}...</span>`;

    // Detect file resolution immediately
    const probe = new Image();
    probe.onload = () => {
      if (badge) badge.textContent = `Detected: ${probe.naturalWidth} × ${probe.naturalHeight} px`;
    };
    probe.src = tempUrl;

    let finalUrl = tempUrl;

    try {
      // Direct stream upload to Node server
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/png" },
        body: file
      });
      const data = await res.json();
      if (data.success && data.url) {
        finalUrl = data.url;
      } else {
        throw new Error(data.error || "Upload response error");
      }
    } catch (err) {
      console.warn("Direct upload error, falling back to base64 data URL:", err);
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(tempUrl);
        reader.readAsDataURL(file);
      });
    }

    if (preview) preview.src = finalUrl;
    if (urlInput) urlInput.value = finalUrl;
    if (statusText) statusText.innerHTML = `<span style="color:var(--success);">✓ Loaded: ${file.name}</span>`;

    // Save directly into store settings
    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    settings.heroBannerImg = finalUrl;
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    // Instantly update storefront
    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("🎉 Hero Banner updated successfully! Check your storefront.");
  },

  async handleLogoFile(file) {
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      showToast("Please select a valid image for logo.");
      return;
    }

    const preview = document.getElementById("admin-logo-preview");
    const badge = document.getElementById("admin-logo-dims-badge");
    const tempUrl = URL.createObjectURL(file);
    if (preview) preview.src = tempUrl;

    const probe = new Image();
    probe.onload = () => {
      if (badge) badge.textContent = `Detected: ${probe.naturalWidth} × ${probe.naturalHeight} px`;
    };
    probe.src = tempUrl;

    let finalUrl = tempUrl;
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/png" },
        body: file
      });
      const data = await res.json();
      if (data.success && data.url) {
        finalUrl = data.url;
      } else {
        throw new Error(data.error || "Upload error");
      }
    } catch (err) {
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(tempUrl);
        reader.readAsDataURL(file);
      });
    }

    if (preview) preview.src = finalUrl;

    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    settings.logoImg = finalUrl;
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("✨ Store Logo updated across website!");
  },

  async handlePromoBannerFile(num, file) {
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      showToast("Please drop or choose a valid PNG, JPG, or WebP image.");
      return;
    }

    const preview = document.getElementById(`admin-promo${num}-preview`);
    const badge = document.getElementById(`admin-promo${num}-dims-badge`);
    const urlInput = document.getElementById(`admin-promo${num}-url-input`);

    const tempUrl = URL.createObjectURL(file);
    if (preview) preview.src = tempUrl;

    // Detect file resolution immediately
    const probe = new Image();
    probe.onload = () => {
      if (badge) badge.textContent = `Detected: ${probe.naturalWidth} × ${probe.naturalHeight} px`;
    };
    probe.src = tempUrl;

    let finalUrl = tempUrl;
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/png" },
        body: file
      });
      const data = await res.json();
      if (data.success && data.url) {
        finalUrl = data.url;
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.warn("Direct upload error, falling back to base64:", err);
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(tempUrl);
        reader.readAsDataURL(file);
      });
    }

    if (preview) preview.src = finalUrl;
    if (urlInput) urlInput.value = finalUrl;

    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    settings[`promoBanner${num}Img`] = finalUrl;
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast(`🎉 Promo Banner ${num} image updated live on storefront!`);
  },

  previewPromo1FromUrl() {
    const input = document.getElementById("admin-promo1-url-input");
    const preview = document.getElementById("admin-promo1-preview");
    if (!input || !input.value.trim()) {
      showToast("Please enter an image URL or file path for Promo Banner 1.");
      return;
    }
    const val = input.value.trim();
    if (preview) preview.src = val;
    showToast("Banner 1 preview loaded. Click 'Save Both Promo Banners' to set it live.");
  },

  previewPromo2FromUrl() {
    const input = document.getElementById("admin-promo2-url-input");
    const preview = document.getElementById("admin-promo2-preview");
    if (!input || !input.value.trim()) {
      showToast("Please enter an image URL or file path for Promo Banner 2.");
      return;
    }
    const val = input.value.trim();
    if (preview) preview.src = val;
    showToast("Banner 2 preview loaded. Click 'Save Both Promo Banners' to set it live.");
  },

  applyPromoBanner1Only() {
    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    const p1Img = document.getElementById("admin-promo1-url-input")?.value.trim() || document.getElementById("admin-promo1-preview")?.src || "assets/cases_banner.jpg";
    const p1Title = document.getElementById("admin-promo1-title")?.value.trim() || settings.promoBanner1Title;
    const p1Desc = document.getElementById("admin-promo1-desc")?.value.trim() || settings.promoBanner1Desc;
    const p1BtnText = document.getElementById("admin-promo1-btn-text")?.value.trim() || settings.promoBanner1BtnText;
    const p1Category = document.getElementById("admin-promo1-category")?.value || settings.promoBanner1Category;

    settings.promoBanner1Img = p1Img;
    settings.promoBanner1Title = p1Title;
    settings.promoBanner1Desc = p1Desc;
    settings.promoBanner1BtnText = p1BtnText;
    settings.promoBanner1Category = p1Category;

    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }
    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }
    showToast("✨ Promo Banner 1 (Cases) saved and applied live!");
  },

  applyPromoBanner2Only() {
    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    const p2Img = document.getElementById("admin-promo2-url-input")?.value.trim() || document.getElementById("admin-promo2-preview")?.src || "assets/chargers_banner.jpg";
    const p2Title = document.getElementById("admin-promo2-title")?.value.trim() || settings.promoBanner2Title;
    const p2Desc = document.getElementById("admin-promo2-desc")?.value.trim() || settings.promoBanner2Desc;
    const p2BtnText = document.getElementById("admin-promo2-btn-text")?.value.trim() || settings.promoBanner2BtnText;
    const p2Category = document.getElementById("admin-promo2-category")?.value || settings.promoBanner2Category;

    settings.promoBanner2Img = p2Img;
    settings.promoBanner2Title = p2Title;
    settings.promoBanner2Desc = p2Desc;
    settings.promoBanner2BtnText = p2BtnText;
    settings.promoBanner2Category = p2Category;

    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }
    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }
    showToast("⚡ Promo Banner 2 (Chargers) saved and applied live!");
  },

  resetPromoBanner1() {
    const defaultImg = "assets/cases_banner.jpg";
    const preview = document.getElementById("admin-promo1-preview");
    const urlInput = document.getElementById("admin-promo1-url-input");
    const titleInput = document.getElementById("admin-promo1-title");
    const descInput = document.getElementById("admin-promo1-desc");
    const btnInput = document.getElementById("admin-promo1-btn-text");
    const catInput = document.getElementById("admin-promo1-category");

    if (preview) preview.src = defaultImg;
    if (urlInput) urlInput.value = defaultImg;
    if (titleInput) titleInput.value = "Keep Your Phone Safe & Stylish";
    if (descInput) descInput.value = "Premium aerospace carbon fiber, MagSafe clear cases and camera lens protection for every model.";
    if (btnInput) btnInput.value = "Explore Cases";
    if (catInput) catInput.value = "cases";

    const p1PrevTitle = document.getElementById("admin-promo1-preview-title");
    if (p1PrevTitle) p1PrevTitle.textContent = "Keep Your Phone Safe & Stylish";
    const p1PrevDesc = document.getElementById("admin-promo1-preview-desc");
    if (p1PrevDesc) p1PrevDesc.textContent = "Premium aerospace carbon fiber...";
    const p1PrevBtn = document.getElementById("admin-promo1-preview-btn");
    if (p1PrevBtn) p1PrevBtn.textContent = "Explore Cases →";

    this.applyPromoBanner1Only();
    showToast("Promo Banner 1 reset to default.");
  },

  resetPromoBanner2() {
    const defaultImg = "assets/chargers_banner.jpg";
    const preview = document.getElementById("admin-promo2-preview");
    const urlInput = document.getElementById("admin-promo2-url-input");
    const titleInput = document.getElementById("admin-promo2-title");
    const descInput = document.getElementById("admin-promo2-desc");
    const btnInput = document.getElementById("admin-promo2-btn-text");
    const catInput = document.getElementById("admin-promo2-category");

    if (preview) preview.src = defaultImg;
    if (urlInput) urlInput.value = defaultImg;
    if (titleInput) titleInput.value = "Power Up Your Life";
    if (descInput) descInput.value = "65W GaN fast dual chargers, 240W braided cables & digital battery packs for non-stop performance.";
    if (btnInput) btnInput.value = "Shop Chargers";
    if (catInput) catInput.value = "chargers";

    const p2PrevTitle = document.getElementById("admin-promo2-preview-title");
    if (p2PrevTitle) p2PrevTitle.textContent = "Power Up Your Life";
    const p2PrevDesc = document.getElementById("admin-promo2-preview-desc");
    if (p2PrevDesc) p2PrevDesc.textContent = "65W GaN fast dual chargers...";
    const p2PrevBtn = document.getElementById("admin-promo2-preview-btn");
    if (p2PrevBtn) p2PrevBtn.textContent = "Shop Chargers →";

    this.applyPromoBanner2Only();
    showToast("Promo Banner 2 reset to default.");
  },

  savePromoBanners() {
    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;

    const p1Img = document.getElementById("admin-promo1-url-input")?.value.trim() || document.getElementById("admin-promo1-preview")?.src || settings.promoBanner1Img;
    const p1Title = document.getElementById("admin-promo1-title")?.value.trim() || settings.promoBanner1Title;
    const p1Desc = document.getElementById("admin-promo1-desc")?.value.trim() || settings.promoBanner1Desc;
    const p1BtnText = document.getElementById("admin-promo1-btn-text")?.value.trim() || settings.promoBanner1BtnText;
    const p1Category = document.getElementById("admin-promo1-category")?.value || settings.promoBanner1Category;

    const p2Img = document.getElementById("admin-promo2-url-input")?.value.trim() || document.getElementById("admin-promo2-preview")?.src || settings.promoBanner2Img;
    const p2Title = document.getElementById("admin-promo2-title")?.value.trim() || settings.promoBanner2Title;
    const p2Desc = document.getElementById("admin-promo2-desc")?.value.trim() || settings.promoBanner2Desc;
    const p2BtnText = document.getElementById("admin-promo2-btn-text")?.value.trim() || settings.promoBanner2BtnText;
    const p2Category = document.getElementById("admin-promo2-category")?.value || settings.promoBanner2Category;

    settings.promoBanner1Img = p1Img;
    settings.promoBanner1Title = p1Title;
    settings.promoBanner1Desc = p1Desc;
    settings.promoBanner1BtnText = p1BtnText;
    settings.promoBanner1Category = p1Category;

    settings.promoBanner2Img = p2Img;
    settings.promoBanner2Title = p2Title;
    settings.promoBanner2Desc = p2Desc;
    settings.promoBanner2BtnText = p2BtnText;
    settings.promoBanner2Category = p2Category;

    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("💾 Both Promo Banners, Headlines & Descriptions saved successfully!");
  },

  previewBannerFromUrl() {
    const input = document.getElementById("admin-banner-url-input");
    const preview = document.getElementById("admin-hero-banner-preview");
    if (!input || !input.value.trim()) {
      showToast("Please enter an image URL or file path.");
      return;
    }
    const val = input.value.trim();
    if (preview) preview.src = val;
    showToast("Preview loaded. Click 'Save & Apply Hero Banner' to set it live.");
  },

  applyHeroBanner() {
    const preview = document.getElementById("admin-hero-banner-preview");
    const input = document.getElementById("admin-banner-url-input");
    const bannerUrl = (input && input.value.trim()) || (preview && preview.src) || "assets/hero_showcase.jpg";

    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    settings.heroBannerImg = bannerUrl;
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("🎉 Hero Banner saved and applied to storefront!");
  },

  resetHeroBannerToDefault() {
    const defaultBanner = "assets/hero_showcase.jpg?v=3";
    const preview = document.getElementById("admin-hero-banner-preview");
    const input = document.getElementById("admin-banner-url-input");
    const statusText = document.getElementById("admin-banner-status-text");

    if (preview) preview.src = defaultBanner;
    if (input) input.value = defaultBanner;
    if (statusText) statusText.textContent = "Reset to default high-res showcase banner.";

    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;
    settings.heroBannerImg = defaultBanner;
    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("Banner restored to default showcase.");
  },

  handleSaveStoreSettings() {
    let settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || DEFAULT_STORE_SETTINGS;

    const nameVal = document.getElementById("admin-store-name")?.value.trim() || settings.storeName;
    const phoneVal = document.getElementById("admin-store-phone")?.value.trim() || settings.phone;
    const waVal = document.getElementById("admin-store-whatsapp")?.value.trim() || settings.whatsapp;
    const emailVal = document.getElementById("admin-store-email")?.value.trim() || settings.email || "universehubstore00@gmail.com";
    const hoursVal = document.getElementById("admin-store-hours")?.value.trim() || settings.openingHours;
    const addrVal = document.getElementById("admin-store-address")?.value.trim() || settings.address;
    const mapsVal = document.getElementById("admin-store-maps")?.value.trim() || settings.googleMapsUrl || "https://maps.app.goo.gl/r1BY5dMznxRunVC58";
    const aboutH = document.getElementById("admin-about-heading")?.value.trim() || settings.aboutHeading;
    const aboutS = document.getElementById("admin-about-story")?.value.trim() || settings.aboutStory;
    const aboutM = document.getElementById("admin-about-mission")?.value.trim() || settings.aboutMission;
    const deletePinVal = document.getElementById("admin-order-delete-pin")?.value.trim() || settings.orderDeletePin || "1234";

    // Clean phone number for WhatsApp link
    const cleanDigits = (waVal || phoneVal || "0740219239").replace(/[^0-9]/g, "");
    let waPhone = cleanDigits;
    if (waPhone.startsWith("0")) {
      waPhone = "94" + waPhone.substring(1);
    } else if (!waPhone.startsWith("94")) {
      waPhone = "94" + waPhone;
    }

    settings.storeName = nameVal;
    settings.phone = phoneVal;
    settings.whatsapp = waVal;
    settings.whatsappLink = `https://wa.me/${waPhone}?text=Hello%20Universe%20Hub,%20I%20have%20an%20inquiry%20regarding%20iPhone%20/%20accessories`;
    settings.email = emailVal;
    settings.openingHours = hoursVal;
    settings.address = addrVal;
    settings.googleMapsUrl = mapsVal;
    settings.aboutHeading = aboutH;
    settings.aboutStory = aboutS;
    settings.aboutMission = aboutM;
    settings.orderDeletePin = deletePinVal;

    localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

    // Sync to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.saveStoreSettings === "function") {
      window.SupabaseSync.saveStoreSettings(settings);
    }

    // Also auto-save admin credentials if populated
    const adminPassVal = document.getElementById("admin-cfg-password")?.value?.trim();
    if (adminPassVal) {
      this.saveAdminPassword(true);
    }

    if (window.App && typeof App.applyStoreSettings === "function") {
      App.applyStoreSettings();
    }

    showToast("💾 Store Details & About Us saved successfully!");
  },

  saveAdminPassword(silent = false) {
    const emailInput = document.getElementById("admin-cfg-email");
    const passInput = document.getElementById("admin-cfg-password");
    const email = (emailInput?.value || "shashikaisuranga143@gmail.com").trim();
    const password = (passInput?.value || "").trim();

    if (!password) {
      if (!silent) showToast("Please enter an admin password.");
      return;
    }

    let adminCfg = typeof DEFAULT_ADMIN_CONFIG !== 'undefined' ? DEFAULT_ADMIN_CONFIG : { email: "shashikaisuranga143@gmail.com", password: "Kumudinikumari@0709", name: "Store Administrator" };
    try {
      const saved = localStorage.getItem("UH_ADMIN_CONFIG");
      if (saved) adminCfg = { ...adminCfg, ...JSON.parse(saved) };
    } catch (e) {}

    adminCfg.email = email;
    adminCfg.password = password;
    delete adminCfg.secondaryPassword;
    localStorage.setItem("UH_ADMIN_CONFIG", JSON.stringify(adminCfg));

    // Keep UH_USERS synced for admin role
    let users = JSON.parse(localStorage.getItem("UH_USERS")) || [];
    users = users.filter(u => u.email !== "admin@universehub.store" && u.email !== "admin@universehub.lk");
    const adminUser = users.find(u => u.role === "admin");
    if (adminUser) {
      adminUser.email = email;
      adminUser.password = password;
    } else {
      users.push({
        id: "usr-admin-shashika",
        name: "Store Administrator (Shashika)",
        email: email,
        password: password,
        role: "admin"
      });
    }
    localStorage.setItem("UH_USERS", JSON.stringify(users));

    if (!silent) {
      showToast("🔒 Admin Security Password updated successfully!");
    }
  },

  // 6. ORDER DELETION SECURITY PIN & HIDE/SEE CONTROLLER
  pendingDeleteOrderId: null,

  togglePinVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      if (btnEl) btnEl.textContent = "🙈";
    } else {
      input.type = "password";
      if (btnEl) btnEl.textContent = "👁️";
    }
  },

  promptDeleteOrder(orderId) {
    if (!orderId) return;
    this.pendingDeleteOrderId = orderId;
    const label = document.getElementById("delete-order-id-label");
    if (label) label.textContent = `#${orderId}`;

    const pinInput = document.getElementById("order-delete-verify-pin");
    if (pinInput) {
      pinInput.value = "";
      pinInput.type = "password";
    }
    const errBox = document.getElementById("order-delete-error");
    if (errBox) errBox.style.display = "none";

    if (window.App && typeof App.openModal === "function") {
      App.openModal("admin-order-delete-modal");
    } else {
      const modal = document.getElementById("admin-order-delete-modal");
      if (modal) modal.classList.add("active");
    }
    setTimeout(() => {
      const pinInp = document.getElementById("order-delete-verify-pin");
      if (pinInp) pinInp.focus();
    }, 150);
  },

  closeOrderDeleteModal() {
    this.pendingDeleteOrderId = null;
    if (window.App && typeof App.closeModal === "function") {
      App.closeModal("admin-order-delete-modal");
    } else {
      const modal = document.getElementById("admin-order-delete-modal");
      if (modal) modal.classList.remove("active");
    }
  },

  executeDeleteOrder() {
    if (!this.pendingDeleteOrderId) return;
    const orderId = this.pendingDeleteOrderId;

    const enteredPin = document.getElementById("order-delete-verify-pin")?.value.trim() || "";
    const settings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || (typeof DEFAULT_STORE_SETTINGS !== "undefined" ? DEFAULT_STORE_SETTINGS : {});
    const expectedPin = (settings.orderDeletePin || "1234").trim();

    let adminCfg = {};
    try {
      const savedAdmin = localStorage.getItem("UH_ADMIN_CONFIG");
      if (savedAdmin) adminCfg = JSON.parse(savedAdmin);
    } catch (e) {}
    const adminPass = (adminCfg.password || "Kumudinikumari@0709").trim();

    if (enteredPin !== expectedPin && enteredPin !== adminPass) {
      const errBox = document.getElementById("order-delete-error");
      if (errBox) {
        errBox.style.display = "block";
        errBox.textContent = "⚠️ Incorrect Security PIN! Please enter the correct PIN configured in Store & Hero Banner settings.";
      }
      const pinInp = document.getElementById("order-delete-verify-pin");
      if (pinInp) {
        pinInp.select();
        pinInp.focus();
      }
      return;
    }

    // Valid PIN - Delete from LocalStorage
    let orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    orders = orders.filter(o => String(o.id) !== String(orderId) && String(o.orderNumber) !== String(orderId));
    localStorage.setItem("UH_ORDERS", JSON.stringify(orders));

    if (typeof DEMO_STORE_ORDERS !== "undefined") {
      const idx = DEMO_STORE_ORDERS.findIndex(o => String(o.id) === String(orderId));
      if (idx !== -1) DEMO_STORE_ORDERS.splice(idx, 1);
    }

    // Sync delete to Supabase Cloud Database
    if (window.SupabaseSync && typeof window.SupabaseSync.deleteOrder === "function") {
      window.SupabaseSync.deleteOrder(orderId);
    }

    this.closeOrderDeleteModal();
    showToast(`🗑️ Order #${orderId} deleted successfully!`);
    this.renderOrdersTable();
    this.renderStats();
  }
};

// Explicitly bind to window & module.exports for inline HTML onclicks and cross-script calls
if (typeof window !== 'undefined') {
  window.AdminController = AdminController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminController;
}

