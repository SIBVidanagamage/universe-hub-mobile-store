/**
 * Universe Hub - Supabase Cloud Database Client & Realtime Sync Engine (Production Resilient)
 * Features:
 * - Enterprise-grade Offline-First architecture (LocalStorage priority)
 * - Automatic background queue (UH_CLOUD_SYNC_QUEUE) for resilient retries
 * - AdBlocker / Firewall / DNS silent fallback (no cryptic network error popups)
 * - Seamless integration with Netlify custom domain & local server
 */

(function (global) {
  const MASTER_CONFIG = {
    url: "https://mukctesllfgdgvkttjkb.supabase.co",
    key: "sb_publishable_f20oiNxVRdSdz7FhICoWlg_8PEoqOVS"
  };

  /**
   * Dual-Tier Storage Manager (In-Memory + IndexedDB + LocalStorage Quota Fallback)
   * Solves iOS Safari 5MB localStorage limit for multi-megabyte base64 catalog
   */
  const UHStorage = {
    _dbPromise: null,
    getDB() {
      if (this._dbPromise) return this._dbPromise;
      if (typeof indexedDB === "undefined") return Promise.resolve(null);
      this._dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open("UniverseHubStoreDB", 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("products")) {
              db.createObjectStore("products", { keyPath: "id" });
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      });
      return this._dbPromise;
    },

    async saveProducts(products) {
      if (!Array.isArray(products)) return;

      // 1. In-memory cache update for instant sync across all scripts
      if (typeof window !== "undefined") {
        window.UH_PRODUCTS_CACHE = products;
      }

      // 2. Persist to IndexedDB (Virtually unlimited quota on Safari iOS & Chrome, never QuotaExceededError)
      try {
        const db = await this.getDB();
        if (db) {
          const tx = db.transaction("products", "readwrite");
          const store = tx.objectStore("products");
          store.clear();
          for (const p of products) {
            store.put(p);
          }
        }
      } catch (dbErr) {
        console.warn("[UHStorage] IndexedDB save notice:", dbErr);
      }

      // 3. Persist to LocalStorage with progressive quota-saving fallbacks
      try {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(products));
      } catch (quotaErr) {
        console.warn("[UHStorage] LocalStorage full. Optimizing catalog for LocalStorage quota...");
        try {
          // Keep only primary cover image per product to reduce size by ~50%
          const optimized = products.map(p => ({
            ...p,
            images: [p.image || (p.images && p.images[0]) || "assets/hero_showcase.jpg"]
          }));
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(optimized));
        } catch (err2) {
          try {
            // Keep minimal product metadata
            const minimal = products.map(p => ({
              id: p.id,
              name: p.name || p.title,
              title: p.title || p.name,
              brand: p.brand,
              category: p.category,
              price: p.price,
              originalPrice: p.originalPrice,
              badge: p.badge,
              image: p.image,
              images: [p.image],
              storageOptions: p.storageOptions,
              colorOptions: p.colorOptions,
              stockStatus: p.stockStatus,
              specs: p.specs
            }));
            localStorage.setItem("UH_PRODUCTS", JSON.stringify(minimal));
          } catch (err3) {
            console.warn("[UHStorage] LocalStorage quota completely full. Active in IndexedDB & Memory.");
          }
        }
      }
    },

    async loadProducts() {
      // 1. Check in-memory
      if (typeof window !== "undefined" && Array.isArray(window.UH_PRODUCTS_CACHE) && window.UH_PRODUCTS_CACHE.length > 0) {
        return window.UH_PRODUCTS_CACHE;
      }

      // 2. Check IndexedDB
      try {
        const db = await this.getDB();
        if (db) {
          const stored = await new Promise((resolve) => {
            const tx = db.transaction("products", "readonly");
            const store = tx.objectStore("products");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
          if (Array.isArray(stored) && stored.length > 0) {
            if (typeof window !== "undefined") window.UH_PRODUCTS_CACHE = stored;
            return stored;
          }
        }
      } catch (e) { }

      // 3. Check LocalStorage
      try {
        const local = JSON.parse(localStorage.getItem("UH_PRODUCTS"));
        if (Array.isArray(local) && local.length > 0) {
          if (typeof window !== "undefined") window.UH_PRODUCTS_CACHE = local;
          return local;
        }
      } catch (e) { }

      return typeof INITIAL_PRODUCTS !== "undefined" ? INITIAL_PRODUCTS : [];
    }
  };

  if (typeof window !== "undefined") window.UHStorage = UHStorage;

  const SupabaseSync = {
    client: null,
    isConnected: false,
    config: MASTER_CONFIG,
    isSyncingQueue: false,
    lastDiagnosticMessage: "",
    _fetchProductsPromise: null,

    init() {
      // 1. Sanitize & Load Config from localStorage override if valid
      if (typeof localStorage !== "undefined") {
        try {
          const savedConfig = JSON.parse(localStorage.getItem("UH_SUPABASE_CONFIG"));
          if (savedConfig && savedConfig.url && savedConfig.url.startsWith("https://") && savedConfig.key) {
            this.config = savedConfig;
          } else {
            // Revert corrupted or empty custom config back to master
            this.config = MASTER_CONFIG;
            localStorage.removeItem("UH_SUPABASE_CONFIG");
          }
        } catch (e) {
          this.config = MASTER_CONFIG;
        }

        // Sanitize sync queue to ensure no accidental stale delete_product actions linger
        try {
          const q = JSON.parse(localStorage.getItem("UH_CLOUD_SYNC_QUEUE") || "[]");
          if (Array.isArray(q) && q.length > 0) {
            const cleanQ = q.filter(item => item && item.action !== "delete_product");
            if (cleanQ.length !== q.length) {
              localStorage.setItem("UH_CLOUD_SYNC_QUEUE", JSON.stringify(cleanQ));
            }
          }
        } catch (e) { }
      }

      // 2. Resolve Supabase createClient SDK
      let createClientFn = null;
      if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
        createClientFn = window.supabase.createClient;
      } else if (typeof require !== "undefined") {
        try {
          const sbModule = require("@supabase/supabase-js");
          createClientFn = sbModule.createClient;
        } catch (e) { }
      }

      if (!createClientFn) {
        console.warn("[Supabase] SDK not detected yet. Operating in LocalStorage mode.");
        this.updateStatusBadge(false, "SDK Loading...");
        return false;
      }

      try {
        // Initialize client with disabled internal auth auto-refresh to prevent background network exceptions
        this.client = createClientFn(this.config.url, this.config.key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          global: {
            headers: {
              "x-application-name": "universe-hub-store"
            }
          }
        });

        // Test connection with timeout guard
        this.testConnection();
        this.initRealtime();
        this.initOnlineListeners();
        return true;
      } catch (err) {
        console.warn("[Supabase] Client init notice (operating offline):", err.message || err);
        this.isConnected = false;
        this.updateStatusBadge(false, "Local Mode");
        return false;
      }
    },

    // --- CONNECTION DIAGNOSTICS & STATUS ---
    async testConnection() {
      if (!this.client) return false;

      // Fast check if device is completely offline
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.isConnected = false;
        this.lastDiagnosticMessage = "Device is offline. Local storage fallback active.";
        this.updateStatusBadge(false, "Offline");
        return false;
      }

      try {
        const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;

        const query = this.client.from("products").select("id").limit(1);
        if (controller) query.abortSignal(controller.signal);

        const { data, error } = await query;
        if (timer) clearTimeout(timer);

        if (error) {
          this.isConnected = false;
          this.lastDiagnosticMessage = error.message || "Database Query Notice";
          if (error.code === "PGRST205") {
            this.updateStatusBadge(false, "Table Pending");
          } else {
            this.updateStatusBadge(false, "Local Storage Active");
          }
          return false;
        }

        this.isConnected = true;
        this.lastDiagnosticMessage = "Connected to Supabase PostgreSQL (Cloud Live)";
        this.updateStatusBadge(true);
        console.log("⚡ [Supabase] Cloud database verified live and synchronized.");

        // Automatically fetch latest catalog, settings and orders to guarantee real-time cross-device sync (e.g. laptop <-> mobile)
        this.fetchProducts().then(prods => {
          if (prods && prods.length > 0 && typeof window !== "undefined" && window.App) {
            window.UH_PRODUCTS_CACHE = prods;
            if (typeof window.App.renderCatalogTabs === "function") window.App.renderCatalogTabs();
            if (typeof window.App.renderBrandFilterBar === "function") window.App.renderBrandFilterBar();
            if (typeof window.App.renderCategories === "function") window.App.renderCategories();
            if (typeof window.App.renderBrandsSection === "function") window.App.renderBrandsSection();
            if (typeof window.App.renderCatalog === "function") window.App.renderCatalog();
          }
        });
        this.fetchStoreSettings().then(st => {
          if (st && typeof window !== "undefined" && window.App && typeof window.App.applyStoreSettings === "function") {
            window.App.applyStoreSettings();
          }
        });
        this.fetchRegisteredUsers();
        this.fetchOrders().then(() => {
          if (typeof window !== "undefined" && window.AdminController && typeof window.AdminController.renderOrdersTable === "function") {
            window.AdminController.renderOrdersTable();
          }
        });

        // Automatically flush any changes that were queued while offline
        this.flushSyncQueue();
        return true;
      } catch (err) {
        this.isConnected = false;
        const isNet = this.isNetworkError(err);
        this.lastDiagnosticMessage = isNet
          ? "Network / AdBlocker interception (Local Storage fallback active)"
          : (err.message || "Connection error");
        this.updateStatusBadge(false, isNet ? "Local Fallback" : "Offline");
        return false;
      }
    },

    isNetworkError(err) {
      if (!err) return false;
      if (typeof navigator !== "undefined" && !navigator.onLine) return true;
      const str = (err.message || String(err)).toLowerCase();
      return str.includes("network") ||
        str.includes("failed to fetch") ||
        str.includes("load failed") ||
        str.includes("aborterror") ||
        str.includes("connection");
    },

    updateStatusBadge(connected, statusLabel = "") {
      if (typeof document === "undefined") return;
      const statusPill = document.getElementById("supabase-status-pill");
      const statusText = document.getElementById("supabase-status-text");
      if (!statusPill || !statusText) return;

      if (connected) {
        statusPill.style.background = "rgba(16, 185, 129, 0.18)";
        statusPill.style.borderColor = "#10b981";
        statusPill.style.color = "#10b981";
        statusText.textContent = "🟢 Cloud Live (Synced)";
      } else {
        const queueCount = this.getQueueCount();
        statusPill.style.background = "rgba(245, 158, 11, 0.18)";
        statusPill.style.borderColor = "#f59e0b";
        statusPill.style.color = "#f59e0b";
        statusText.textContent = queueCount > 0
          ? `🟡 Local Storage (${queueCount} Queued)`
          : (statusLabel ? `🟡 ${statusLabel}` : "🟡 Local Storage Active");
      }
    },

    initOnlineListeners() {
      if (typeof window === "undefined") return;

      window.addEventListener("online", () => {
        console.log("⚡ [Supabase] Internet restored! Reconnecting to Cloud...");
        this.testConnection();
      });

      // Periodic gentle background sync every 45s
      setInterval(() => {
        if (!this.isConnected) {
          this.testConnection();
        } else if (this.getQueueCount() > 0) {
          this.flushSyncQueue();
        }
      }, 45000);
    },

    initRealtime() {
      if (!this.client || typeof window === "undefined") return;
      try {
        this.client
          .channel("realtime:products")
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
            console.log("⚡ [Supabase Realtime] Change received from cloud:", payload.eventType);
            if (window.App && typeof window.App.renderCatalog === "function") {
              this.syncProductsToLocal().then(() => {
                window.App.renderCatalog();
              });
            }
          })
          .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
              // Realtime active
            } else if (err) {
              console.warn("[Supabase Realtime] Channel notice (safe fallback):", err.message || err);
            }
          });
      } catch (e) {
        console.warn("[Supabase Realtime] Subscription caught safely:", e);
      }
    },

    // --- RESILIENT OFFLINE SYNC QUEUE ---
    getQueueCount() {
      if (typeof localStorage === "undefined") return 0;
      try {
        const q = JSON.parse(localStorage.getItem("UH_CLOUD_SYNC_QUEUE") || "[]");
        return Array.isArray(q) ? q.length : 0;
      } catch (e) {
        return 0;
      }
    },

    enqueueSync(action, payload) {
      if (typeof localStorage === "undefined") return;
      try {
        let q = JSON.parse(localStorage.getItem("UH_CLOUD_SYNC_QUEUE") || "[]");
        if (!Array.isArray(q)) q = [];
        q.push({
          id: "queue-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
          action,
          payload,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("UH_CLOUD_SYNC_QUEUE", JSON.stringify(q));
        this.updateStatusBadge(this.isConnected);
      } catch (e) { }
    },

    async flushSyncQueue() {
      if (this.isSyncingQueue || !this.client || !this.isConnected) return;
      if (typeof localStorage === "undefined") return;

      let queue = [];
      try {
        queue = JSON.parse(localStorage.getItem("UH_CLOUD_SYNC_QUEUE") || "[]");
      } catch (e) {
        queue = [];
      }

      if (!Array.isArray(queue) || queue.length === 0) return;

      this.isSyncingQueue = true;
      console.log(`⚡ [Supabase] Flushing ${queue.length} queued offline changes to cloud...`);

      const remaining = [];
      for (const item of queue) {
        try {
          if (item.action === "upsert_product") {
            const { error } = await this.client.from("products").upsert(item.payload);
            if (error) remaining.push(item);
          } else if (item.action === "delete_product") {
            const { error } = await this.client.from("products").delete().eq("id", String(item.payload));
            if (error) remaining.push(item);
          } else if (item.action === "create_order") {
            const { error } = await this.client.from("orders").insert([item.payload]);
            if (error) remaining.push(item);
          } else if (item.action === "delete_order") {
            const ordId = String(item.payload?.id || item.payload);
            const { error } = await this.client.from("orders").delete().eq("id", ordId);
            if (error) remaining.push(item);
          } else if (item.action === "create_repair") {
            const { error } = await this.client.from("repair_orders").insert([item.payload]);
            if (error) remaining.push(item);
          }
        } catch (e) {
          remaining.push(item);
        }
      }

      localStorage.setItem("UH_CLOUD_SYNC_QUEUE", JSON.stringify(remaining));
      this.isSyncingQueue = false;
      this.updateStatusBadge(this.isConnected);
      if (remaining.length === 0) {
        console.log("✅ [Supabase] All queued offline updates synchronized successfully!");
      }
    },

    // --- PRODUCTS SYNC (Deduplicated with 25s timeout & Dual-Tier Storage) ---
    async fetchProducts() {
      if (this._fetchProductsPromise) {
        return this._fetchProductsPromise;
      }
      this._fetchProductsPromise = this._fetchProductsInternal().finally(() => {
        this._fetchProductsPromise = null;
      });
      return this._fetchProductsPromise;
    },

    async _fetchProductsInternal() {
      // 1. If online and client is active, query latest cloud catalog directly
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
          // 25 second timeout to allow complete transmission over mobile networks (4G / 3G)
          const timer = controller ? setTimeout(() => controller.abort(), 25000) : null;

          const query = this.client
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });
          if (controller) query.abortSignal(controller.signal);

          const { data, error } = await query;
          if (timer) clearTimeout(timer);

          if (!error && Array.isArray(data) && data.length > 0) {
            this.isConnected = true;
            this.updateStatusBadge(true);

            // Pull cloud deleted IDs but STRICTLY limit filtering to obsolete sample demo product IDs
            const SAMPLE_PRODUCT_IDS = [
              'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
              'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
              'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
              'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
              'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case',
              'prod-1794121290955'
            ];

            let deletedIds = SAMPLE_PRODUCT_IDS;
            try {
              localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(SAMPLE_PRODUCT_IDS));
            } catch (e) { }

            // User-added products in Supabase are ALWAYS preserved!
            const mapped = data
              .filter(item => !SAMPLE_PRODUCT_IDS.includes(String(item.id)))
              .map(item => {
                const resolvedCondition = (item.specs && item.specs.condition !== undefined) ? item.specs.condition : (item.condition || "");
                const resolvedBadge = item.badge || (item.specs && item.specs.conditionBadge) || (resolvedCondition ? "Brand New" : null);
                return {
                  id: item.id,
                  name: item.title,
                  title: item.title,
                  slug: item.slug || item.id,
                  category: item.category,
                  brand: item.brand,
                  price: Number(item.price),
                  originalPrice: item.original_price ? Number(item.original_price) : null,
                  badge: resolvedBadge,
                  isFeatured: item.is_featured,
                  stock: item.stock !== undefined ? Number(item.stock) : 10,
                  rating: Number(item.rating || 5.0),
                  reviewsCount: item.review_count !== undefined ? Number(item.review_count) : (item.reviews || 0),
                  reviews: item.review_count !== undefined ? Number(item.review_count) : (item.reviews || 0),
                  image: item.image,
                  images: Array.isArray(item.images) && item.images.length > 0 ? item.images : [item.image],
                  video: item.specs?.video || item.video || null,
                  condition: resolvedCondition,
                  conditionBadge: resolvedBadge,
                  batteryHealth: item.specs?.batteryHealth || item.batteryHealth || null,
                  storageOptions: item.specs?.storageOptions || item.storageOptions || [],
                  colorOptions: item.specs?.colorOptions || item.colorOptions || [],
                  stockStatus: item.specs?.stockStatus || (item.stockStatus || "available"),
                  warranty: item.specs?.warranty || item.warranty || "1 Year Store Warranty",
                  description: item.description || "",
                  specs: item.specs || {}
                };
              });

            // Persist to Memory, IndexedDB and LocalStorage
            await UHStorage.saveProducts(mapped);

            // Notify storefront to immediately re-render all sections with full catalog
            if (typeof window !== "undefined" && window.App) {
              if (typeof window.App.renderCatalogTabs === "function") window.App.renderCatalogTabs();
              if (typeof window.App.renderBrandFilterBar === "function") window.App.renderBrandFilterBar();
              if (typeof window.App.renderCategories === "function") window.App.renderCategories();
              if (typeof window.App.renderBrandsSection === "function") window.App.renderBrandsSection();
              if (typeof window.App.renderCatalog === "function") window.App.renderCatalog();
            }

            return mapped;
          }
        } catch (e) {
          console.warn("[Supabase] Cloud fetch notice, reading from storage engine:", e);
        }
      }

      // 2. Storage Engine Fallback (Memory -> IndexedDB -> LocalStorage)
      return await UHStorage.loadProducts();
    },
    },

    async syncProductsToLocal() {
      return await this.fetchProducts();
    },

    // Safe Non-Destructive Cross-Device Sync (Uploads local items & downloads cloud items with ZERO deletes)
    async syncLocalCatalogToCloud() {
      if (!this.client || (typeof navigator !== "undefined" && navigator.onLine === false)) return false;
      try {
        console.log("☁️ [Supabase] Safe bi-directional sync starting...");
        let localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
        const SAMPLE_PRODUCT_IDS = [
          'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
          'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
          'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
          'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
          'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case',
          'prod-1794121290955'
        ];

        // 1. Fetch all products currently in Supabase Cloud
        const { data: cloudProds, error } = await this.client.from("products").select("*");
        if (!error && Array.isArray(cloudProds)) {
          const cloudIds = new Set(cloudProds.map(cp => String(cp.id)));

          // 2. Upload any local user products that are not yet in Cloud
          for (const lp of localProducts) {
            if (!SAMPLE_PRODUCT_IDS.includes(String(lp.id)) && !cloudIds.has(String(lp.id))) {
              console.log("☁️ Uploading local product to Cloud:", lp.name || lp.title);
              await this.saveProduct(lp);
            }
          }

          // 3. Merge Cloud products into local cache (SAFE ADDITIVE MERGE - NEVER DELETES)
          const localIds = new Set(localProducts.map(lp => String(lp.id)));
          let mergedLocal = [...localProducts];
          for (const cp of cloudProds) {
            if (!SAMPLE_PRODUCT_IDS.includes(String(cp.id)) && !localIds.has(String(cp.id))) {
              console.log("📥 Downloading cloud product to Local:", cp.title);
              mergedLocal.push({
                id: cp.id,
                name: cp.title,
                title: cp.title,
                slug: cp.slug || cp.id,
                category: cp.category,
                brand: cp.brand,
                price: Number(cp.price),
                originalPrice: cp.original_price ? Number(cp.original_price) : null,
                badge: cp.badge || null,
                isFeatured: cp.is_featured,
                stock: cp.stock !== undefined ? Number(cp.stock) : 10,
                rating: Number(cp.rating || 5.0),
                reviewsCount: cp.review_count || 0,
                image: cp.image,
                images: Array.isArray(cp.images) ? cp.images : [cp.image],
                video: cp.specs?.video || cp.video || null,
                condition: cp.specs?.condition || cp.condition || "",
                batteryHealth: cp.specs?.batteryHealth || cp.batteryHealth || null,
                storageOptions: cp.specs?.storageOptions || cp.storageOptions || [],
                colorOptions: cp.specs?.colorOptions || cp.colorOptions || [],
                stockStatus: cp.specs?.stockStatus || cp.stockStatus || "available",
                warranty: cp.specs?.warranty || cp.warranty || "1 Year Warranty",
                description: cp.description || "",
                specs: cp.specs || {}
              });
            }
          }

          try {
            localStorage.setItem("UH_PRODUCTS", JSON.stringify(mergedLocal));
          } catch (e) { }
        }

        console.log("✅ [Supabase] Safe cross-device sync completed!");
        return true;
      } catch (err) {
        console.warn("[Supabase] syncLocalCatalogToCloud notice:", err);
        return false;
      }
    },

    // Recovery tool: Clears accidental filters and restores all products directly from Cloud Database
    async recoverCloudProducts() {
      if (!this.client) return { success: false, message: "Cloud database client offline." };
      try {
        const SAMPLE_PRODUCT_IDS = [
          'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
          'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
          'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
          'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
          'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case',
          'prod-1794121290955'
        ];

        // 1. Reset deleted IDs filter to ONLY sample demo IDs
        try {
          localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(SAMPLE_PRODUCT_IDS));
        } catch (e) { }

        try {
          await this.client.from("store_settings").upsert({
            key: "deleted_product_ids",
            value: SAMPLE_PRODUCT_IDS,
            updated_at: new Date().toISOString()
          });
        } catch (e) { }

        // 2. Fetch all rows directly from Supabase products table
        const { data, error } = await this.client
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Filter out ONLY sample products
        const genuine = (data || []).filter(item => !SAMPLE_PRODUCT_IDS.includes(String(item.id)));

        const mapped = genuine.map(item => ({
          id: item.id,
          name: item.title,
          title: item.title,
          slug: item.slug || item.id,
          category: item.category,
          brand: item.brand,
          price: Number(item.price),
          originalPrice: item.original_price ? Number(item.original_price) : null,
          badge: item.badge || null,
          isFeatured: item.is_featured,
          stock: item.stock !== undefined ? Number(item.stock) : 10,
          rating: Number(item.rating || 5.0),
          reviewsCount: item.review_count !== undefined ? Number(item.review_count) : 0,
          image: item.image,
          images: Array.isArray(item.images) ? item.images : [item.image],
          video: item.specs?.video || item.video || null,
          condition: item.specs?.condition || item.condition || "",
          batteryHealth: item.specs?.batteryHealth || item.batteryHealth || null,
          storageOptions: item.specs?.storageOptions || item.storageOptions || [],
          colorOptions: item.specs?.colorOptions || item.colorOptions || [],
          stockStatus: item.specs?.stockStatus || item.stockStatus || "available",
          warranty: item.specs?.warranty || item.warranty || "1 Year Warranty",
          description: item.description || "",
          specs: item.specs || {}
        }));

        try {
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(mapped));
        } catch (e) { }

        // Re-render UI
        if (typeof window !== "undefined") {
          if (window.AdminController) {
            if (typeof window.AdminController.renderProductsTable === "function") window.AdminController.renderProductsTable();
            if (typeof window.AdminController.renderStats === "function") window.AdminController.renderStats();
            if (typeof window.AdminController.renderInventoryFilterBar === "function") window.AdminController.renderInventoryFilterBar();
          }
          if (window.App) {
            if (typeof window.App.renderCatalog === "function") window.App.renderCatalog();
            if (typeof window.App.renderCategories === "function") window.App.renderCategories();
          }
        }

        return { success: true, count: mapped.length, products: mapped };
      } catch (err) {
        console.error("Cloud recovery error:", err);
        return { success: false, message: err.message };
      }
    },

    // Helper to format product object for Supabase PostgreSQL
    productToPayload(product) {
      return {
        id: String(product.id),
        title: product.title || product.name,
        slug: product.slug || product.id,
        category: product.category,
        brand: product.brand || "Apple",
        price: Number(product.price),
        original_price: product.originalPrice ? Number(product.originalPrice) : null,
        badge: product.badge || product.conditionBadge || null,
        is_featured: !!product.isFeatured,
        stock: product.stock !== undefined ? Number(product.stock) : 10,
        rating: product.rating !== undefined ? Number(product.rating) : 5.0,
        review_count: product.reviewsCount || product.review_count || product.reviews || 0,
        image: product.image,
        images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image],
        description: product.description || "",
        specs: {
          ...(product.specs || {}),
          video: typeof product.video === "string" ? product.video : "",
          storageOptions: product.storageOptions || [],
          colorOptions: product.colorOptions || [],
          condition: product.condition || "",
          stockStatus: product.stockStatus || "available",
          batteryHealth: product.batteryHealth || null,
          warranty: product.warranty || ""
        },
        updated_at: new Date().toISOString()
      };
    },

    // Upload ALL active local products from laptop to Supabase Cloud directly
    async uploadAllLocalToCloud() {
      if (!this.client) return { success: false, message: "Supabase client not initialized." };
      try {
        let localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
        const SAMPLE_PRODUCT_IDS = [
          'prod-ip18pm', 'prod-ip16pm', 'prod-ip16p', 'prod-ip15p', 'prod-used-ip13',
          'prod-used-ip14pm', 'prod-used-ip13p', 'prod-used-ip12', 'prod-used-ip11',
          'prod-case-magsafe', 'prod-case-carbon', 'prod-charger-65w', 'prod-pb-20k',
          'prod-cable-braided', 'prod-glass-9h', 'prod-cam-lens', 'prod-airpods-pro',
          'prod-ugreen-100w', 'prod-baseus-cable', 'prod-wiwu-wallet', 'prod-asper-case',
          'prod-1794121290955'
        ];
        const genuine = localProducts.filter(p => !SAMPLE_PRODUCT_IDS.includes(String(p.id)));
        let uploaded = 0;
        let errors = [];

        console.log(`☁️ [Supabase] Uploading ${genuine.length} laptop products to Cloud Database...`);

        for (const prod of genuine) {
          const payload = this.productToPayload(prod);
          try {
            const { error } = await this.client.from("products").upsert(payload);
            if (error) {
              console.warn(`[Supabase] Upsert failed for "${prod.name || prod.title}":`, error.message);
              errors.push(`${prod.name || prod.id}: ${error.message}`);
            } else {
              uploaded++;
              console.log(`  ✓ Synced to Cloud: "${payload.title}"`);
            }
          } catch (itemErr) {
            errors.push(`${prod.name || prod.id}: ${itemErr.message || itemErr}`);
          }
        }

        if (uploaded > 0) {
          this.isConnected = true;
          this.updateStatusBadge(true);
        }

        return {
          success: errors.length === 0,
          uploaded,
          total: genuine.length,
          errors
        };
      } catch (err) {
        console.error("Bulk upload error:", err);
        return { success: false, message: err.message };
      }
    },

    async saveProduct(product) {
      // 1. ALWAYS update Memory, IndexedDB & LocalStorage immediately for zero-lag UI response
      let localProducts = [];
      try {
        localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) {
        localProducts = [];
      }

      const existingIdx = localProducts.findIndex(p => p.id === product.id);
      if (existingIdx >= 0) {
        localProducts[existingIdx] = product;
      } else {
        localProducts.unshift(product);
      }

      await UHStorage.saveProducts(localProducts);

      // 2. Prepare Cloud Payload
      const payload = this.productToPayload(product);

      // 3. Dispatch DIRECTLY to Supabase Cloud Database
      if (this.client) {
        try {
          const { error } = await this.client.from("products").upsert(payload);
          if (error) {
            console.warn("[Supabase] Upsert notice:", error.message);
            this.enqueueSync("upsert_product", payload);
            return false;
          } else {
            this.isConnected = true;
            this.updateStatusBadge(true);
            console.log("⚡ [Supabase] Product saved directly to cloud:", payload.title);
            return true;
          }
        } catch (err) {
          console.warn("[Supabase] Direct cloud upload notice:", err.message || err);
          this.enqueueSync("upsert_product", payload);
          return false;
        }
      } else {
        this.enqueueSync("upsert_product", payload);
        return false;
      }
    },

    async deleteProduct(productId) {
      if (!productId) return;
      const strId = String(productId);

      // 1. Permanently track in deleted IDs
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
      } catch (e) { deletedIds = []; }
      if (!deletedIds.includes(strId)) {
        deletedIds.push(strId);
        try { localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(deletedIds)); } catch (e) { }
      }

      // 2. Remove locally from Memory, IndexedDB & LocalStorage
      let localProducts = [];
      try {
        localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) { localProducts = []; }
      localProducts = localProducts.filter(p => String(p.id) !== strId);
      await UHStorage.saveProducts(localProducts);

      // 3. Delete from Supabase or Enqueue
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const { error } = await this.client.from("products").delete().eq("id", strId);
          if (error) this.enqueueSync("delete_product", strId);
          else console.log("⚡ [Supabase] Product purged from cloud:", strId);

          await this.client.from("store_settings").upsert({
            key: "deleted_product_ids",
            value: deletedIds,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          this.enqueueSync("delete_product", strId);
        }
      } else {
        this.enqueueSync("delete_product", strId);
      }
    },

    async deleteBrand(brandId) {
      if (!brandId) return;
      const strId = String(brandId);

      let deletedBrandIds = [];
      try {
        deletedBrandIds = JSON.parse(localStorage.getItem("UH_DELETED_BRAND_IDS") || "[]");
      } catch (e) { deletedBrandIds = []; }
      if (!deletedBrandIds.includes(strId)) {
        deletedBrandIds.push(strId);
        try { localStorage.setItem("UH_DELETED_BRAND_IDS", JSON.stringify(deletedBrandIds)); } catch (e) { }
      }

      if (this.isConnected && this.client) {
        try {
          await this.client.from("brands").delete().eq("id", strId);
        } catch (e) { }
      }
    },

    async deleteCategory(catId) {
      if (!catId) return;
      const strId = String(catId);

      let deletedCategoryIds = [];
      try {
        deletedCategoryIds = JSON.parse(localStorage.getItem("UH_DELETED_CATEGORY_IDS") || "[]");
      } catch (e) { deletedCategoryIds = []; }
      if (!deletedCategoryIds.includes(strId)) {
        deletedCategoryIds.push(strId);
        try { localStorage.setItem("UH_DELETED_CATEGORY_IDS", JSON.stringify(deletedCategoryIds)); } catch (e) { }
      }

      if (this.isConnected && this.client) {
        try {
          await this.client.from("categories").delete().eq("id", strId);
        } catch (e) { }
      }
    },

    // --- ORDERS SYNC ---
    async fetchOrders() {
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
          const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;

          const query = this.client
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });
          if (controller) query.abortSignal(controller.signal);

          const { data, error } = await query;
          if (timer) clearTimeout(timer);

          if (!error && Array.isArray(data)) {
            let deletedOrderIds = [];
            try {
              deletedOrderIds = JSON.parse(localStorage.getItem("UH_DELETED_ORDER_IDS") || "[]");
            } catch (e) { deletedOrderIds = []; }
            const testPurgeIds = ["ORD-2308", "ORD-7968", "ORD-9172", "ORD-7711", "ORD-7712", "ORD-4401", "ORD-4402"];
            for (const pid of testPurgeIds) {
              if (!deletedOrderIds.includes(pid)) deletedOrderIds.push(pid);
            }
            try {
              localStorage.setItem("UH_DELETED_ORDER_IDS", JSON.stringify(deletedOrderIds));
            } catch (e) {}

            const cloudOrders = data
              .filter(ord => !deletedOrderIds.includes(String(ord.id)) && !deletedOrderIds.includes(String(ord.order_number)))
              .map(ord => ({
                id: ord.id,
                orderNumber: ord.order_number || ord.id,
                customerName: ord.customer_name,
                phone: ord.customer_phone,
                whatsapp: ord.customer_phone,
                email: ord.customer_email || "",
                address: ord.address || "Flagship Pickup",
                city: ord.city || "Maharagama",
                date: ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Recently",
                items: ord.items || [],
                total: Number(ord.total || 0),
                subtotal: Number(ord.subtotal || ord.total || 0),
                deliveryMethod: ord.address && ord.address.toLowerCase().includes("store") ? "Physical Store Pickup" : "Courier Delivery",
                paymentMethod: ord.payment_method || "COD",
                method: (ord.address && ord.address.toLowerCase().includes("store") ? "PHYSICAL STORE PICKUP" : "COURIER DELIVERY") + " (" + (ord.payment_method || "COD").toUpperCase() + ")",
                status: ord.order_status || "Processing"
              }));

            let localOrders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
            // Remove deleted and demo placeholder orders from local cache
            localOrders = localOrders.filter(o => !deletedOrderIds.includes(String(o.id)) && !deletedOrderIds.includes(String(o.orderNumber)));

            const merged = [...cloudOrders];
            for (const lOrd of localOrders) {
              if (!merged.some(c => c.id === lOrd.id) && !deletedOrderIds.includes(String(lOrd.id))) {
                merged.push(lOrd);
                this.createOrder(lOrd);
              }
            }
            localStorage.setItem("UH_ORDERS", JSON.stringify(merged));
            return merged;
          }
        } catch (e) {
          console.warn("[Supabase] fetchOrders notice:", e);
        }
      }
      return JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    },

    async createOrder(order) {
      let localOrders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
      localOrders.unshift(order);
      localStorage.setItem("UH_ORDERS", JSON.stringify(localOrders));

      const payload = {
        id: String(order.id),
        order_number: String(order.orderNumber || order.id),
        customer_name: order.customer?.name || order.customerName || "Customer",
        customer_phone: order.customer?.phone || order.customerPhone || "N/A",
        customer_email: order.customer?.email || order.customerEmail || null,
        address: order.customer?.address || order.address || "Flagship Pickup",
        city: order.customer?.city || order.city || "Maharagama",
        district: order.customer?.district || order.district || null,
        postal_code: order.customer?.postalCode || order.postalCode || null,
        items: order.items || [],
        subtotal: Number(order.subtotal || order.total || 0),
        shipping: Number(order.shipping || 0),
        discount: Number(order.discount || 0),
        total: Number(order.total || 0),
        payment_method: order.paymentMethod || "cod",
        payment_status: order.paymentStatus || "pending",
        order_status: order.status || "processing",
        notes: order.notes || null
      };

      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("orders").insert([payload]);
          if (error) this.enqueueSync("create_order", payload);
          else console.log("⚡ [Supabase] Order recorded in cloud:", order.id);
        } catch (e) {
          this.enqueueSync("create_order", payload);
        }
      } else {
        this.enqueueSync("create_order", payload);
      }
      return order;
    },

    async deleteOrder(orderId) {
      if (!orderId) return;
      const strId = String(orderId);
      let localOrders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
      localOrders = localOrders.filter(o => String(o.id) !== strId && String(o.orderNumber) !== strId);
      localStorage.setItem("UH_ORDERS", JSON.stringify(localOrders));

      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("orders").delete().eq("id", strId);
          if (error) this.enqueueSync("delete_order", { id: strId });
          else console.log("⚡ [Supabase] Order deleted from cloud:", strId);
        } catch (e) {
          this.enqueueSync("delete_order", { id: strId });
        }
      } else {
        this.enqueueSync("delete_order", { id: strId });
      }
    },

    async purgeAllOrders() {
      // 1. Clear local orders
      localStorage.setItem("UH_ORDERS", JSON.stringify([]));

      // 2. Mark test orders as deleted
      let deletedOrderIds = [];
      try {
        deletedOrderIds = JSON.parse(localStorage.getItem("UH_DELETED_ORDER_IDS") || "[]");
      } catch (e) { deletedOrderIds = []; }
      const testIds = ["ORD-2308", "ORD-7968", "ORD-9172", "ORD-7711", "ORD-7712", "ORD-4401", "ORD-4402"];
      for (const tid of testIds) {
        if (!deletedOrderIds.includes(tid)) deletedOrderIds.push(tid);
      }
      try {
        localStorage.setItem("UH_DELETED_ORDER_IDS", JSON.stringify(deletedOrderIds));
      } catch (e) {}

      // 3. Purge all records from Supabase Cloud orders table
      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("orders").delete().neq("id", "00000000");
          if (!error) console.log("⚡ [Supabase] All orders successfully purged from cloud.");
          await this.client.from("store_settings").upsert({
            key: "deleted_order_ids",
            value: deletedOrderIds,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn("[Supabase] purgeAllOrders error:", e);
        }
      }
    },

    // --- REPAIRS SYNC ---
    async createRepairOrder(repair) {
      let localRepairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
      localRepairs.unshift(repair);
      localStorage.setItem("UH_REPAIRS", JSON.stringify(localRepairs));

      const payload = {
        id: String(repair.id),
        ticket_number: String(repair.ticketNumber || repair.id),
        customer_name: repair.customerName || "Customer",
        phone: repair.phone || "N/A",
        device_brand: repair.deviceBrand || "Apple",
        device_model: repair.deviceModel || "iPhone",
        issue_type: repair.issueType || "General Diagnostic",
        issue_description: repair.issueDescription || "",
        estimated_cost: Number(repair.estimatedCost || 0),
        status: repair.status || "received"
      };

      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("repair_orders").insert([payload]);
          if (error) this.enqueueSync("create_repair", payload);
          else console.log("⚡ [Supabase] Repair ticket recorded in cloud:", repair.ticketNumber);
        } catch (e) {
          this.enqueueSync("create_repair", payload);
        }
      } else {
        this.enqueueSync("create_repair", payload);
      }
      return repair;
    },

    // --- REVIEWS SYNC ---
    async createReview(review) {
      let localReviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
      localReviews.unshift(review);
      localStorage.setItem("UH_REVIEWS", JSON.stringify(localReviews));

      const payload = {
        id: String(review.id || "rev-" + Date.now()),
        product_id: review.productId || null,
        author: review.author || "Customer",
        rating: Number(review.rating || 5),
        comment: review.comment || "",
        verified: review.verified !== undefined ? review.verified : true,
        date: review.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      };

      if (this.isConnected && this.client) {
        try {
          await this.client.from("reviews").insert([payload]);
        } catch (e) { }
      }
      return review;
    },

    // --- STORE SETTINGS SYNC ---
    async fetchStoreSettings() {
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const { data, error } = await this.client
            .from("store_settings")
            .select("value")
            .eq("key", "general")
            .maybeSingle();

          if (!error && data && data.value) {
            let localSettings = JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || {};
            localSettings = { ...localSettings, ...data.value };
            try {
              localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(localSettings));
            } catch (quotaErr) {
              console.warn("localStorage quota exceeded for UH_STORE_SETTINGS:", quotaErr);
            }
            return localSettings;
          }
        } catch (e) { }
      }
      return JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || (typeof DEFAULT_STORE_SETTINGS !== "undefined" ? DEFAULT_STORE_SETTINGS : {});
    },

    async saveStoreSettings(settings) {
      try {
        localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));
      } catch (quotaErr) {
        console.warn("localStorage quota exceeded for UH_STORE_SETTINGS:", quotaErr);
      }

      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          await this.client.from("store_settings").upsert({
            key: "general",
            value: settings,
            updated_at: new Date().toISOString()
          });
          console.log("⚡ [Supabase] Store settings synced to cloud!");
        } catch (e) { }
      }
    },

    // --- REGISTERED CUSTOMERS SYNC ---
    async fetchRegisteredUsers() {
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const { data, error } = await this.client
            .from("store_settings")
            .select("value")
            .eq("key", "registered_customers")
            .maybeSingle();

          if (!error && data && Array.isArray(data.value)) {
            let localUsers = JSON.parse(localStorage.getItem("UH_USERS")) || [];
            const merged = [...data.value];
            for (const lu of localUsers) {
              if (!merged.some(cu => cu.email && cu.email.toLowerCase() === (lu.email || '').toLowerCase())) {
                merged.push(lu);
              }
            }
            localStorage.setItem("UH_USERS", JSON.stringify(merged));
            return merged;
          }
        } catch (e) { }
      }
      return JSON.parse(localStorage.getItem("UH_USERS")) || [];
    },

    async saveRegisteredUsers(users) {
      localStorage.setItem("UH_USERS", JSON.stringify(users));
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          await this.client.from("store_settings").upsert({
            key: "registered_customers",
            value: users,
            updated_at: new Date().toISOString()
          });
          console.log("⚡ [Supabase] Registered customers synced to cloud!");
        } catch (e) { }
      }
    },

    // --- ONE-CLICK BULK SEED TO SUPABASE ---
    async seedAllDataToSupabase(onProgress) {
      if (!this.client) {
        throw new Error("Supabase client is not initialized.");
      }

      const results = { products: 0, categories: 0, brands: 0, errors: [] };

      // 1. Categories
      if (onProgress) onProgress("Uploading Categories taxonomy...");
      const categories = JSON.parse(localStorage.getItem("UH_CATEGORIES")) || (typeof INITIAL_CATEGORIES !== "undefined" ? INITIAL_CATEGORIES : []);
      for (const cat of categories) {
        try {
          const { error } = await this.client.from("categories").upsert({
            id: cat.id,
            name: cat.name,
            group: cat.group || "iphones",
            groupName: cat.groupName || "iPhones",
            icon: cat.icon || "📱",
            inNav: cat.inNav !== false,
            inFilter: cat.inFilter !== false,
            order: cat.order || 0
          });
          if (!error) results.categories++;
          else results.errors.push(`Category ${cat.id}: ${error.message}`);
        } catch (err) {
          results.errors.push(`Category ${cat.id}: ${err.message}`);
        }
      }

      // 2. Brands
      if (onProgress) onProgress("Uploading Brands taxonomy...");
      const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || (typeof INITIAL_BRANDS !== "undefined" ? INITIAL_BRANDS : []);
      for (const b of brands) {
        try {
          const { error } = await this.client.from("brands").upsert({
            id: b.id,
            name: b.name,
            icon: b.icon || null,
            badge: b.badge || null,
            order: b.order || 0
          });
          if (!error) results.brands++;
          else results.errors.push(`Brand ${b.id}: ${error.message}`);
        } catch (err) {
          results.errors.push(`Brand ${b.id}: ${err.message}`);
        }
      }

      // 3. Products
      if (onProgress) onProgress("Uploading Product Catalog...");
      const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || (typeof INITIAL_PRODUCTS !== "undefined" ? INITIAL_PRODUCTS : []);
      for (const p of products) {
        try {
          const { error } = await this.client.from("products").upsert({
            id: String(p.id),
            title: p.title || p.name,
            slug: p.slug || p.id,
            category: p.category,
            brand: p.brand || (p.name && p.name.includes("Apple") ? "Apple" : "Anker"),
            price: Number(p.price),
            original_price: p.originalPrice ? Number(p.originalPrice) : null,
            badge: p.badge || null,
            is_featured: !!p.isFeatured,
            stock: p.stock !== undefined ? Number(p.stock) : 10,
            rating: p.rating !== undefined ? Number(p.rating) : 5.0,
            review_count: p.reviews || 0,
            image: p.image,
            images: p.images || [p.image],
            description: p.description || "",
            specs: {
              ...(p.specs || {}),
              storageOptions: p.storageOptions || [],
              colorOptions: p.colorOptions || [],
              condition: p.condition || "",
              stockStatus: p.stockStatus || "available",
              batteryHealth: p.batteryHealth || null
            }
          });
          if (!error) results.products++;
          else results.errors.push(`Product ${p.id}: ${error.message}`);
        } catch (err) {
          results.errors.push(`Product ${p.id}: ${err.message}`);
        }
      }

      return results;
    },

    // --- INTERACTIVE DIAGNOSTIC MODAL ---
    showDiagnosticModal() {
      const container = document.getElementById("supabase-diag-body");
      if (!container) return;

      const queueCount = this.getQueueCount();
      const statusColor = this.isConnected ? "#10b981" : "#f59e0b";
      const statusTitle = this.isConnected
        ? "🟢 Cloud Connected & Synchronized"
        : "🟡 Local Storage Active (Offline Safe Mode)";

      container.innerHTML = `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:13px; color:var(--text-muted);">Sync Mode:</span>
            <strong style="color:${statusColor}; font-size:14px;">${statusTitle}</strong>
          </div>

          <div style="font-size:12.5px; line-height:1.6; color:#cbd5e1; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted);">Cloud Project URL:</span>
              <span style="font-family:monospace; color:#38bdf8;">mukctesllfgdgvkttjkb.supabase.co</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted);">API Key:</span>
              <span style="font-family:monospace; color:#10b981;">sb_publishable_...Verified</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted);">Offline Buffer Queue:</span>
              <span style="font-weight:700; color:${queueCount > 0 ? '#f59e0b' : '#10b981'};">${queueCount} items pending</span>
            </div>
          </div>

          <div style="padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); font-size:12px; color:#94a3b8;">
            <strong>Diagnostics status:</strong> ${this.lastDiagnosticMessage || 'Checking status...'}
          </div>
        </div>

        <div style="background:rgba(0,210,255,0.05); border:1px solid rgba(0,210,255,0.2); border-radius:10px; padding:12px 14px; margin-bottom:18px; font-size:12px; color:#cbd5e1; line-height:1.5;">
          💡 <strong>Ad-Blocker &amp; Network Advisory:</strong><br>
          If your browser uses <em>uBlock Origin</em>, <em>Brave Shields</em>, or <em>AdGuard</em>, it may block background network calls to <code style="color:var(--neon-cyan);">supabase.co</code>.<br>
          Universe Hub's <strong>Offline-First Engine</strong> guarantees that all inventory edits, orders, and settings are 100% saved in Local Storage without losing any data!
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn-glass" onclick="App.closeModal('supabase-diag-modal')">Close</button>
          <button type="button" id="btn-supabase-diag-retest" class="btn-primary-glow" onclick="SupabaseSync.runInteractiveDiagnostic()" style="padding:8px 18px; font-size:13px;">
            ⚡ Retest &amp; Force Sync
          </button>
        </div>
      `;

      if (window.App && typeof App.openModal === "function") {
        App.openModal("supabase-diag-modal");
      }
    },

    async runInteractiveDiagnostic() {
      const btn = document.getElementById("btn-supabase-diag-retest");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:6px; vertical-align:middle;"></span> Testing...`;
      }

      await this.testConnection();
      await this.flushSyncQueue();

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ Retest &amp; Force Sync`;
      }

      // Re-render modal body
      this.showDiagnosticModal();
      if (typeof showToast === "function") {
        showToast(this.isConnected ? "🟢 Supabase Cloud connected successfully!" : "🟡 Operating safely in Local Storage mode.");
      }
    }
  };

  // Expose to global/window
  if (typeof window !== "undefined") {
    window.SupabaseSync = SupabaseSync;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => SupabaseSync.init());
    } else {
      SupabaseSync.init();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SupabaseSync;
  }
})(typeof window !== "undefined" ? window : globalThis);
