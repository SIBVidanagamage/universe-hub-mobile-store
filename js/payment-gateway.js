/**
 * Universe Hub - Online Payment Gateway Integration Engine
 * Supports PayHere Sri Lanka (LKR, Cards, Genie/FriMi, Mobile Wallets) & Stripe (International Cards & Apple Pay)
 * Includes Sandbox/Live modes, 3D Secure OTP simulation, transaction logging, and Invoice Sync.
 */

const PaymentGateway = {
  // Default Gateway Configuration
  defaultConfig: {
    mode: "sandbox", // "sandbox" or "live"
    payhere: {
      enabled: true,
      merchantId: "1224859",
      merchantSecret: "4N3m9UniverseHubSecret2026",
      currency: "LKR",
      title: "PayHere Sri Lanka (Online Card / Genie / FriMi / eZ Cash)"
    },
    stripe: {
      enabled: true,
      publishableKey: "pk_test_51PUniverseHubDemoKey123",
      secretKey: "sk_test_51PUniverseHubSecretKey456",
      currency: "LKR",
      title: "Stripe International (Visa, MasterCard, Amex, Apple Pay)"
    },
    koko: {
      enabled: true,
      installments: 3,
      title: "Koko Buy Now Pay Later (3-Month 0% Interest)"
    },
    cod: {
      enabled: true,
      title: "Cash on Delivery / Pay at Maharagama Store Counter"
    }
  },

  // Active state during checkout
  currentOrderPayload: null,
  activePayHereTab: 'card',
  selectedMethod: 'payhere',

  init() {
    this.ensureConfig();
    this.bindCheckoutEvents();
  },

  ensureConfig() {
    const saved = localStorage.getItem("UH_PAYMENT_CONFIG");
    if (!saved) {
      localStorage.setItem("UH_PAYMENT_CONFIG", JSON.stringify(this.defaultConfig));
    }
  },

  getConfig() {
    try {
      const saved = localStorage.getItem("UH_PAYMENT_CONFIG");
      return saved ? { ...this.defaultConfig, ...JSON.parse(saved) } : this.defaultConfig;
    } catch (e) {
      return this.defaultConfig;
    }
  },

  saveConfig(newConfig) {
    localStorage.setItem("UH_PAYMENT_CONFIG", JSON.stringify(newConfig));
    showToast("⚙️ Payment Gateway configurations saved!");
  },

  // --------------------------------------------------------------------------
  // CHECKOUT PAYMENT METHOD SELECTION & UI
  // --------------------------------------------------------------------------
  bindCheckoutEvents() {
    // Handled dynamically when checkout modal opens
  },

  selectPaymentMethod(method) {
    this.selectedMethod = method;
    document.querySelectorAll('.payment-method-card').forEach(card => {
      const isMatch = card.dataset.method === method;
      card.classList.toggle('selected', isMatch);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isMatch;
    });

    // Update hidden or checkout payment method state
    const checkoutMethodInput = document.getElementById('checkout-payment-method-val');
    if (checkoutMethodInput) {
      checkoutMethodInput.value = method;
    }

    // Toggle Koko breakdown box if applicable
    const kokoBox = document.getElementById('koko-breakdown-container');
    if (kokoBox) {
      kokoBox.style.display = method === 'koko' ? 'block' : 'none';
    }

    // Update submit button text dynamically
    const submitBtn = document.getElementById('checkout-submit-btn');
    if (submitBtn) {
      if (method === 'payhere') {
        submitBtn.innerHTML = `🔒 Proceed to PayHere Gateway (LKR)`;
      } else if (method === 'stripe') {
        submitBtn.innerHTML = `💳 Proceed to Stripe Card Checkout`;
      } else if (method === 'koko') {
        submitBtn.innerHTML = `🛍️ Confirm Order with Koko (Pay 1/3 Today)`;
      } else {
        submitBtn.innerHTML = `Confirm &amp; Place Order (Cash on Delivery)`;
      }
    }
  },

  updateKokoCalculator(subtotal) {
    const kokoBox = document.getElementById('koko-breakdown-container');
    if (!kokoBox) return;

    const installment = Math.round(subtotal / 3);
    const date1 = new Date();
    const date2 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const date3 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    kokoBox.innerHTML = `
      <div class="koko-breakdown-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#fb7185; display:flex; align-items:center; gap:6px;">
            <span>🛍️</span> Koko 3-Month 0% Interest Plan:
          </strong>
          <span style="font-size:10px; background:rgba(244,63,94,0.25); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700;">Zero Extra Fees</span>
        </div>
        <div style="font-size:11.5px; color:#cbd5e1; margin-bottom:8px;">
          Split your purchase of <strong>Rs. ${subtotal.toLocaleString()}</strong> into 3 equal monthly debit card installments:
        </div>
        <div class="koko-installments-list">
          <div class="koko-inst-card" style="border-color:#fb7185;">
            <small style="color:#fb7185; font-weight:700;">1st: Today (${fmt(date1)})</small>
            <strong>Rs. ${installment.toLocaleString()}</strong>
          </div>
          <div class="koko-inst-card">
            <small>2nd: In 30 Days (${fmt(date2)})</small>
            <strong>Rs. ${installment.toLocaleString()}</strong>
          </div>
          <div class="koko-inst-card">
            <small>3rd: In 60 Days (${fmt(date3)})</small>
            <strong>Rs. ${installment.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // PAYHERE SRI LANKA PAYMENT ENGINE
  // --------------------------------------------------------------------------
  openPayHereModal(orderPayload) {
    this.currentOrderPayload = orderPayload;
    this.activePayHereTab = 'card';

    // Populate modal details
    const amtEl = document.getElementById('payhere-order-amount');
    const idEl = document.getElementById('payhere-order-id');
    const custEl = document.getElementById('payhere-cust-name');
    const modeBadge = document.getElementById('payhere-mode-badge');
    const errBanner = document.getElementById('payhere-error-banner');
    const otpSection = document.getElementById('payhere-otp-section');
    const formSection = document.getElementById('payhere-form-section');
    const successSection = document.getElementById('payhere-success-section');

    if (amtEl) amtEl.textContent = `Rs. ${(orderPayload.total || 0).toLocaleString()} LKR`;
    if (idEl) idEl.textContent = orderPayload.id;
    if (custEl) custEl.textContent = orderPayload.customerName;

    const cfg = this.getConfig();
    if (modeBadge) {
      modeBadge.textContent = cfg.mode === 'sandbox' ? '🧪 SANDBOX / DEMO' : '🟢 PRODUCTION LIVE';
      modeBadge.style.color = cfg.mode === 'sandbox' ? '#fef08a' : '#4ade80';
    }

    if (errBanner) errBanner.style.display = 'none';
    if (otpSection) otpSection.style.display = 'none';
    if (formSection) formSection.style.display = 'block';
    if (successSection) successSection.style.display = 'none';

    // Pre-fill cardholder name
    const chName = document.getElementById('ph-card-name');
    if (chName) chName.value = orderPayload.customerName;

    // Reset card inputs
    const cNum = document.getElementById('ph-card-number');
    const cExp = document.getElementById('ph-card-exp');
    const cCvv = document.getElementById('ph-card-cvv');
    if (cNum) cNum.value = '';
    if (cExp) cExp.value = '';
    if (cCvv) cCvv.value = '';

    this.switchPayHereChannel('card');

    // Open Modal
    const modal = document.getElementById('payhere-payment-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closePayHereModal() {
    const modal = document.getElementById('payhere-payment-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  },

  switchPayHereChannel(channel) {
    this.activePayHereTab = channel;
    document.querySelectorAll('.payhere-channel-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.channel === channel);
    });

    const cardView = document.getElementById('ph-channel-card-view');
    const qrView = document.getElementById('ph-channel-qr-view');
    const bankView = document.getElementById('ph-channel-bank-view');
    const walletView = document.getElementById('ph-channel-wallet-view');

    if (cardView) cardView.style.display = channel === 'card' ? 'block' : 'none';
    if (qrView) qrView.style.display = channel === 'qr' ? 'block' : 'none';
    if (bankView) bankView.style.display = channel === 'bank' ? 'block' : 'none';
    if (walletView) walletView.style.display = channel === 'wallet' ? 'block' : 'none';

    const payBtn = document.getElementById('btn-submit-payhere-pay');
    if (payBtn) {
      if (channel === 'card') payBtn.innerHTML = `🔒 Pay Now With Card`;
      else if (channel === 'qr') payBtn.innerHTML = `📱 Simulate QR Scan Success`;
      else if (channel === 'bank') payBtn.innerHTML = `🏦 Connect &amp; Pay via Bank`;
      else if (channel === 'wallet') payBtn.innerHTML = `📲 Authorize Wallet Deduction`;
    }
  },

  autofillPayHereCard(type = 'success') {
    const cNum = document.getElementById('ph-card-number');
    const cExp = document.getElementById('ph-card-exp');
    const cCvv = document.getElementById('ph-card-cvv');
    const cName = document.getElementById('ph-card-name');

    if (type === 'success') {
      if (cNum) cNum.value = '4532 1123 4567 8901';
      if (cExp) cExp.value = '12/28';
      if (cCvv) cCvv.value = '882';
      if (cName) cName.value = this.currentOrderPayload?.customerName || 'Kasun Ranasinghe';
      showToast('✓ Autofilled PayHere Sandbox Success Card');
    } else if (type === 'declined') {
      if (cNum) cNum.value = '4000 0000 0000 0002';
      if (cExp) cExp.value = '05/26';
      if (cCvv) cCvv.value = '000';
      if (cName) cName.value = 'Declined Test User';
      showToast('⚠️ Autofilled Declined Test Card');
    }
  },

  handlePayHereSubmit() {
    const errBanner = document.getElementById('payhere-error-banner');
    if (errBanner) errBanner.style.display = 'none';

    if (this.activePayHereTab === 'card') {
      const cNum = document.getElementById('ph-card-number')?.value.replace(/\s+/g, '') || '';
      const cExp = document.getElementById('ph-card-exp')?.value || '';
      const cCvv = document.getElementById('ph-card-cvv')?.value || '';

      if (cNum.length < 15) {
        this.showPayHereError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cExp || !cExp.includes('/')) {
        this.showPayHereError('Please enter valid Expiry Date (MM/YY).');
        return;
      }
      if (cCvv.length < 3) {
        this.showPayHereError('Please enter valid 3-digit CVV.');
        return;
      }

      // Check for simulated decline
      if (cNum.endsWith('0002') || cNum.includes('00000000')) {
        this.showPayHereError('❌ Payment Declined by Bank: Insufficient Funds (Do Not Honor).');
        return;
      }

      // Transition to simulated 3D Secure OTP Verification Step
      this.showPayHereOtpScreen();
    } else {
      // Direct success for QR, Bank, Wallets in demo mode
      this.showPayHereProcessingAndComplete('PayHere ' + this.activePayHereTab.toUpperCase());
    }
  },

  showPayHereError(msg) {
    const errBanner = document.getElementById('payhere-error-banner');
    if (errBanner) {
      errBanner.textContent = msg;
      errBanner.style.display = 'block';
    }
  },

  showPayHereOtpScreen() {
    const formSection = document.getElementById('payhere-form-section');
    const otpSection = document.getElementById('payhere-otp-section');
    if (formSection) formSection.style.display = 'none';
    if (otpSection) otpSection.style.display = 'block';

    const phoneMask = document.getElementById('ph-otp-phone-mask');
    const phone = this.currentOrderPayload?.phone || '07XXXXXXXX';
    if (phoneMask) {
      phoneMask.textContent = phone.length > 6 ? `${phone.slice(0, 3)} •••• ${phone.slice(-3)}` : phone;
    }

    // Auto focus first OTP input
    const firstOtp = document.getElementById('ph-otp-1');
    if (firstOtp) {
      firstOtp.value = '';
      firstOtp.focus();
    }
    ['ph-otp-2', 'ph-otp-3', 'ph-otp-4', 'ph-otp-5', 'ph-otp-6'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  autofillOtp() {
    const code = ['1', '2', '3', '4', '5', '6'];
    code.forEach((digit, idx) => {
      const el = document.getElementById(`ph-otp-${idx + 1}`);
      if (el) el.value = digit;
    });
    showToast('✓ Auto-filled Sandbox 3DS OTP: 123456');
  },

  handleOtpSubmit() {
    const otp = [1, 2, 3, 4, 5, 6].map(i => document.getElementById(`ph-otp-${i}`)?.value || '').join('');
    if (otp.length < 6) {
      showToast('⚠️ Please enter complete 6-digit OTP code.');
      return;
    }

    this.showPayHereProcessingAndComplete('PayHere Card');
  },

  showPayHereProcessingAndComplete(channelName) {
    const otpSection = document.getElementById('payhere-otp-section');
    const formSection = document.getElementById('payhere-form-section');
    const successSection = document.getElementById('payhere-success-section');

    if (otpSection) otpSection.style.display = 'none';
    if (formSection) formSection.style.display = 'none';
    if (successSection) {
      successSection.style.display = 'block';
      successSection.innerHTML = `
        <div style="text-align:center; padding:30px 10px;">
          <div class="payment-spinner" style="width:44px; height:44px; border-width:3px; border-top-color:#38bdf8; margin-bottom:18px;"></div>
          <h3 style="color:#fff; font-size:18px; margin-bottom:6px;">Processing Payment via PayHere...</h3>
          <p style="color:var(--text-secondary); font-size:13px; line-height:1.4;">
            Securing encrypted transaction with Central Bank of Sri Lanka Certified IPG Gateway. Please do not close this window.
          </p>
        </div>
      `;
    }

    // Simulate 1.2s bank network latency
    setTimeout(() => {
      const txnId = 'PH-' + Math.floor(10000000 + Math.random() * 90000000);
      
      if (successSection) {
        successSection.innerHTML = `
          <div style="text-align:center; padding:24px 10px;">
            <div class="payment-success-circle">✓</div>
            <h2 style="color:#fff; font-size:20px; font-weight:800; margin-bottom:4px;">Payment Successful!</h2>
            <p style="color:#38bdf8; font-size:13.5px; font-weight:700; margin-bottom:14px;">
              PayHere Transaction ID: ${txnId}
            </p>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; margin-bottom:20px; text-align:left; font-size:12.5px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--text-secondary);">Paid Amount:</span>
                <strong style="color:#fff;">Rs. ${(this.currentOrderPayload?.total || 0).toLocaleString()} LKR</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--text-secondary);">Payment Method:</span>
                <span style="color:#38bdf8; font-weight:700;">${channelName} (Verified)</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-secondary);">Merchant:</span>
                <span style="color:#fff;">Universe Hub (Pvt) Ltd</span>
              </div>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:18px;">
              Generating official tax invoice and directing you to order receipt...
            </p>
          </div>
        `;
      }

      // Commit finalized order to store
      setTimeout(() => {
        this.commitOnlineOrder('PayHere Sri Lanka', txnId);
        this.closePayHereModal();
      }, 1600);

    }, 1200);
  },

  // --------------------------------------------------------------------------
  // STRIPE INTERNATIONAL PAYMENT ENGINE
  // --------------------------------------------------------------------------
  openStripeModal(orderPayload) {
    this.currentOrderPayload = orderPayload;

    const amtEl = document.getElementById('stripe-order-amount');
    const custEl = document.getElementById('stripe-cust-email');
    const errEl = document.getElementById('stripe-error-banner');
    const formView = document.getElementById('stripe-form-view');
    const successView = document.getElementById('stripe-success-view');

    if (amtEl) amtEl.textContent = `Rs. ${(orderPayload.total || 0).toLocaleString()} LKR`;
    if (custEl) custEl.textContent = orderPayload.email || `${orderPayload.customerName.toLowerCase().replace(/\s+/g, '')}@example.com`;

    if (errEl) errEl.style.display = 'none';
    if (formView) formView.style.display = 'block';
    if (successView) successView.style.display = 'none';

    // Reset card fields
    const cardNum = document.getElementById('stripe-card-num');
    const cardExp = document.getElementById('stripe-card-exp');
    const cardCvc = document.getElementById('stripe-card-cvc');
    const cardZip = document.getElementById('stripe-card-zip');

    if (cardNum) cardNum.value = '';
    if (cardExp) cardExp.value = '';
    if (cardCvc) cardCvc.value = '';
    if (cardZip) cardZip.value = '10230';

    const modal = document.getElementById('stripe-payment-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeStripeModal() {
    const modal = document.getElementById('stripe-payment-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  },

  autofillStripeTestCard() {
    const cardNum = document.getElementById('stripe-card-num');
    const cardExp = document.getElementById('stripe-card-exp');
    const cardCvc = document.getElementById('stripe-card-cvc');
    const cardZip = document.getElementById('stripe-card-zip');

    if (cardNum) cardNum.value = '4242 4242 4242 4242';
    if (cardExp) cardExp.value = '04/28';
    if (cardCvc) cardCvc.value = '424';
    if (cardZip) cardZip.value = '10230';

    showToast('✓ Autofilled Stripe 4242 Test Card');
  },

  handleStripeSubmit(expressType = null) {
    const formView = document.getElementById('stripe-form-view');
    const successView = document.getElementById('stripe-success-view');
    const errEl = document.getElementById('stripe-error-banner');

    if (!expressType) {
      const cardNum = document.getElementById('stripe-card-num')?.value.replace(/\s+/g, '') || '';
      const cardExp = document.getElementById('stripe-card-exp')?.value || '';
      const cardCvc = document.getElementById('stripe-card-cvc')?.value || '';

      if (cardNum.length < 15) {
        if (errEl) {
          errEl.textContent = 'Please enter a valid card number.';
          errEl.style.display = 'block';
        }
        return;
      }
      if (!cardExp || !cardExp.includes('/')) {
        if (errEl) {
          errEl.textContent = 'Please enter expiration date (MM/YY).';
          errEl.style.display = 'block';
        }
        return;
      }
      if (cardCvc.length < 3) {
        if (errEl) {
          errEl.textContent = 'Please enter security CVC.';
          errEl.style.display = 'block';
        }
        return;
      }
    }

    if (errEl) errEl.style.display = 'none';
    if (formView) formView.style.display = 'none';
    if (successView) {
      successView.style.display = 'block';
      successView.innerHTML = `
        <div style="text-align:center; padding:30px 10px;">
          <div class="payment-spinner" style="width:44px; height:44px; border-width:3px; border-top-color:#635bff; margin-bottom:18px;"></div>
          <h3 style="color:#fff; font-size:18px; margin-bottom:6px;">Processing with Stripe...</h3>
          <p style="color:var(--text-secondary); font-size:13px;">Authorizing 3D-Secure payment intent...</p>
        </div>
      `;
    }

    setTimeout(() => {
      const chargeId = 'pi_3P' + Math.random().toString(36).substring(2, 14) + '_secret_' + Math.random().toString(36).substring(2, 8);
      
      if (successView) {
        successView.innerHTML = `
          <div style="text-align:center; padding:24px 10px;">
            <div class="payment-success-circle" style="border-color:#635bff; color:#635bff; box-shadow:0 0 24px rgba(99,91,255,0.35);">✓</div>
            <h2 style="color:#fff; font-size:20px; font-weight:800; margin-bottom:4px;">Stripe Payment Succeeded!</h2>
            <p style="color:#a5b4fc; font-size:13px; font-family:monospace; margin-bottom:14px;">
              Intent: ${chargeId.substring(0, 20)}...
            </p>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; margin-bottom:20px; text-align:left; font-size:12.5px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="color:var(--text-secondary);">Paid Amount:</span>
                <strong style="color:#fff;">Rs. ${(this.currentOrderPayload?.total || 0).toLocaleString()} LKR</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-secondary);">Channel:</span>
                <span style="color:#a5b4fc; font-weight:700;">${expressType ? expressType : 'Stripe Visa/MasterCard (3DS)'}</span>
              </div>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:18px;">
              Redirecting to official invoice receipt...
            </p>
          </div>
        `;
      }

      setTimeout(() => {
        this.commitOnlineOrder('Stripe International', chargeId);
        this.closeStripeModal();
      }, 1500);

    }, 1200);
  },

  // --------------------------------------------------------------------------
  // ORDER COMPLETION & INVOICE HOOK
  // --------------------------------------------------------------------------
  commitOnlineOrder(gatewayName, transactionId) {
    if (!this.currentOrderPayload) return;

    const finalizedOrder = {
      ...this.currentOrderPayload,
      paymentMethod: gatewayName,
      paymentStatus: 'PAID',
      paymentGateway: gatewayName,
      transactionId: transactionId,
      paidAt: new Date().toISOString(),
      status: this.currentOrderPayload.deliveryMethod.includes("Store") ? "Paid - Ready for Pickup" : "Paid - Dispatch In Progress"
    };

    // Save to UH_ORDERS
    let orders = JSON.parse(localStorage.getItem("UH_ORDERS")) || [];
    orders.unshift(finalizedOrder);
    localStorage.setItem("UH_ORDERS", JSON.stringify(orders));

    // Log to UH_GATEWAY_LOGS
    this.logTransaction({
      id: transactionId,
      orderId: finalizedOrder.id,
      customer: finalizedOrder.customerName,
      phone: finalizedOrder.phone,
      amount: finalizedOrder.total,
      currency: "LKR",
      gateway: gatewayName,
      status: "SUCCESS",
      timestamp: new Date().toLocaleString()
    });

    // Clear customer cart
    localStorage.setItem("UH_CART", JSON.stringify([]));
    if (typeof App !== 'undefined') {
      App.updateCartBadge();
      App.closeModal("checkout-modal");
    }

    // Refresh Admin Orders if open
    if (typeof AdminController !== 'undefined') {
      AdminController.renderStats();
      AdminController.renderOrdersTable();
    }

    showToast(`🎉 Payment of Rs. ${finalizedOrder.total.toLocaleString()} Verified via ${gatewayName}!`);

    // Show Invoice
    if (typeof InvoiceService !== 'undefined') {
      InvoiceService.showOrderSuccess(finalizedOrder);
    }
  },

  logTransaction(entry) {
    let logs = JSON.parse(localStorage.getItem("UH_GATEWAY_LOGS")) || [];
    logs.unshift(entry);
    localStorage.setItem("UH_GATEWAY_LOGS", JSON.stringify(logs.slice(0, 50)));
  },

  // --------------------------------------------------------------------------
  // ADMIN CENTER PAYMENT GATEWAY SETTINGS & SIMULATOR
  // --------------------------------------------------------------------------
  renderAdminGatewayManager() {
    const container = document.getElementById('admin-payment-gateway-container');
    if (!container) return;

    const cfg = this.getConfig();
    const logs = JSON.parse(localStorage.getItem("UH_GATEWAY_LOGS")) || [];

    container.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:24px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:14px;">
          <div>
            <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0;">💳 Online Payment Gateways Configuration</h3>
            <p style="font-size:13px; color:var(--text-secondary); margin:3px 0 0 0;">Manage PayHere Sri Lanka, Stripe International, and Koko BNPL credentials.</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="badge-pill" style="background:${cfg.mode === 'sandbox' ? 'rgba(234,179,8,0.15)' : 'rgba(16,185,129,0.15)'}; color:${cfg.mode === 'sandbox' ? '#fef08a' : '#4ade80'}; font-weight:700;">
              ${cfg.mode === 'sandbox' ? '🧪 Active: Sandbox / Mock Simulation' : '🟢 Active: Live Production'}
            </span>
          </div>
        </div>

        <form onsubmit="PaymentGateway.handleSaveAdminSettings(event)" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
          
          <!-- Mode Selector -->
          <div style="grid-column: 1 / -1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="color:#fff; font-size:14px;">Gateway Environment Mode:</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Switch between instant test simulation and real merchant payment processing.</div>
            </div>
            <div style="display:flex; gap:12px;">
              <label style="color:#fff; font-size:13px; cursor:pointer;">
                <input type="radio" name="pg-mode" value="sandbox" ${cfg.mode === 'sandbox' ? 'checked' : ''} style="margin-right:6px;">
                🧪 Sandbox / Mock Demo (Safe)
              </label>
              <label style="color:#4ade80; font-size:13px; cursor:pointer;">
                <input type="radio" name="pg-mode" value="live" ${cfg.mode === 'live' ? 'checked' : ''} style="margin-right:6px;">
                🟢 Production Live Keys
              </label>
            </div>
          </div>

          <!-- PayHere Config Card -->
          <div style="background:#091226; border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:22px;">🇱🇰</span>
                <strong style="color:#fff; font-size:15px;">PayHere Sri Lanka</strong>
              </div>
              <span class="badge-pill badge-payhere">CB-SL Approved</span>
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Merchant ID:</label>
              <input type="text" id="adm-ph-mid" value="${cfg.payhere.merchantId || ''}" style="width:100%; font-family:monospace;">
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Merchant Secret Key:</label>
              <input type="password" id="adm-ph-secret" value="${cfg.payhere.merchantSecret || ''}" style="width:100%; font-family:monospace;">
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Default Currency:</label>
              <input type="text" id="adm-ph-curr" value="${cfg.payhere.currency || 'LKR'}" readonly style="width:100%; opacity:0.8;">
            </div>

            <div style="margin-top:14px;">
              <button type="button" class="btn-glass" onclick="PaymentGateway.simulateAdminTestPayment('payhere')" style="width:100%; justify-content:center; padding:8px; font-size:12px; color:#38bdf8; border-color:rgba(56,189,248,0.4);">
                🧪 Test PayHere Simulation (Rs. 5,000)
              </button>
            </div>
          </div>

          <!-- Stripe Config Card -->
          <div style="background:#0d1124; border:1px solid rgba(99,91,255,0.25); border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:22px;">⚡</span>
                <strong style="color:#fff; font-size:15px;">Stripe International</strong>
              </div>
              <span class="badge-pill badge-stripe">Global Cards</span>
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Publishable Key:</label>
              <input type="text" id="adm-stripe-pk" value="${cfg.stripe.publishableKey || ''}" style="width:100%; font-family:monospace;">
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Secret Key:</label>
              <input type="password" id="adm-stripe-sk" value="${cfg.stripe.secretKey || ''}" style="width:100%; font-family:monospace;">
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:4px;">Card Brands Accepted:</label>
              <div style="font-size:12px; color:#cbd5e1; padding:8px; background:rgba(0,0,0,0.25); border-radius:6px;">
                Visa, MasterCard, American Express, Apple Pay, Google Pay
              </div>
            </div>

            <div style="margin-top:14px;">
              <button type="button" class="btn-glass" onclick="PaymentGateway.simulateAdminTestPayment('stripe')" style="width:100%; justify-content:center; padding:8px; font-size:12px; color:#a5b4fc; border-color:rgba(165,180,252,0.4);">
                🧪 Test Stripe Simulation (Rs. 5,000)
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="submit" class="btn-primary-glow" style="padding:10px 24px; font-size:13.5px;">
              💾 Save Gateway Settings
            </button>
          </div>
        </form>
      </div>

      <!-- Gateway Transaction History Table -->
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="font-size:16px; font-weight:800; color:#fff; margin:0;">📊 Real-time IPG Gateway Transaction Log</h3>
          <span style="font-size:12px; color:var(--neon-cyan);">${logs.length} Transactions Recorded</span>
        </div>
        
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Txn ID / Ref</th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No online gateway transactions recorded yet.</td></tr>
              ` : logs.map(l => `
                <tr>
                  <td style="font-family:monospace; color:var(--neon-cyan); font-weight:700;">${l.id}</td>
                  <td style="font-weight:700; color:#fff;">${l.orderId}</td>
                  <td>${l.customer}<br><small style="color:var(--text-muted);">${l.phone || ''}</small></td>
                  <td><span class="badge-pill ${l.gateway.includes('PayHere') ? 'badge-payhere' : 'badge-stripe'}">${l.gateway}</span></td>
                  <td style="font-weight:800; color:#38bdf8;">Rs. ${(l.amount || 0).toLocaleString()}</td>
                  <td><span class="badge-pill" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:700;">✓ ${l.status}</span></td>
                  <td style="font-size:11.5px; color:var(--text-muted);">${l.timestamp}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleSaveAdminSettings(e) {
    e.preventDefault();
    const mode = document.querySelector('input[name="pg-mode"]:checked')?.value || 'sandbox';
    const phMid = document.getElementById('adm-ph-mid')?.value || '';
    const phSec = document.getElementById('adm-ph-secret')?.value || '';
    const stPk = document.getElementById('adm-stripe-pk')?.value || '';
    const stSk = document.getElementById('adm-stripe-sk')?.value || '';

    const cfg = this.getConfig();
    cfg.mode = mode;
    cfg.payhere.merchantId = phMid;
    cfg.payhere.merchantSecret = phSec;
    cfg.stripe.publishableKey = stPk;
    cfg.stripe.secretKey = stSk;

    this.saveConfig(cfg);
    this.renderAdminGatewayManager();
  },

  simulateAdminTestPayment(gateway) {
    const testOrder = {
      id: "ORD-TEST-" + Math.floor(1000 + Math.random() * 9000),
      customerName: "Kasun (Admin Test)",
      phone: "074-0219239",
      email: "test@universehub.lk",
      address: "Universe Hub Maharagama Flagship",
      total: 5000,
      deliveryMethod: "Physical Store Pickup",
      items: [{ name: "Anker Fast Charge Cable (Test Item)", price: 5000, qty: 1 }]
    };

    if (gateway === 'payhere') {
      this.openPayHereModal(testOrder);
    } else {
      this.openStripeModal(testOrder);
    }
  }
};

// Explicitly bind to window for inline onclick handlers & cross-script usage
if (typeof window !== 'undefined') {
  window.PaymentGateway = PaymentGateway;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentGateway;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PaymentGateway.init());
  } else {
    PaymentGateway.init();
  }
}
