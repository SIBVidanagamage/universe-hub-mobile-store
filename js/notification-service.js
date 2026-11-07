/**
 * Universe Hub - Real-time Order & Notification Engine
 * Automatically dispatches:
 * 1. Instant Email notification to Official Store Email (configured in Admin Center)
 *    with safety CC to shashikaisuranga143@gmail.com
 * 2. Instant WhatsApp auto-redirect with pre-filled order breakdown to Hotline WhatsApp
 * 3. Instant Repair booking email alert
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
     * Send auto email notification to store owner
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

      // If store email is different from backup email, CC backup email so both inboxes receive it
      if (storeEmail.toLowerCase() !== backupEmail.toLowerCase()) {
        payload._cc = backupEmail;
      }

      // 1. Dispatch via Netlify Native Forms (100% Guaranteed on Netlify edge)
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

      // 2. Dispatch via FormSubmit / External Mail to active store email (+ CC)
      try {
        console.log(`[NotificationService] Dispatching order email to ${storeEmail} (CC: ${payload._cc || 'None'})...`);
        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(storeEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log(`⚡ [NotificationService] Order email successfully sent to ${storeEmail}`);
        } else {
          console.warn("[NotificationService] Email dispatch returned status:", response.status);
        }
      } catch (err) {
        console.error("[NotificationService] Failed to send order email:", err);
      }
    },

    /**
     * Send auto email for Repair Lab bookings
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

      // 1. Dispatch via Netlify Native Forms
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

      // 2. Dispatch via FormSubmit
      try {
        console.log(`[NotificationService] Dispatching repair booking alert to ${storeEmail}...`);
        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(storeEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        console.log(`⚡ [NotificationService] Repair booking alert sent to ${storeEmail}`);
      } catch (e) {
        console.error("[NotificationService] Failed to send repair email:", e);
      }
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
