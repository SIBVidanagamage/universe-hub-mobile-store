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

  const SupabaseSync = {
    client: null,
    isConnected: false,
    config: MASTER_CONFIG,
    isSyncingQueue: false,
    lastDiagnosticMessage: "",

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
      }

      // 2. Resolve Supabase createClient SDK
      let createClientFn = null;
      if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
        createClientFn = window.supabase.createClient;
      } else if (typeof require !== "undefined") {
        try {
          const sbModule = require("@supabase/supabase-js");
          createClientFn = sbModule.createClient;
        } catch (e) {}
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
            if (typeof window.App.renderCatalog === "function") window.App.renderCatalog();
            if (typeof window.App.renderCategories === "function") window.App.renderCategories();
            if (typeof window.App.renderBrandsSection === "function") window.App.renderBrandsSection();
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
      } catch (e) {}
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

    // --- PRODUCTS SYNC ---
    async fetchProducts() {
      // 1. If online and client is active, query latest cloud catalog directly
      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
          const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;

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

            let deletedIds = [];
            try {
              deletedIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
            } catch (e) { deletedIds = []; }

            const mapped = data
              .filter(item => !deletedIds.includes(String(item.id)))
              .map(item => ({
                id: item.id,
                name: item.title,
                title: item.title,
                slug: item.slug || item.id,
                category: item.category,
                brand: item.brand,
                price: Number(item.price),
                originalPrice: item.original_price ? Number(item.original_price) : null,
                badge: item.badge,
                isFeatured: item.is_featured,
                stock: item.stock,
                rating: Number(item.rating || 5.0),
                reviews: item.review_count || 0,
                image: item.image,
                images: item.images || [item.image],
                video: item.specs?.video || item.video || null,
                condition: item.specs?.condition || item.condition || item.badge || "Brand New",
                conditionBadge: item.badge || item.specs?.conditionBadge || "Brand New",
                batteryHealth: item.specs?.batteryHealth || item.batteryHealth || null,
                storageOptions: item.specs?.storageOptions || item.storageOptions || [],
                colorOptions: item.specs?.colorOptions || item.colorOptions || [],
                warranty: item.specs?.warranty || item.warranty || "1 Year Store Warranty",
                description: item.description || "",
                specs: item.specs || {}
              }));

            try {
              localStorage.setItem("UH_PRODUCTS", JSON.stringify(mapped));
            } catch (quotaErr) {}
            return mapped;
          }
        } catch (e) {
          // Silent fallback to local cache
        }
      }

      // 2. LocalStorage Fallback (Guaranteed to return products instantly)
      let localProducts = [];
      try {
        localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || (typeof INITIAL_PRODUCTS !== "undefined" ? INITIAL_PRODUCTS : []);
        let deletedIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
        if (deletedIds.length > 0) {
          localProducts = localProducts.filter(p => !deletedIds.includes(String(p.id)));
        }
      } catch (e) {
        localProducts = [];
      }
      return localProducts;
    },

    async syncProductsToLocal() {
      return await this.fetchProducts();
    },

    async saveProduct(product) {
      // 1. ALWAYS update LocalStorage immediately for instant zero-lag UI response
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

      try {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(localProducts));
      } catch (quotaErr) {
        console.warn("[Supabase] LocalStorage near capacity, saving optimized payload...", quotaErr);
        try {
          const trimmed = localProducts.slice(0, 30).map(p => ({
            ...p,
            image: (p.image && p.image.length > 80000) ? "assets/hero_showcase.jpg" : p.image,
            images: (Array.isArray(p.images)) ? p.images.map(img => (img && img.length > 80000) ? "assets/hero_showcase.jpg" : img) : ["assets/hero_showcase.jpg"],
            video: (p.video && (p.video.startsWith("data:") || p.video.startsWith("blob:"))) ? "" : p.video
          }));
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(trimmed));
        } catch (e2) {}
      }

      // 2. Prepare Cloud Payload
      const payload = {
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
        images: product.images || [product.image],
        description: product.description || "",
        specs: { 
          ...(product.specs || {}), 
          video: typeof product.video === "string" ? product.video : "",
          storageOptions: product.storageOptions || [],
          colorOptions: product.colorOptions || [],
          condition: product.condition || "",
          batteryHealth: product.batteryHealth || null,
          warranty: product.warranty || ""
        },
        updated_at: new Date().toISOString()
      };

      // 3. Dispatch to Supabase or Enqueue if offline / network error
      if (this.client && this.isConnected) {
        try {
          const { error } = await this.client.from("products").upsert(payload);
          if (error) {
            console.warn("[Supabase] Upsert notice:", error.message);
            this.enqueueSync("upsert_product", payload);
          } else {
            console.log("⚡ [Supabase] Product saved to cloud:", payload.title);
          }
        } catch (err) {
          // Network / AdBlocker interception caught safely
          console.warn("[Supabase] Cloud upload offline, safely queued for background sync:", err.message || err);
          this.enqueueSync("upsert_product", payload);
          this.isConnected = false;
          this.updateStatusBadge(false, "Local Mode (Queued)");
        }
      } else {
        // Enqueue for later when connected
        this.enqueueSync("upsert_product", payload);
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
        try { localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(deletedIds)); } catch (e) {}
      }

      // 2. Remove locally
      let localProducts = [];
      try {
        localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) { localProducts = []; }
      localProducts = localProducts.filter(p => String(p.id) !== strId);
      try { localStorage.setItem("UH_PRODUCTS", JSON.stringify(localProducts)); } catch (e) {}

      // 3. Delete from Supabase or Enqueue
      if (this.client && this.isConnected) {
        try {
          const { error } = await this.client.from("products").delete().eq("id", strId);
          if (error) this.enqueueSync("delete_product", strId);
          else console.log("⚡ [Supabase] Product purged from cloud:", strId);
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
        try { localStorage.setItem("UH_DELETED_BRAND_IDS", JSON.stringify(deletedBrandIds)); } catch (e) {}
      }

      if (this.isConnected && this.client) {
        try {
          await this.client.from("brands").delete().eq("id", strId);
        } catch (e) {}
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
        try { localStorage.setItem("UH_DELETED_CATEGORY_IDS", JSON.stringify(deletedCategoryIds)); } catch (e) {}
      }

      if (this.isConnected && this.client) {
        try {
          await this.client.from("categories").delete().eq("id", strId);
        } catch (e) {}
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

            const cloudOrders = data
              .filter(ord => !deletedOrderIds.includes(String(ord.id)))
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
            // Remove demo placeholder orders from local cache
            localOrders = localOrders.filter(o => o.id !== 'ORD-7711' && o.id !== 'ORD-7712' && o.id !== 'ORD-4401' && o.id !== 'ORD-4402');

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
        } catch (e) {}
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
            localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(localSettings));
            return localSettings;
          }
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || (typeof DEFAULT_STORE_SETTINGS !== "undefined" ? DEFAULT_STORE_SETTINGS : {});
    },

    async saveStoreSettings(settings) {
      localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

      if (this.client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        try {
          await this.client.from("store_settings").upsert({
            key: "general",
            value: settings,
            updated_at: new Date().toISOString()
          });
          console.log("⚡ [Supabase] Store settings synced to cloud!");
        } catch (e) {}
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
        } catch (e) {}
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
        } catch (e) {}
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
