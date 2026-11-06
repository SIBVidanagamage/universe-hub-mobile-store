/**
 * Universe Hub - Supabase Cloud Database Client & Realtime Sync Engine
 * Connects directly to Supabase PostgreSQL without requiring a separate backend server.
 * Provides instant fallback to LocalStorage if offline or unconfigured.
 */

(function (global) {
  const CONFIG = {
    url: "https://mukctesllfgdgvkttjkb.supabase.co",
    key: "sb_publishable_f20oiNxVRdSdz7FhICoWlg_8PEoqOVS"
  };

  const SupabaseSync = {
    client: null,
    isConnected: false,
    config: CONFIG,

    init() {
      // Check for saved config override in localStorage
      if (typeof localStorage !== "undefined") {
        try {
          const savedConfig = JSON.parse(localStorage.getItem("UH_SUPABASE_CONFIG"));
          if (savedConfig && savedConfig.url && savedConfig.key) {
            this.config = savedConfig;
          }
        } catch (e) {
          console.warn("[Supabase] Failed to parse custom config", e);
        }
      }

      // Resolve Supabase createClient SDK
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
        console.warn("[Supabase] Supabase JS SDK not loaded yet. Waiting...");
        return false;
      }

      try {
        this.client = createClientFn(this.config.url, this.config.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        this.testConnection();
        this.initRealtime();
        return true;
      } catch (err) {
        console.error("[Supabase] Initialization failed:", err);
        return false;
      }
    },

    async testConnection() {
      if (!this.client) return false;
      try {
        const { data, error } = await this.client.from("products").select("id").limit(1);
        if (error) {
          // Check if table missing
          if (error.code === "PGRST205") {
            console.warn("[Supabase] Connected to project, but 'products' table is not yet created in SQL Editor.");
          } else {
            console.warn("[Supabase] Connection test returned error:", error.message);
          }
          this.isConnected = false;
          this.updateStatusBadge(false, error.message);
          return false;
        }
        this.isConnected = true;
        this.updateStatusBadge(true);
        console.log("⚡ [Supabase] Connected to Universe Hub Cloud Database!");
        return true;
      } catch (e) {
        this.isConnected = false;
        this.updateStatusBadge(false, e.message);
        return false;
      }
    },

    updateStatusBadge(connected, errorMsg = "") {
      if (typeof document === "undefined") return;
      const statusPill = document.getElementById("supabase-status-pill");
      const statusText = document.getElementById("supabase-status-text");
      if (statusPill && statusText) {
        if (connected) {
          statusPill.style.background = "rgba(16, 185, 129, 0.2)";
          statusPill.style.borderColor = "var(--neon-green)";
          statusPill.style.color = "var(--neon-green)";
          statusText.textContent = "🟢 Cloud Live (Synced)";
        } else {
          statusPill.style.background = "rgba(239, 68, 68, 0.2)";
          statusPill.style.borderColor = "#ef4444";
          statusPill.style.color = "#ef4444";
          statusText.textContent = errorMsg ? "🟡 Table Pending (Run SQL)" : "⚪ Local Fallback Active";
        }
      }
    },

    initRealtime() {
      if (!this.client || typeof window === "undefined") return;
      try {
        this.client
          .channel("realtime:products")
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
            console.log("⚡ [Supabase Realtime] Product updated remotely:", payload);
            if (window.App && typeof window.App.renderCatalog === "function") {
              this.syncProductsToLocal().then(() => {
                window.App.renderCatalog();
              });
            }
          })
          .subscribe();
      } catch (e) {
        console.warn("[Supabase Realtime] Could not subscribe:", e);
      }
    },

    // --- PRODUCTS SYNC ---
    async fetchProducts() {
      if (this.isConnected && this.client) {
        try {
          const { data, error } = await this.client
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data)) {
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
                description: item.description || "",
                specs: item.specs || {}
              }));

            try {
              localStorage.setItem("UH_PRODUCTS", JSON.stringify(mapped));
            } catch (quotaErr) {
              console.warn("Quota warning caching fetched products:", quotaErr);
            }
            return mapped;
          }
        } catch (e) {
          console.warn("[Supabase] Fetch products failed, using local cache", e);
        }
      }

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
      // 1. Always update local storage first for snappy UI (with quota protection)
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
        console.warn("[Supabase] LocalStorage full, saving trimmed cache...", quotaErr);
        try {
          const trimmed = localProducts.slice(0, 25).map(p => ({
            ...p,
            image: (p.image && p.image.length > 80000) ? "assets/hero_showcase.jpg" : p.image,
            images: (Array.isArray(p.images)) ? p.images.map(img => (img && img.length > 80000) ? "assets/hero_showcase.jpg" : img) : ["assets/hero_showcase.jpg"],
            video: (p.video && (p.video.startsWith("data:") || p.video.startsWith("blob:"))) ? "" : p.video
          }));
          localStorage.setItem("UH_PRODUCTS", JSON.stringify(trimmed));
        } catch (e2) {
          // ignore local fallback failure, cloud will save
        }
      }

      // 2. Sync to Supabase if connected
      if (this.isConnected && this.client) {
        try {
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
            specs: { ...(product.specs || {}), video: typeof product.video === "string" ? product.video : "" },
            updated_at: new Date().toISOString()
          };

          const { error } = await this.client.from("products").upsert(payload);
          if (error) {
            console.error("[Supabase] Upsert error:", error);
            if (typeof showToast === "function") showToast("Saved locally (Cloud sync notice: " + error.message + ")");
          } else {
            console.log("⚡ [Supabase] Product saved to cloud:", payload.title);
          }
        } catch (e) {
          console.error("[Supabase] Save product network error:", e);
        }
      }
    },

    async deleteProduct(productId) {
      if (!productId) return;
      const strId = String(productId);

      // 1. Permanently track in deleted IDs so it never re-appears
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem("UH_DELETED_PRODUCT_IDS") || "[]");
      } catch (e) { deletedIds = []; }
      if (!deletedIds.includes(strId)) {
        deletedIds.push(strId);
        try {
          localStorage.setItem("UH_DELETED_PRODUCT_IDS", JSON.stringify(deletedIds));
        } catch (e) {}
      }

      // 2. Remove from local storage
      let localProducts = [];
      try {
        localProducts = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || [];
      } catch (e) { localProducts = []; }
      localProducts = localProducts.filter(p => String(p.id) !== strId);
      try {
        localStorage.setItem("UH_PRODUCTS", JSON.stringify(localProducts));
      } catch (e) {}

      // 3. Remove from Supabase Cloud Database
      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("products").delete().eq("id", strId);
          if (error) console.error("[Supabase] Delete product error:", error);
          else console.log("⚡ [Supabase] Product deleted from cloud:", strId);
        } catch (e) {
          console.error("[Supabase] Delete product network error:", e);
        }
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
          console.log("⚡ [Supabase] Brand deleted from cloud:", strId);
        } catch (e) {
          console.warn("[Supabase] Delete brand error:", e);
        }
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
          console.log("⚡ [Supabase] Category deleted from cloud:", strId);
        } catch (e) {
          console.warn("[Supabase] Delete category error:", e);
        }
      }
    },

    // --- ORDERS SYNC ---
    async createOrder(order) {
      // 1. Save to local storage
      let localOrders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
      localOrders.unshift(order);
      localStorage.setItem("UH_ORDERS", JSON.stringify(localOrders));

      // 2. Sync to Supabase orders table
      if (this.isConnected && this.client) {
        try {
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
            subtotal: Number(order.subtotal || 0),
            shipping: Number(order.shipping || 0),
            discount: Number(order.discount || 0),
            total: Number(order.total || 0),
            payment_method: order.paymentMethod || "cod",
            payment_status: order.paymentStatus || "pending",
            order_status: order.status || "processing",
            notes: order.notes || null
          };

          const { error } = await this.client.from("orders").insert([payload]);
          if (error) console.error("[Supabase] Insert order error:", error);
          else console.log("⚡ [Supabase] Order recorded in cloud database:", order.orderNumber);
        } catch (e) {
          console.error("[Supabase] Order sync network error:", e);
        }
      }
      return order;
    },

    // --- REPAIRS SYNC ---
    async createRepairOrder(repair) {
      let localRepairs = JSON.parse(localStorage.getItem("UH_REPAIRS")) || [];
      localRepairs.unshift(repair);
      localStorage.setItem("UH_REPAIRS", JSON.stringify(localRepairs));

      if (this.isConnected && this.client) {
        try {
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

          const { error } = await this.client.from("repair_orders").insert([payload]);
          if (error) console.error("[Supabase] Insert repair error:", error);
          else console.log("⚡ [Supabase] Repair ticket recorded in cloud:", repair.ticketNumber);
        } catch (e) {
          console.error("[Supabase] Repair sync error:", e);
        }
      }
      return repair;
    },

    // --- REVIEWS SYNC ---
    async createReview(review) {
      let localReviews = JSON.parse(localStorage.getItem("UH_REVIEWS")) || [];
      localReviews.unshift(review);
      localStorage.setItem("UH_REVIEWS", JSON.stringify(localReviews));

      if (this.isConnected && this.client) {
        try {
          const payload = {
            id: String(review.id || "rev-" + Date.now()),
            product_id: review.productId || null,
            author: review.author || "Customer",
            rating: Number(review.rating || 5),
            comment: review.comment || "",
            verified: review.verified !== undefined ? review.verified : true,
            date: review.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          };

          const { error } = await this.client.from("reviews").insert([payload]);
          if (error) console.error("[Supabase] Insert review error:", error);
          else console.log("⚡ [Supabase] Review added to cloud:", review.author);
        } catch (e) {
          console.error("[Supabase] Review sync error:", e);
        }
      }
      return review;
    },

    // --- STORE SETTINGS SYNC ---
    async fetchStoreSettings() {
      if (this.isConnected && this.client) {
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
        } catch (e) {
          console.warn("[Supabase] Failed to fetch cloud settings:", e);
        }
      }
      return JSON.parse(localStorage.getItem("UH_STORE_SETTINGS")) || (typeof DEFAULT_STORE_SETTINGS !== "undefined" ? DEFAULT_STORE_SETTINGS : {});
    },

    async saveStoreSettings(settings) {
      localStorage.setItem("UH_STORE_SETTINGS", JSON.stringify(settings));

      if (this.isConnected && this.client) {
        try {
          const { error } = await this.client.from("store_settings").upsert({
            key: "general",
            value: settings,
            updated_at: new Date().toISOString()
          });
          if (error) console.error("[Supabase] Upsert store_settings error:", error);
          else console.log("⚡ [Supabase] Store settings synced to cloud!");
        } catch (e) {
          console.error("[Supabase] Settings sync network error:", e);
        }
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
      }

      // 2. Brands
      if (onProgress) onProgress("Uploading Brands taxonomy...");
      const brands = JSON.parse(localStorage.getItem("UH_BRANDS")) || (typeof INITIAL_BRANDS !== "undefined" ? INITIAL_BRANDS : []);
      for (const b of brands) {
        const { error } = await this.client.from("brands").upsert({
          id: b.id,
          name: b.name,
          icon: b.icon || null,
          badge: b.badge || null,
          order: b.order || 0
        });
        if (!error) results.brands++;
        else results.errors.push(`Brand ${b.id}: ${error.message}`);
      }

      // 3. Products
      if (onProgress) onProgress("Uploading Product Catalog...");
      const products = JSON.parse(localStorage.getItem("UH_PRODUCTS")) || (typeof INITIAL_PRODUCTS !== "undefined" ? INITIAL_PRODUCTS : []);
      for (const p of products) {
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
          specs: p.specs || {}
        });
        if (!error) results.products++;
        else results.errors.push(`Product ${p.id}: ${error.message}`);
      }

      return results;
    }
  };

  // Expose to window and Node
  if (typeof window !== "undefined") {
    window.SupabaseSync = SupabaseSync;
    // Auto-init on DOMContentLoaded or immediate
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
