/**
 * Universe Hub - Real-time Order & Notification Engine
 * Automatically dispatches:
 * 1. Instant Email notification to shashikaisuranga143@gmail.com upon order placement
 * 2. Instant WhatsApp auto-redirect with pre-filled order breakdown to Hotline 074-0219239
 * 3. Instant Repair booking email alert
 */

(function (global) {
  const NOTIFY_CONFIG = {
    adminEmail: "shashikaisuranga143@gmail.com",
    storeWhatsApp: "94740219239",
    storeName: "Universe Hub Mobile Store (Maharagama)"
  };

  const NotificationService = {
    config: NOTIFY_CONFIG,

    /**
     * Send auto email notification to store owner
     */
    async sendOrderEmail(order) {
      if (!order) return;

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
        return `${idx + 1}. ${title} x${qty} - Rs. ${lineTotal.toLocaleString()}`;
      }).join("\n");

      const payload = {
        _subject: `🚨 NEW ORDER #${orderId} - ${customerName} (${totalFormatted})`,
        _template: "table",
        _captcha: "false",
        "Store": this.config.storeName,
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

      try {
        console.log(`[NotificationService] Dispatching order email to ${this.config.adminEmail}...`);
        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(this.config.adminEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log(`⚡ [NotificationService] Order email sent to ${this.config.adminEmail}`);
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
        "Store": this.config.storeName,
        "Repair Ticket": trackingCode,
        "Customer Name": name,
        "WhatsApp / Phone": phone,
        "Device": device,
        "Fault / Issue": fault,
        "Preferred Visit Time": date,
        "Repair Desk": "Maharagama Flagship Store (188/8c High Level Rd)"
      };

      try {
        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(this.config.adminEmail)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        console.log(`⚡ [NotificationService] Repair booking alert sent to ${this.config.adminEmail}`);
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
      
      const itemsList = (order.items || []).map(i => `• ${i.name || i.title} x${i.qty} (Rs. ${((i.price || 0) * i.qty).toLocaleString()})`).join('%0A');
      const waText = `*New Order - Universe Hub*%0A*Order ID:* ${orderId}%0A*Customer:* ${encodeURIComponent(customerName)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*Delivery:* ${encodeURIComponent(delivery)}%0A*Total:* ${encodeURIComponent(total)}%0A%0A*Items:*%0A${itemsList}%0A%0APlease confirm my order.`;
      const waUrl = `https://wa.me/${this.config.storeWhatsApp}?text=${waText}`;

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
