/**
 * Universe Hub - Invoice & PDF Generation Service
 * Renders professional tax invoices and handles 1-click A4 PDF download & print.
 */

const InvoiceService = {
  // Helper to fetch an order by ID from local storage or demo data
  getOrder(orderId) {
    let orders = [];
    try {
      orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    } catch (e) {
      orders = [];
    }
    if (orders.length === 0 && typeof DEMO_STORE_ORDERS !== 'undefined') {
      orders = DEMO_STORE_ORDERS;
    }

    let found = orders.find(o => o.id === orderId);
    if (!found && typeof DEMO_STORE_ORDERS !== 'undefined') {
      found = DEMO_STORE_ORDERS.find(o => o.id === orderId);
    }
    return found || null;
  },

  // Generate SVG QR Code representation for invoice authenticity
  getQrCodeSvg(orderId) {
    return `
      <svg class="invoice-qr-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#ffffff" rx="4"/>
        <!-- Corner 1 -->
        <rect x="8" y="8" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="5" fill="none"/>
        <rect x="16" y="16" width="12" height="12" fill="#0284c7"/>
        <!-- Corner 2 -->
        <rect x="64" y="8" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="5" fill="none"/>
        <rect x="72" y="16" width="12" height="12" fill="#0284c7"/>
        <!-- Corner 3 -->
        <rect x="8" y="64" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="5" fill="none"/>
        <rect x="16" y="72" width="12" height="12" fill="#0284c7"/>
        <!-- Data points -->
        <rect x="42" y="12" width="6" height="6" fill="#0f172a"/>
        <rect x="50" y="20" width="6" height="6" fill="#0f172a"/>
        <rect x="42" y="28" width="6" height="6" fill="#0f172a"/>
        <rect x="12" y="44" width="6" height="6" fill="#0f172a"/>
        <rect x="24" y="48" width="6" height="6" fill="#0f172a"/>
        <rect x="44" y="44" width="12" height="12" fill="#0f172a"/>
        <rect x="62" y="44" width="6" height="6" fill="#0f172a"/>
        <rect x="76" y="48" width="8" height="8" fill="#0f172a"/>
        <rect x="44" y="64" width="6" height="6" fill="#0f172a"/>
        <rect x="56" y="72" width="8" height="8" fill="#0284c7"/>
        <rect x="70" y="64" width="6" height="6" fill="#0f172a"/>
        <rect x="80" y="76" width="6" height="6" fill="#0f172a"/>
        <rect x="52" y="84" width="6" height="6" fill="#0f172a"/>
      </svg>
    `;
  },

  // Build the clean HTML for the printable invoice paper
  buildInvoiceHTML(order) {
    if (!order) return `<div style="padding:20px; color:#ef4444;">Order not found.</div>`;

    const subtotal = order.total || 0;
    const items = order.items || [];
    const formattedDate = order.date || new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    return `
      <div id="invoice-printable-doc" class="invoice-paper">
        <!-- Invoice Header Row -->
        <div class="invoice-header-row">
          <div class="invoice-logo-group">
            <img src="assets/universe_hub_logo.png" alt="Universe Hub" class="invoice-logo-img" onerror="this.src='assets/logo.png'">
            <div class="invoice-tagline">Apple &amp; Flagship Tech Retailer</div>
            <div class="invoice-address-lines">
              📍 188/8c, High Level Road, Maharagama, Sri Lanka<br>
              📞 Hotline / WhatsApp: <strong>074-0219239</strong><br>
              ✉️ contact@universehub.store • 🌐 universehub.store<br>
              <span style="display:inline-block; margin-top:3px; color:#0284c7; font-weight:700;">
                TRCSL Approved • Certified Apple Repair Lab
              </span>
            </div>
          </div>

          <div class="invoice-meta-card">
            <div class="invoice-badge-title">TAX INVOICE</div>
            <div class="invoice-num-tag">INV / ${order.id}</div>
            <div class="invoice-meta-list">
              <span><strong>Issue Date:</strong> ${formattedDate}</span>
              <span><strong>Order Status:</strong> <span style="color:#0284c7; font-weight:700;">${order.status || 'Confirmed'}</span></span>
              <span><strong>Payment:</strong> ${order.paymentMethod || 'Cash on Delivery / Card'}</span>
              <span><strong>Fulfillment:</strong> ${order.deliveryMethod || order.method || 'Island-wide Express Courier'}</span>
            </div>
          </div>
        </div>

        <!-- Customer & Dispatch Grid -->
        <div class="invoice-customer-grid">
          <div class="invoice-info-block">
            <h4>Billed To (Customer Details)</h4>
            <div class="invoice-cust-name">${order.customerName || 'Valued Customer'}</div>
            <div class="invoice-cust-text">
              💬 WhatsApp Contact: <strong>${order.whatsapp || order.phone || 'N/A'}</strong><br>
              ${order.email ? `✉️ Email: ${order.email}<br>` : ''}
              📍 Delivery Address: ${order.address || 'Maharagama Flagship Store Pickup'}
            </div>
          </div>

          <div class="invoice-info-block">
            <h4>Store Outlet &amp; Warranty Center</h4>
            <div class="invoice-cust-name">Universe Hub Maharagama Flagship</div>
            <div class="invoice-cust-text">
              🏢 Desk: Counter 01 / Dispatch Express<br>
              🛡️ Warranty Desk: 074-0219239<br>
              ⏰ Store Hours: Open Daily 9:30 AM – 8:30 PM
            </div>
          </div>
        </div>

        <!-- Itemized Products Table -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width:28px; text-align:center;">#</th>
              <th>Item Description</th>
              <th>Condition &amp; Warranty</th>
              <th style="text-align:center; width:45px;">Qty</th>
              <th style="text-align:right; width:110px;">Unit Price</th>
              <th style="text-align:right; width:120px;">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const itemTitle = item.name || item.title || 'Product';
              const itemPrice = Number(item.price || 0);
              const itemQty = Number(item.qty || 1);
              const lineTotal = itemPrice * itemQty;
              const cond = item.condition || 'Brand New (Sealed)';
              return `
                <tr>
                  <td style="text-align:center; color:#64748b;">${idx + 1}</td>
                  <td>
                    <div class="invoice-item-title">${itemTitle}</div>
                    ${item.variant ? `<div class="invoice-item-sub">Variant: ${item.variant}</div>` : ''}
                  </td>
                  <td>
                    <span class="invoice-pill-cond">${cond}</span>
                    <div style="font-size:10.5px; color:#64748b; margin-top:2px;">
                      ${itemTitle.toLowerCase().includes('phone') ? 'Verified 3uTools Battery • 6-Mo Warranty' : 'Official Manufacturer Warranty'}
                    </div>
                  </td>
                  <td style="text-align:center; font-weight:700;">${itemQty}</td>
                  <td style="text-align:right;">Rs. ${itemPrice.toLocaleString()}</td>
                  <td style="text-align:right; font-weight:700; color:#0f172a;">Rs. ${lineTotal.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Totals & Authenticity Section -->
        <div class="invoice-totals-row">
          <div class="invoice-security-qr">
            ${this.getQrCodeSvg(order.id)}
            <div class="invoice-qr-note">
              <strong>Official Digital Receipt</strong><br>
              Scan to verify warranty validity &amp; repair history at Universe Hub Maharagama.
            </div>
          </div>

          <div class="invoice-totals-box">
            <div class="invoice-line-total-row">
              <span>Items Subtotal:</span>
              <span>Rs. ${subtotal.toLocaleString()}</span>
            </div>
            <div class="invoice-line-total-row">
              <span>Delivery Charges:</span>
              <span style="color:#059669; font-weight:700;">FREE (Island-wide)</span>
            </div>
            <div class="invoice-grand-row">
              <span>Grand Total:</span>
              <span>Rs. ${subtotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Warranty & Store Policy -->
        <div class="invoice-terms-box">
          <strong>Universe Hub Customer Guarantee &amp; Warranty Policy:</strong>
          <ul>
            <li>Brand new devices are 100% factory sealed with Apple Care &amp; TRCSL compliance.</li>
            <li>Certified pre-owned devices feature 100% genuine tested parts with transparent battery health verification.</li>
            <li>Please retain this physical or digital tax invoice for any warranty claims, return requests, or physical counter service.</li>
            <li>Direct WhatsApp Store Support: <strong>074-0219239</strong> (Available Daily).</li>
          </ul>
        </div>

        <!-- Signatures & Official Stamp -->
        <div class="invoice-signatures-row">
          <div class="invoice-stamp-container">
            <div class="invoice-official-stamp">
              <span>UNIVERSE HUB</span>
              <div>★ SEALED ★</div>
              <small>FLAGSHIP</small>
            </div>
            <div style="font-size:10px; color:#64748b;">
              Official Digital Seal<br>
              Universe Hub Pvt Ltd
            </div>
          </div>

          <div class="invoice-sign-box">
            <div class="invoice-sign-signature">Universe Hub Auth</div>
            <div class="invoice-sign-line">Authorized Store Signatory</div>
          </div>
        </div>
      </div>
    `;
  },

  // Open the Invoice Modal with download and print options
  showInvoice(orderId) {
    const order = this.getOrder(orderId);
    if (!order) {
      showToast("Order not found: " + orderId);
      return;
    }

    const container = document.getElementById("invoice-preview-container");
    if (!container) return;

    container.innerHTML = this.buildInvoiceHTML(order);

    // Update Action button bindings
    const dlBtn = document.getElementById("btn-download-pdf-action");
    if (dlBtn) {
      dlBtn.onclick = () => this.downloadPDF(order.id);
    }

    const printBtn = document.getElementById("btn-print-invoice-action");
    if (printBtn) {
      printBtn.onclick = () => this.printInvoice();
    }

    const waBtn = document.getElementById("btn-wa-invoice-action");
    if (waBtn) {
      const itemsList = (order.items || []).map(i => `• ${i.name || i.title} x${i.qty}`).join('%0A');
      const waText = `*Invoice Inquiry - Universe Hub*%0A*Order ID:* ${order.id}%0A*Customer:* ${encodeURIComponent(order.customerName)}%0A*Total:* Rs. ${(order.total || 0).toLocaleString()}%0A*Items:*%0A${itemsList}`;
      waBtn.href = `https://wa.me/94740219239?text=${waText}`;
    }

    App.openModal("invoice-modal");
  },

  // Download PDF using html2pdf.js with fallback
  downloadPDF(orderId) {
    const order = this.getOrder(orderId);
    const element = document.getElementById("invoice-printable-doc");
    if (!element) {
      showToast("Cannot generate PDF: Invoice element not found.");
      return;
    }

    showToast("📄 Generating high-resolution PDF invoice...");

    // Check if html2pdf is available
    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `UniverseHub_Invoice_${order ? order.id : 'ORD'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        showToast("✅ Invoice PDF downloaded successfully!");
      }).catch(err => {
        console.error("PDF generation error:", err);
        showToast("Notice: Opening print dialog for PDF saving...");
        window.print();
      });
    } else {
      // Fallback: Open clean print dialog where users can select 'Save as PDF'
      window.print();
    }
  },

  // Trigger print dialog
  printInvoice() {
    window.print();
  },

  // Show Order Confirmation Modal immediately upon placing an order
  showOrderSuccess(order) {
    const titleEl = document.getElementById("order-success-id");
    const custEl = document.getElementById("order-success-cust");
    const totalEl = document.getElementById("order-success-total");
    const methodEl = document.getElementById("order-success-method");

    if (titleEl) titleEl.textContent = order.id;
    if (custEl) custEl.textContent = order.customerName + " (" + order.phone + ")";
    if (totalEl) totalEl.textContent = "Rs. " + (order.total || 0).toLocaleString();
    if (methodEl) methodEl.textContent = order.deliveryMethod || order.method || "Express Courier";

    // Bind action buttons
    const viewInvBtn = document.getElementById("btn-success-view-invoice");
    if (viewInvBtn) {
      viewInvBtn.onclick = () => {
        App.closeModal("order-success-modal");
        this.showInvoice(order.id);
      };
    }

    const dlPdfBtn = document.getElementById("btn-success-download-pdf");
    if (dlPdfBtn) {
      dlPdfBtn.onclick = () => {
        // Render invoice silently if needed, then download
        this.showInvoice(order.id);
        setTimeout(() => this.downloadPDF(order.id), 300);
      };
    }

    const waBtn = document.getElementById("btn-success-whatsapp");
    if (waBtn) {
      const itemsList = (order.items || []).map(i => `• ${i.name || i.title} x${i.qty} (Rs. ${(i.price * i.qty).toLocaleString()})`).join('%0A');
      const waText = `*New Order - Universe Hub*%0A*Order ID:* ${order.id}%0A*Customer:* ${encodeURIComponent(order.customerName)}%0A*Phone:* ${encodeURIComponent(order.phone)}%0A*Delivery:* ${encodeURIComponent(order.deliveryMethod || order.method)}%0A*Total:* Rs. ${(order.total || 0).toLocaleString()}%0A%0A*Items:*%0A${itemsList}`;
      waBtn.href = `https://wa.me/94740219239?text=${waText}`;
    }

    // Auto dispatch email & Auto open WhatsApp
    if (typeof NotificationService !== 'undefined') {
      NotificationService.sendOrderEmail(order);
      NotificationService.autoOpenWhatsApp(order);
    }

    App.openModal("order-success-modal");
  },

  // Open Customer Orders Portal Modal (List of past orders with invoice buttons)
  showCustomerOrders() {
    const orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || (typeof DEMO_STORE_ORDERS !== 'undefined' ? DEMO_STORE_ORDERS : []);
    const user = App.currentUser;
    const container = document.getElementById("customer-orders-list");
    if (!container) return;

    // Filter orders if user has email/phone
    let userOrders = orders;
    if (user && user.role !== 'admin') {
      const userEmail = (user.email || '').toLowerCase();
      const userPhone = (user.phone || '').replace(/\D/g, '');
      const filtered = orders.filter(o => {
        const oEmail = (o.email || '').toLowerCase();
        const oPhone = (o.phone || '').replace(/\D/g, '');
        return (userEmail && oEmail === userEmail) || (userPhone && oPhone && oPhone === userPhone);
      });
      if (filtered.length > 0) userOrders = filtered;
    }

    if (userOrders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:36px 20px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📦</div>
          <h4>No orders recorded yet</h4>
          <p style="font-size:12.5px;">Add items to your cart and complete checkout to see your purchase history and invoices.</p>
        </div>
      `;
    } else {
      container.innerHTML = userOrders.map(ord => {
        const items = ord.items || [];
        const total = ord.total || 0;
        return `
          <div class="customer-order-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div>
                <span style="font-weight:800; color:var(--neon-cyan); font-size:14px;">${ord.id}</span>
                <span style="color:var(--text-muted); font-size:12px; margin-left:8px;">• ${ord.date || 'Recent'}</span>
              </div>
              <span class="badge-pill" style="background:rgba(0,210,255,0.15); color:var(--neon-cyan); font-size:11px;">
                ${ord.status || 'Confirmed'}
              </span>
            </div>

            <div style="font-size:13px; color:#cbd5e1; margin-bottom:12px;">
              ${items.map(i => `<div style="margin-bottom:2px;">• <strong>${i.name || i.title}</strong> × ${i.qty} (Rs. ${(i.price * i.qty).toLocaleString()})</div>`).join('')}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
              <div>
                <span style="font-size:12px; color:var(--text-muted);">Total Amount:</span>
                <strong style="color:#fff; font-size:14px; margin-left:4px;">Rs. ${total.toLocaleString()}</strong>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-invoice-download" onclick="InvoiceService.showInvoice('${ord.id}')" style="padding:6px 12px; font-size:12px;">
                  📄 View Invoice
                </button>
                <button class="btn-invoice-print" onclick="InvoiceService.showInvoice('${ord.id}'); setTimeout(() => InvoiceService.downloadPDF('${ord.id}'), 300);" style="padding:6px 12px; font-size:12px;">
                  📥 PDF
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    App.openModal("customer-orders-modal");
  }
};

// Explicitly bind to window & module.exports for inline HTML onclicks and cross-script calls
if (typeof window !== 'undefined') {
  window.InvoiceService = InvoiceService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InvoiceService;
}
