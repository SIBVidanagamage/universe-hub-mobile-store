/**
 * Universe Hub - Meta Pixel Integration Automated Test Suite
 * Tests:
 * 1. Consent State Transitions (First visit, Accept, Decline, Revoke, Persistence)
 * 2. Environment Isolation (Mock/Debug in non-production, Zero tracking before consent)
 * 3. Route Allowlist & Privacy Protection (Admin Panel, Auth, Sensitive query params)
 * 4. Event Tracking Payloads (PageView, ViewContent, AddToCart, InitiateCheckout)
 * 5. Meta Catalog ID Matching (33 genuine products against CSV feed)
 * 6. LKR Currency & Numerical Value Assertions
 * 7. Zero Search / Purchase Event Verification
 * 8. Zero PII Verification
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Mock localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();
global.window = {
  location: {
    hostname: 'localhost',
    hash: '#home',
    search: ''
  }
};
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: (id) => ({
    classList: {
      add: () => {},
      remove: () => {}
    },
    innerHTML: ''
  })
};

// Import MetaPixel engine
const metaPixelPath = path.resolve('js/meta-pixel.js');
const MetaPixel = (await import('file://' + metaPixelPath)).default;

let passedTests = 0;
let totalTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${desc}`);
    console.error(err);
  }
}

async function runAllTests() {
  console.log('=================================================');
  console.log('    UNIVERSE HUB - META PIXEL VERIFICATION TEST   ');
  console.log('=================================================\n');

  // --- 1. Consent Management Tests ---
  console.log('--- 1. Testing Consent Management & Privacy Guard ---');

  await it('First visit has no consent by default', () => {
    localStorage.clear();
    assert.strictEqual(MetaPixel.getConsent(), null);
    assert.strictEqual(MetaPixel.hasConsent(), false);
  });

  await it('Dispatches zero events when consent is not granted', () => {
    localStorage.clear();
    MetaPixel.debugLogs = [];
    window.fbq = undefined;
    MetaPixel.isLoaded = false;
    
    MetaPixel.trackPageView('#home');
    MetaPixel.trackViewContent({ id: 'prod-1795527989698', name: 'Nexode 4-Port GaN', price: 12990 });
    MetaPixel.trackAddToCart({ id: 'prod-1795527989698', name: 'Nexode 4-Port GaN', price: 12990 }, 1);
    MetaPixel.trackInitiateCheckout([{ id: 'prod-1795527989698', price: 12990, qty: 1 }], 12990);

    assert.strictEqual(MetaPixel.debugLogs.length, 0);
    assert.strictEqual(window.fbq, undefined);
  });

  await it('Accept Marketing enables tracking and sets localStorage', () => {
    localStorage.clear();
    MetaPixel.acceptConsent();
    assert.strictEqual(localStorage.getItem('UH_MARKETING_CONSENT'), 'granted');
    assert.strictEqual(MetaPixel.hasConsent(), true);
    assert.strictEqual(MetaPixel.isLoaded, true);
  });

  await it('Decline Consent (Necessary Only) disables tracking and sets localStorage', () => {
    localStorage.clear();
    MetaPixel.declineConsent();
    assert.strictEqual(localStorage.getItem('UH_MARKETING_CONSENT'), 'denied');
    assert.strictEqual(MetaPixel.hasConsent(), false);
    assert.strictEqual(MetaPixel.isLoaded, false);
  });

  await it('Revoke Consent calls fbq("consent", "revoke") and blocks subsequent events', () => {
    // First grant
    MetaPixel.acceptConsent();
    assert.strictEqual(MetaPixel.hasConsent(), true);
    
    // Then revoke
    MetaPixel.debugLogs = [];
    MetaPixel.revokeConsent();
    assert.strictEqual(MetaPixel.hasConsent(), false);
    assert.strictEqual(localStorage.getItem('UH_MARKETING_CONSENT'), 'denied');

    // Verify revoke call was sent
    const revokeCall = MetaPixel.debugLogs.find(l => l.args[0] === 'consent' && l.args[1] === 'revoke');
    assert.ok(revokeCall, 'fbq("consent", "revoke") must be dispatched');

    // Try to fire an event after revoke
    const logCountBefore = MetaPixel.debugLogs.length;
    MetaPixel.trackViewContent({ id: 'prod-1795527989698', name: 'Nexode 4-Port GaN', price: 12990 });
    assert.strictEqual(MetaPixel.debugLogs.length, logCountBefore, 'No event should be tracked after revocation');
  });

  // --- 2. Environment Isolation Tests ---
  console.log('\n--- 2. Testing Environment & Hostname Isolation ---');

  await it('Non-production hostnames (localhost, preview) run in Mock mode', () => {
    window.location.hostname = 'localhost';
    assert.strictEqual(MetaPixel.isProduction(), false);
    
    window.location.hostname = 'universe-hub-preview.workers.dev';
    assert.strictEqual(MetaPixel.isProduction(), false);
  });

  await it('Production hostname (universehub.store) correctly detected', () => {
    window.location.hostname = 'universehub.store';
    assert.strictEqual(MetaPixel.isProduction(), true);
    // Reset back to localhost
    window.location.hostname = 'localhost';
  });

  await it('In Mock mode, events are captured in debugLogs without sending to Meta', () => {
    MetaPixel.acceptConsent();
    MetaPixel.debugLogs = [];
    MetaPixel.lastTrackedRoute = null;
    
    MetaPixel.trackPageView('#home');
    assert.strictEqual(MetaPixel.debugLogs.length, 1);
    assert.strictEqual(MetaPixel.debugLogs[0].args[0], 'track');
    assert.strictEqual(MetaPixel.debugLogs[0].args[1], 'PageView');
  });

  // --- 3. Route Allowlist & Security Guard ---
  console.log('\n--- 3. Testing Route Allowlist & Privacy Protection ---');

  await it('Allows tracking on public storefront routes', () => {
    assert.strictEqual(MetaPixel.isStorefrontRoute(''), true);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#home'), true);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#shop'), true);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#shop?cat=chargers'), true);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#about'), true);
  });

  await it('Blocks tracking completely on #admin route', () => {
    assert.strictEqual(MetaPixel.isStorefrontRoute('#admin'), false);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#admin/orders'), false);
    
    MetaPixel.debugLogs = [];
    MetaPixel.trackPageView('#admin');
    assert.strictEqual(MetaPixel.debugLogs.length, 0, 'No PageView event should fire on #admin');
  });

  await it('Blocks tracking on customer auth and repair tracking pages', () => {
    assert.strictEqual(MetaPixel.isStorefrontRoute('#customer-auth-modal'), false);
    assert.strictEqual(MetaPixel.isStorefrontRoute('#repair-tracker'), false);
  });

  await it('Blocks tracking if sensitive URL parameters are detected (PIN, Phone, Token)', () => {
    window.location.search = '?pin=1234';
    assert.strictEqual(MetaPixel.isStorefrontRoute('#home'), false);
    
    window.location.search = '?phone=0740219239';
    assert.strictEqual(MetaPixel.isStorefrontRoute('#home'), false);

    window.location.search = '?token=sec_abc123';
    assert.strictEqual(MetaPixel.isStorefrontRoute('#home'), false);
    
    // Clean query string
    window.location.search = '';
    assert.strictEqual(MetaPixel.isStorefrontRoute('#home'), true);
  });

  // --- 4. Event Tracking Payloads & Catalog Matching ---
  console.log('\n--- 4. Testing Event Tracking Payloads & Catalogue Matching ---');

  await it('PageView deduplicates consecutive identical routes', () => {
    MetaPixel.acceptConsent();
    MetaPixel.debugLogs = [];
    MetaPixel.lastTrackedRoute = null;

    MetaPixel.trackPageView('#shop');
    MetaPixel.trackPageView('#shop'); // Duplicate
    MetaPixel.trackPageView('#shop'); // Duplicate
    
    assert.strictEqual(MetaPixel.debugLogs.length, 1, 'Duplicate consecutive PageView calls must be ignored');
    
    MetaPixel.trackPageView('#about'); // Different route
    assert.strictEqual(MetaPixel.debugLogs.length, 2, 'New route should trigger PageView');
  });

  await it('ViewContent payload has accurate Catalog ID, LKR currency, and numerical price', () => {
    MetaPixel.debugLogs = [];
    const testProduct = {
      id: 'prod-1795527989698',
      name: 'Nexode 4-Port PD GaN Fast Charger',
      price: 12990
    };

    MetaPixel.trackViewContent(testProduct);
    assert.strictEqual(MetaPixel.debugLogs.length, 1);
    
    const [method, event, payload] = MetaPixel.debugLogs[0].args;
    assert.strictEqual(method, 'track');
    assert.strictEqual(event, 'ViewContent');
    assert.deepStrictEqual(payload.content_ids, ['prod-1795527989698']);
    assert.strictEqual(payload.content_type, 'product');
    assert.strictEqual(payload.currency, 'LKR');
    assert.strictEqual(payload.value, 12990);
  });

  await it('AddToCart payload includes content_ids, quantity, item_price, and total value', () => {
    MetaPixel.debugLogs = [];
    const testProduct = {
      id: 'prod-1794850800664',
      name: 'iPhone 15',
      price: 165000
    };

    MetaPixel.trackAddToCart(testProduct, 2);
    assert.strictEqual(MetaPixel.debugLogs.length, 1);

    const [method, event, payload] = MetaPixel.debugLogs[0].args;
    assert.strictEqual(method, 'track');
    assert.strictEqual(event, 'AddToCart');
    assert.deepStrictEqual(payload.content_ids, ['prod-1794850800664']);
    assert.strictEqual(payload.content_type, 'product');
    assert.strictEqual(payload.currency, 'LKR');
    assert.strictEqual(payload.value, 330000); // 165,000 * 2
    assert.strictEqual(payload.contents[0].quantity, 2);
    assert.strictEqual(payload.contents[0].item_price, 165000);
  });

  await it('InitiateCheckout payload aggregates all cart items without PII', () => {
    MetaPixel.debugLogs = [];
    const cartItems = [
      { id: 'prod-1795527989698', name: 'Nexode 4-Port GaN', price: 12990, qty: 1 },
      { id: 'prod-1795518394446', name: '3-in-1 Universal Cable', price: 5490, qty: 2 }
    ];
    const subtotal = 12990 + (5490 * 2); // 23,970

    MetaPixel.trackInitiateCheckout(cartItems, subtotal);
    assert.strictEqual(MetaPixel.debugLogs.length, 1);

    const [method, event, payload] = MetaPixel.debugLogs[0].args;
    assert.strictEqual(method, 'track');
    assert.strictEqual(event, 'InitiateCheckout');
    assert.deepStrictEqual(payload.content_ids, ['prod-1795527989698', 'prod-1795518394446']);
    assert.strictEqual(payload.content_type, 'product');
    assert.strictEqual(payload.num_items, 2);
    assert.strictEqual(payload.value, 23970);
    assert.strictEqual(payload.currency, 'LKR');

    // Verify zero PII
    assert.strictEqual(payload.customer_name, undefined);
    assert.strictEqual(payload.phone, undefined);
    assert.strictEqual(payload.email, undefined);
    assert.strictEqual(payload.address, undefined);
  });

  await it('Search and Purchase events are NOT implemented in MetaPixel engine', () => {
    assert.strictEqual(MetaPixel.trackSearch, undefined, 'Search event must not be implemented');
    assert.strictEqual(MetaPixel.trackPurchase, undefined, 'Purchase event must not be implemented');
  });

  // --- 5. Verify Content ID Matching against Meta CSV Feed ---
  console.log('\n--- 5. Testing Catalog Content ID Matching against Meta Feed ---');

  await it('All 33 genuine products in Meta catalog match valid format for ViewContent', async () => {
    // Read existing meta-product-feed function to extract genuine products
    const feedModulePath = path.resolve('functions/meta-product-feed.csv.js');
    const feedModule = await import('file://' + feedModulePath);
    const response = await feedModule.onRequestGet({
      request: new Request('https://universehub.store/meta-product-feed.csv')
    });
    const feedContent = await response.text();
    
    const lines = feedContent.trim().split('\n');
    assert.strictEqual(lines.length, 34, 'Expected header + 33 products');
    
    const header = lines[0].replace(/^\uFEFF/, '').split(',');
    const idColIdx = header.indexOf('id');
    assert.ok(idColIdx >= 0, 'Header must have id column');

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const match = row.match(/^(prod-[a-zA-Z0-9_-]+)/);
      assert.ok(match, `Row ${i} must have valid product ID`);
      const prodId = match[1];

      // Simulate ViewContent for this ID
      MetaPixel.debugLogs = [];
      MetaPixel.trackViewContent({ id: prodId, name: 'Item ' + i, price: 1000 });
      assert.strictEqual(MetaPixel.debugLogs.length, 1);
      assert.strictEqual(MetaPixel.debugLogs[0].args[2].content_ids[0], prodId);
    }
  });

  console.log('\n=================================================');
  console.log(`TEST RUN COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log('=================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

await runAllTests();

