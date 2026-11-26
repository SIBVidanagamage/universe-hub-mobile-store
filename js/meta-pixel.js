/**
 * Universe Hub - Meta Pixel Integration & Cookie Consent Engine
 * Pixel ID: 3017553705263511
 * Dataset: Universe Hub Website
 * 
 * Strict Privacy & Architectural Guarantees:
 * 1. Zero tracking before explicit customer consent (marketing consent = 'granted').
 * 2. Strict Hostname Isolation: Real tracking only on 'universehub.store'.
 *    Localhost & Cloudflare Preview environments run mock event dispatcher with debug logs.
 * 3. Route Allowlist: Zero tracking on Admin Panel (#admin), Auth, Repair Tracking, or private pages.
 * 4. Zero PII transmission: No customer names, phones, emails, or delivery addresses.
 * 5. Full Meta Catalog matching with https://universehub.store/meta-product-feed.csv.
 */

const MetaPixel = {
  PIXEL_ID: '3017553705263511',
  PROD_HOSTNAME: 'universehub.store',
  CONSENT_KEY: 'UH_MARKETING_CONSENT',
  CURRENCY: 'LKR',

  isLoaded: false,
  isMock: false,
  lastTrackedRoute: null,
  debugLogs: [],

  // --------------------------------------------------------------------------
  // INITIALIZATION & ENVIRONMENT DETECTION
  // --------------------------------------------------------------------------
  init() {
    if (this.isLoaded) return;

    const consent = this.getConsent();
    if (consent !== 'granted') {
      return;
    }

    if (this.isProduction()) {
      this.injectOfficialBaseCode();
    } else {
      this.injectMockDispatcher();
    }

    this.isLoaded = true;
  },

  isProduction() {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === this.PROD_HOSTNAME;
  },

  injectOfficialBaseCode() {
    if (window.fbq) return;

    /* eslint-disable */
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    // Initialize Pixel without Automatic Advanced Matching
    window.fbq('init', this.PIXEL_ID);
  },

  injectMockDispatcher() {
    this.isMock = true;
    if (!window.fbq) {
      window.fbq = (...args) => {
        this.debugLogs.push({ timestamp: new Date().toISOString(), args });
        if (typeof console !== 'undefined' && console.log) {
          console.log('[Meta Pixel Mock / Dev Isolation]', ...args);
        }
      };
      window.fbq.loaded = true;
      window.fbq.version = '2.0-mock';
    }
  },

  // --------------------------------------------------------------------------
  // CONSENT MANAGEMENT
  // --------------------------------------------------------------------------
  getConsent() {
    try {
      return localStorage.getItem(this.CONSENT_KEY);
    } catch (e) {
      return null;
    }
  },

  hasConsent() {
    return this.getConsent() === 'granted';
  },

  acceptConsent() {
    try {
      localStorage.setItem(this.CONSENT_KEY, 'granted');
    } catch (e) {}

    this.hideBanner();
    this.init();

    // Trigger initial PageView for the active storefront view
    this.trackPageView(window.location.hash || '#home');

    if (typeof showToast === 'function') {
      showToast('✓ Cookie preferences saved: Marketing & Analytics enabled');
    }
  },

  declineConsent() {
    try {
      localStorage.setItem(this.CONSENT_KEY, 'denied');
    } catch (e) {}

    this.hideBanner();

    // Revoke any active session consent with Meta
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('consent', 'revoke');
      } catch (e) {}
    }

    this.isLoaded = false;

    if (typeof showToast === 'function') {
      showToast('✓ Cookie preferences saved: Necessary cookies only');
    }
  },

  revokeConsent() {
    this.declineConsent();
    this.closePreferencesModal();
  },

  checkConsentOnLoad() {
    const consent = this.getConsent();
    if (consent === 'granted') {
      this.init();
    } else if (consent === null) {
      // Delay banner display slightly for smooth page load
      setTimeout(() => {
        this.showBanner();
      }, 700);
    }
  },

  showBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.add('active');
    }
  },

  hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.remove('active');
    }
  },

  openPreferencesModal() {
    const modal = document.getElementById('cookie-preferences-modal');
    if (modal) {
      modal.classList.add('active');
      this.updatePreferencesUI();
    }
  },

  closePreferencesModal() {
    const modal = document.getElementById('cookie-preferences-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  updatePreferencesUI() {
    const statusText = document.getElementById('cookie-status-text');
    const consent = this.getConsent();
    if (statusText) {
      if (consent === 'granted') {
        statusText.innerHTML = '<span style="color:#10b981; font-weight:700;">● Active (Marketing & Analytics Enabled)</span>';
      } else if (consent === 'denied') {
        statusText.innerHTML = '<span style="color:#ef4444; font-weight:700;">● Inactive (Necessary Cookies Only)</span>';
      } else {
        statusText.innerHTML = '<span style="color:var(--text-muted); font-weight:700;">● Not Set (Pending Consent)</span>';
      }
    }
  },

  // --------------------------------------------------------------------------
  // ROUTE ALLOWLIST & SENSITIVE DATA DEFENSE
  // --------------------------------------------------------------------------
  isStorefrontRoute(route) {
    const r = (route || (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase();

    // Strict Blacklist for Admin Panel, Auth modals, and Repair Trackers
    if (r.includes('admin') || r.includes('customer-auth') || r.includes('repair-tracker')) {
      return false;
    }

    // Check for query parameters that could hold sensitive tokens or phone numbers
    if (typeof window !== 'undefined' && window.location.search) {
      const q = window.location.search.toLowerCase();
      if (q.includes('pin=') || q.includes('phone=') || q.includes('token=') || q.includes('order=')) {
        return false;
      }
    }

    return true;
  },

  // --------------------------------------------------------------------------
  // EVENT TRACKING DISPATCHERS
  // --------------------------------------------------------------------------

  /**
   * PageView Event
   * Triggered on initial load and SPA navigation across public storefront routes.
   * Deduplicated to prevent repeating the same route consecutively.
   */
  trackPageView(route) {
    if (!this.hasConsent()) return;
    if (!this.isStorefrontRoute(route)) return;

    const currentRoute = route || (typeof window !== 'undefined' ? window.location.hash || '#home' : '#home');
    if (this.lastTrackedRoute === currentRoute) {
      return; // Prevent duplicate PageView
    }
    this.lastTrackedRoute = currentRoute;

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  },

  /**
   * ViewContent Event
   * Triggered when customer opens product QuickView modal.
   * Content ID strictly matches Meta Commerce Manager catalog feed.
   */
  trackViewContent(product) {
    if (!this.hasConsent()) return;
    if (!this.isStorefrontRoute()) return;
    if (!product || !product.id) return;

    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;

    const payload = {
      content_ids: [String(product.id)],
      content_name: product.name || '',
      content_type: 'product',
      value: Number(price.toFixed(2)),
      currency: this.CURRENCY
    };

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', payload);
    }
  },

  /**
   * AddToCart Event
   * Triggered when customer successfully adds an item to cart.
   * Quantities and item values match catalog specification.
   */
  trackAddToCart(product, qty) {
    if (!this.hasConsent()) return;
    if (!this.isStorefrontRoute()) return;
    if (!product || !product.id) return;

    const quantity = parseInt(qty, 10) || 1;
    const unitPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
    const totalVal = unitPrice * quantity;

    const payload = {
      content_ids: [String(product.id)],
      content_name: product.name || '',
      content_type: 'product',
      contents: [{
        id: String(product.id),
        quantity: quantity,
        item_price: Number(unitPrice.toFixed(2))
      }],
      value: Number(totalVal.toFixed(2)),
      currency: this.CURRENCY
    };

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', payload);
    }
  },

  /**
   * InitiateCheckout Event
   * Triggered when customer opens checkout modal with active cart items.
   * Contains all product IDs in cart and subtotal.
   * NOTE: Does NOT track customer PII (names, phones, emails).
   */
  trackInitiateCheckout(cartItems, subtotal) {
    if (!this.hasConsent()) return;
    if (!this.isStorefrontRoute()) return;
    if (!Array.isArray(cartItems) || cartItems.length === 0) return;

    const contentIds = cartItems.map(i => String(i.id));
    const contents = cartItems.map(i => ({
      id: String(i.id),
      quantity: Number(i.qty) || 1,
      item_price: Number(i.price) || 0
    }));

    const calculatedTotal = subtotal || cartItems.reduce((acc, i) => acc + (Number(i.price) * (Number(i.qty) || 1)), 0);

    const payload = {
      content_ids: contentIds,
      content_type: 'product',
      contents: contents,
      num_items: cartItems.length,
      value: Number(Number(calculatedTotal).toFixed(2)),
      currency: this.CURRENCY
    };

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', payload);
    }
  }
};

// Bind to window for global access
if (typeof window !== 'undefined') {
  window.MetaPixel = MetaPixel;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MetaPixel.checkConsentOnLoad());
  } else {
    MetaPixel.checkConsentOnLoad();
  }
}

// Support Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetaPixel;
}
