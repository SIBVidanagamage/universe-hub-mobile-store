/**
 * Universe Hub - Real-time Order & Notification Engine
 * Automatically dispatches across multi-redundant channels:
 * 1. ShipMyForm - Instant zero-delay form-to-email delivery to Official Store Email
 * 2. FormSubmit (with 4s timeout fallback)
 * 3. Netlify Native Edge Forms
 * 4. Local Dev Server /api/notify-order audit logging
 * 5. Instant WhatsApp auto-redirect with pre-filled order breakdown
 */

(function (global) {
  const DEFAULT_CONFIG = {
    adminEmail: "universehubstore00@gmail.com",
    backupEmail: "shashikaisuranga143@gmail.com",
    storeWhatsApp: "94740219239",
    storeName: "Universe Hub Mobile Store (Maharagama)"
  };

  /**
   * Dynamically fetch active store settings from localStorage
   */
  function getActiveStoreSettings() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem("UH_STORE_SETTINGS");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      }
    } catch (e) {}
    if (typeof DEFAULT_STORE_SETTINGS !== "undefined") {
      return DEFAULT_STORE_SETTINGS;
    }
    return {};
  }

  function getStoreEmail() {
    const settings = getActiveStoreSettings();
    return (settings.email && settings.email.trim()) || DEFAULT_CONFIG.adminEmail;
  }

  function getStoreWhatsApp() {
    const settings = getActiveStoreSettings();
    const rawWa = (settings.whatsapp || settings.phone || "0740219239").replace(/[^0-9]/g, "");
    if (rawWa.startsWith("0")) return "94" + rawWa.substring(1);
    if (!rawWa.startsWith("94")) return "94" + rawWa;
    return rawWa || DEFAULT_CONFIG.storeWhatsApp;
  }

  function getStoreName() {
    const settings = getActiveStoreSettings();
    return settings.storeName || DEFAULT_CONFIG.storeName;
  }

  const NotificationService = {
    config: DEFAULT_CONFIG,
    getStoreEmail,
    getStoreWhatsApp,
    getStoreName,

    /**
     * Send auto email notification to store owner across all redundant pipelines
     */
    async sendOrderEmail(order) {
      if (!order) return;

      const storeEmail = getStoreEmail();
      const backupEmail = DEFAULT_CONFIG.backupEmail;
      const storeName = getStoreName();

      const orderId = order.id || order.orderNumber || "ORD-" + Date.now();
      const customerName = order.customerName || order.customer?.name || "Valued Customer";
      const phone = order.phone || order.customer?.phone || "N/A";
      const email = order.email || order.customer?.email || "Not specified";
      const address = order.address || order.customer?.address || "In-store Pickup";
      const city = order.city || order.customer?.city || "Maharagama";
      const deliveryMethod = order.deliveryMethod || order.method || "Standard Delivery";
      const paymentMethod = (order.paymentMethod || "COD").toUpperCase();
      const totalFormatted = `Rs. ${(order.total || 0).toLocaleString()}`;

      const itemsSummary = (order.items || []).map((item, idx) => {
        const title = item.name || item.title || "Product";
        const qty = item.qty || 1;
        const lineTotal = (item.price || 0) * qty;
        const variant = [item.storage, item.color].filter(Boolean).join(" • ");
        return `${idx + 1}. ${title}${variant ? ` [${variant}]` : ''} x${qty} - Rs. ${lineTotal.toLocaleString()}`;
      }).join("\n");

      const payload = {
        _subject: `🚨 NEW ORDER #${orderId} - ${customerName} (${totalFormatted})`,
        _template: "table",
        _captcha: "false",
        "Store": storeName,
        "Order ID": orderId,
        "Date / Time": new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }),
        "Customer Name": customerName,
        "Contact Number": phone,
        "Customer Email": email,
        "Delivery Method": deliveryMethod,
        "Shipping Address": `${address}, ${city}`,
        "Payment Mode": paymentMethod,
        "Ordered Items": itemsSummary,
        "Total Amount": totalFormatted
      };

      if (storeEmail.toLowerCase() !== backupEmail.toLowerCase()) {
        payload._cc = backupEmail;
      }

      // 1. Pipeline A: ShipMyForm Instant Delivery (Primary)
      try {
        const shipParams = new URLSearchParams();
        shipParams.append("_subject", `🚨 NEW ORDER #${orderId} - ${customerName} (${totalFormatted})`);
        shipParams.append("Store", storeName);
        shipParams.append("Order_ID", orderId);
        shipParams.append("Date_Time", new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
        shipParams.append("Customer_Name", customerName);
        shipParams.append("Contact_Phone", phone);
        shipParams.append("Customer_Email", email);
        shipParams.append("Delivery_Method", deliveryMethod);
        shipParams.append("Shipping_Address", `${address}, ${city}`);
        shipParams.append("Payment_Mode", paymentMethod);
        shipParams.append("Ordered_Items", itemsSummary);
        shipParams.append("Total_Amount", totalFormatted);
        if (backupEmail && storeEmail.toLowerCase() !== backupEmail.toLowerCase()) {
          shipParams.append("CC_Backup_Email", backupEmail);
        }

        const shipRes = await fetch(`https://shipmyform.com/to/${encodeURIComponent(storeEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: shipParams.toString()
        });
        const shipData = await shipRes.json().catch(() => ({}));
        console.log("⚡ [NotificationService] ShipMyForm result:", shipData);
      } catch (err) {
        console.warn("[NotificationService] ShipMyForm dispatch error:", err);
      }

      // 2. Pipeline B: Netlify Native Forms Edge
      try {
        const netlifyParams = new URLSearchParams({
          "form-name": "order-notifications",
          "order_id": orderId,
          "date": new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }),
          "customer_name": customerName,
          "contact_phone": phone,
          "customer_email": email,
          "delivery_method": deliveryMethod,
          "shipping_address": `${address}, ${city}`,
          "payment_mode": paymentMethod,
          "ordered_items": itemsSummary,
          "total_amount": totalFormatted
        });

        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: netlifyParams.toString()
        });
        console.log("⚡ [NotificationService] Order dispatched via Netlify Forms Edge");
      } catch (e) {
        console.warn("[NotificationService] Netlify form dispatch error:", e);
      }

      // 3. Pipeline C: FormSubmit with 4-second timeout (Fallback)
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
        
        const fetchOpts = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        };
        if (controller) fetchOpts.signal = controller.signal;

        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(storeEmail)}`, fetchOpts);
        if (timeoutId) clearTimeout(timeoutId);

        if (response && response.ok) {
          console.log(`⚡ [NotificationService] FormSubmit sent to ${storeEmail}`);
        }
      } catch (err) {
        console.warn("[NotificationService] FormSubmit unavailable or timed out:", err.message);
      }

      // 4. Pipeline D: Local Dev Server Notification Bridge
      try {
        await fetch("/api/notify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
    },

    /**
     * Send auto email for Repair Lab bookings across all redundant pipelines
     */
    async sendRepairEmail(repair) {
      if (!repair) return;

      const storeEmail = getStoreEmail();
      const backupEmail = DEFAULT_CONFIG.backupEmail;
      const storeName = getStoreName();

      const trackingCode = repair.trackingCode || repair.ticketNumber || "UH-REP-" + Date.now();
      const name = repair.name || repair.customerName || "Customer";
      const phone = repair.phone || "N/A";
      const device = repair.device || `${repair.deviceBrand || ''} ${repair.deviceModel || ''}`.trim() || "Mobile Device";
      const fault = repair.issue || repair.issueDescription || "General Diagnostic";
      const date = repair.date || "Today (In-Store Express)";

      const payload = {
        _subject: `🛠️ NEW REPAIR BOOKING #${trackingCode} - ${device}`,
        _template: "table",
        _captcha: "false",
        "Store": storeName,
        "Repair Ticket": trackingCode,
        "Customer Name": name,
        "WhatsApp / Phone": phone,
        "Device": device,
        "Fault / Issue": fault,
        "Preferred Visit Time": date,
        "Repair Desk": "Maharagama Flagship Store (188/8c High Level Rd)"
      };

      if (storeEmail.toLowerCase() !== backupEmail.toLowerCase()) {
        payload._cc = backupEmail;
      }

      // 1. Pipeline A: ShipMyForm Instant Delivery
      try {
        const shipParams = new URLSearchParams();
        shipParams.append("_subject", `🛠️ NEW REPAIR BOOKING #${trackingCode} - ${device}`);
        shipParams.append("Store", storeName);
        shipParams.append("Repair_Ticket", trackingCode);
        shipParams.append("Customer_Name", name);
        shipParams.append("WhatsApp_Phone", phone);
        shipParams.append("Device", device);
        shipParams.append("Fault_Issue", fault);
        shipParams.append("Preferred_Time", date);
        shipParams.append("Repair_Desk", "Maharagama Flagship Store (188/8c High Level Rd)");
        if (backupEmail && storeEmail.toLowerCase() !== backupEmail.toLowerCase()) {
          shipParams.append("CC_Backup_Email", backupEmail);
        }

        await fetch(`https://shipmyform.com/to/${encodeURIComponent(storeEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: shipParams.toString()
        });
        console.log("⚡ [NotificationService] Repair booking alert sent via ShipMyForm");
      } catch (err) {
        console.warn("[NotificationService] ShipMyForm repair error:", err);
      }

      // 2. Pipeline B: Netlify Native Forms
      try {
        const netlifyParams = new URLSearchParams({
          "form-name": "repair-notifications",
          "tracking_code": trackingCode,
          "customer_name": name,
          "phone": phone,
          "device": device,
          "fault_issue": fault,
          "preferred_time": date
        });

        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: netlifyParams.toString()
        });
        console.log("⚡ [NotificationService] Repair booking dispatched via Netlify Forms");
      } catch (e) {
        console.warn("[NotificationService] Netlify repair form error:", e);
      }

      // 3. Pipeline C: FormSubmit with 4s timeout (Fallback)
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
        
        const fetchOpts = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        };
        if (controller) fetchOpts.signal = controller.signal;

        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(storeEmail)}`, fetchOpts);
        if (timeoutId) clearTimeout(timeoutId);
      } catch (e) {}

      // 4. Pipeline D: Local Dev Server Notification Bridge
      try {
        await fetch("/api/notify-repair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
    },

    /**
     * Automatically trigger WhatsApp order confirmation
     */
    autoOpenWhatsApp(order) {
      if (!order) return;
      const orderId = order.id || order.orderNumber || "ORD";
      const customerName = order.customerName || order.customer?.name || "Customer";
      const phone = order.phone || order.customer?.phone || "N/A";
      const delivery = order.deliveryMethod || order.method || "Standard Delivery";
      const total = `Rs. ${(order.total || 0).toLocaleString()}`;
      
      const itemsList = (order.items || []).map(i => {
        const variant = [i.storage, i.color].filter(Boolean).join(" • ");
        return `• ${i.name || i.title}${variant ? ` (${variant})` : ''} x${i.qty} (Rs. ${((i.price || 0) * i.qty).toLocaleString()})`;
      }).join('%0A');
      const waText = `*New Order - Universe Hub*%0A*Order ID:* ${orderId}%0A*Customer:* ${encodeURIComponent(customerName)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*Delivery:* ${encodeURIComponent(delivery)}%0A*Total:* ${encodeURIComponent(total)}%0A%0A*Items:*%0A${itemsList}%0A%0APlease confirm my order.`;
      
      const waNumber = getStoreWhatsApp();
      const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

      // Update button visual state
      const waBtn = document.getElementById("btn-success-whatsapp");
      if (waBtn) {
        waBtn.href = waUrl;
        waBtn.innerHTML = `<span>💬</span> <span id="wa-btn-label">Opening WhatsApp to Confirm...</span>`;
      }

      // Automatically launch WhatsApp after brief delay
      setTimeout(() => {
        try {
          const win = window.open(waUrl, "_blank");
          if (!win || win.closed || typeof win.closed === "undefined") {
            // Popup blocker intercepted - keep button prominent
            if (waBtn) {
              const label = document.getElementById("wa-btn-label");
              if (label) label.textContent = "Send Order via WhatsApp (Click Here)";
            }
          } else {
            if (waBtn) {
              const label = document.getElementById("wa-btn-label");
              if (label) label.textContent = "WhatsApp Opened! (Click to Re-open)";
            }
          }
        } catch (e) {
          console.warn("[NotificationService] Auto-open blocked by browser, user can click button", e);
        }
      }, 1200);
    }
  };

  if (typeof window !== "undefined") {
    window.NotificationService = NotificationService;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = NotificationService;
  }
})(typeof window !== "undefined" ? window : globalThis);
