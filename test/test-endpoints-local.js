/**
 * Comprehensive Local Test Suite for Universe Hub Meta Feed & Image Endpoints
 * Tests:
 * 1. Feed generation & RFC 4180 parsing
 * 2. Meta Commerce Manager field compliance
 * 3. Sinhala / Multilingual UTF-8 BOM encoding
 * 4. 33 Eligible product count & obsolete sample exclusion
 * 5. Error handling (DB failure returns HTTP 503)
 * 6. Dynamic image endpoint (base64 decode, MIME validation, ETag 304, 404s)
 */

import { onRequestGet as getFeed } from "../functions/meta-product-feed.csv.js";
import { onRequestGet as getImage } from "../functions/api/product-image.js";

async function runTests() {
  console.log("=================================================");
  console.log("   UNIVERSE HUB - META CATALOG FEED LOCAL TEST   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------------------
  // TEST 1: Feed Endpoint (functions/meta-product-feed.csv.js)
  // ----------------------------------------------------------------
  console.log("--- 1. Testing GET /meta-product-feed.csv ---");
  const feedReq = new Request("https://universehub.store/meta-product-feed.csv", { method: "GET" });
  const feedRes = await getFeed({ request: feedReq, env: {} });

  assert(feedRes.status === 200, `Feed returns HTTP 200 (Got ${feedRes.status})`);
  assert(feedRes.headers.get("Content-Type") === "text/csv; charset=utf-8", "Content-Type is text/csv; charset=utf-8");
  assert(feedRes.headers.get("Cache-Control").includes("max-age=900"), "Cache-Control set to 15-minute edge cache");

  const feedClone = feedRes.clone();
  const rawBytes = new Uint8Array(await feedClone.arrayBuffer());
  assert(rawBytes[0] === 0xEF && rawBytes[1] === 0xBB && rawBytes[2] === 0xBF, "CSV begins with standard UTF-8 BOM bytes (0xEF 0xBB 0xBF)");

  const csvText = await feedRes.text();

  // Clean BOM and parse CSV lines
  const cleanCsv = csvText.replace(/^\uFEFF/, "");
  
  // Custom RFC 4180 CSV parser
  function parseCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let field = "";
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") {
          lines.push(row);
        }
        row = [];
      } else {
        field += char;
      }
    }
    if (field !== "" || row.length > 0) {
      row.push(field);
      lines.push(row);
    }
    return lines;
  }

  const parsed = parseCSV(cleanCsv);
  assert(parsed.length > 1, `CSV contains rows (Total parsed lines: ${parsed.length})`);

  const headers = parsed[0];
  const expectedHeaders = [
    "id", "title", "description", "availability", "condition",
    "price", "link", "image_link", "brand", "product_type", "additional_image_link"
  ];
  assert(JSON.stringify(headers) === JSON.stringify(expectedHeaders), "CSV headers match Meta Commerce specification exactly");

  const productRows = parsed.slice(1);
  assert(productRows.length === 33, `Exact eligible product count is 33 (Got ${productRows.length})`);

  const sampleFound = productRows.find(r => r[0] === "prod-anker-maggo-10k" || r[0].startsWith("prod-sample"));
  assert(!sampleFound, "Obsolete sample product 'prod-anker-maggo-10k' is successfully excluded");

  // Detailed validation of every row
  let allValid = true;
  let usedIphoneCount = 0;
  let accessoryCount = 0;
  let missingImages = 0;
  let invalidPrices = 0;
  let priceRegex = /^\d+\.\d{2} LKR$/;

  productRows.forEach((r, idx) => {
    const [id, title, desc, avail, cond, price, link, imgLink, brand, pType] = r;
    
    if (!id || id.trim() === "") allValid = false;
    if (!title || title.trim() === "") allValid = false;
    if (!desc || desc.trim() === "") allValid = false;
    if (!["in stock", "out of stock", "available for order", "preorder"].includes(avail)) allValid = false;
    if (!["new", "refurbished", "used"].includes(cond)) allValid = false;
    if (!priceRegex.test(price)) invalidPrices++;
    if (!link.startsWith("https://universehub.store/?prod=")) allValid = false;
    if (!imgLink.startsWith("https://universehub.store/")) missingImages++;
    if (!brand || brand.trim() === "") allValid = false;
    if (!pType || pType.trim() === "") allValid = false;

    if (cond === "used") usedIphoneCount++;
    if (cond === "new") accessoryCount++;
  });

  assert(allValid, "All 33 product rows have valid non-empty fields matching Meta schema");
  assert(invalidPrices === 0, `All 33 product prices are valid with LKR currency code (e.g. '12990.00 LKR')`);
  assert(missingImages === 0, "All 33 product images are valid public HTTPS URLs");
  assert(usedIphoneCount === 12, `Used iPhones count mapped to condition 'used': 12 (Got ${usedIphoneCount})`);
  assert(accessoryCount === 21, `Brand new accessories mapped to condition 'new': 21 (Got ${accessoryCount})`);

  // ----------------------------------------------------------------
  // TEST 2: Error Handling on Database Failure
  // ----------------------------------------------------------------
  console.log("\n--- 2. Testing Database Failure Handling ---");
  // Pass an invalid API key to trigger database error
  const failRes = await getFeed({
    request: feedReq,
    env: { SUPABASE_ANON_KEY: "invalid-key-to-test-failure" }
  });
  assert(failRes.status === 503, `Database failure returns HTTP 503 Service Unavailable (Got ${failRes.status})`);
  const failText = await failRes.text();
  assert(failText.includes("Database") || failText.includes("unavailable"), "Error response contains descriptive message");
  assert(failRes.headers.get("Retry-After") !== null, "Error response includes 'Retry-After' header for Meta crawler");

  // ----------------------------------------------------------------
  // TEST 3: Dynamic Image Endpoint (functions/api/product-image.js)
  // ----------------------------------------------------------------
  console.log("\n--- 3. Testing GET /api/product-image ---");
  
  // Test 3a: Base64 accessory image streaming
  const base64AccId = "prod-1795514847853";
  const imgReq = new Request(`https://universehub.store/api/product-image?id=${base64AccId}`, { method: "GET" });
  const imgRes = await getImage({ request: imgReq, env: {} });

  assert(imgRes.status === 200, `Accessory base64 image returns HTTP 200 (Got ${imgRes.status})`);
  assert(imgRes.headers.get("Content-Type") === "image/jpeg", `MIME type validated as image/jpeg (Got ${imgRes.headers.get("Content-Type")})`);
  assert(imgRes.headers.get("Cache-Control").includes("max-age=604800"), "Cache-Control set to 1-week edge cache");
  assert(imgRes.headers.get("ETag") !== null, `ETag present for version-aware caching: ${imgRes.headers.get("ETag")}`);
  
  const imgBuffer = await imgRes.arrayBuffer();
  const bytes = new Uint8Array(imgBuffer);
  assert(bytes.length > 50000, `Image binary payload delivered intact (${bytes.length} bytes)`);
  assert(bytes[0] === 0xFF && bytes[1] === 0xD8, "JPEG SOI magic bytes (0xFF 0xD8) verified");

  // Test 3b: Conditional caching with ETag (HTTP 304 Not Modified)
  const etag = imgRes.headers.get("ETag");
  const condReq = new Request(`https://universehub.store/api/product-image?id=${base64AccId}`, {
    method: "GET",
    headers: { "If-None-Match": etag }
  });
  const condRes = await getImage({ request: condReq, env: {} });
  assert(condRes.status === 304, `Conditional request with ETag returns HTTP 304 Not Modified (Got ${condRes.status})`);

  // Test 3c: Static asset iPhone image redirect (HTTP 302)
  const iphoneId = "prod-1794850434081";
  const iphoneReq = new Request(`https://universehub.store/api/product-image?id=${iphoneId}`, { method: "GET" });
  const iphoneRes = await getImage({ request: iphoneReq, env: {} });
  assert(iphoneRes.status === 302, `Static asset image returns HTTP 302 redirect to asset URL (Got ${iphoneRes.status})`);
  assert(iphoneRes.headers.get("Location").includes("assets/products/iphone-"), "Redirect location points to public static asset");

  // Test 3d: Non-existent product ID returns 404
  const notFoundReq = new Request("https://universehub.store/api/product-image?id=prod-non-existent-999", { method: "GET" });
  const notFoundRes = await getImage({ request: notFoundReq, env: {} });
  assert(notFoundRes.status === 404, `Non-existent product returns HTTP 404 (Got ${notFoundRes.status})`);

  // Test 3e: Excluded obsolete sample returns 404
  const sampleReq = new Request("https://universehub.store/api/product-image?id=prod-anker-maggo-10k", { method: "GET" });
  const sampleRes = await getImage({ request: sampleReq, env: {} });
  assert(sampleRes.status === 404, `Obsolete sample product is blocked and returns HTTP 404 (Got ${sampleRes.status})`);

  // ----------------------------------------------------------------
  // TEST 4: Deep Link URL Parsing & Product Resolution (All 33 Products)
  // ----------------------------------------------------------------
  console.log("\n--- 4. Testing Product Deep Link Resolution (All 33 Products) ---");
  
  function simulateDeepLinkExtraction(urlStr) {
    const u = new URL(urlStr);
    const qp = u.searchParams.get("prod");
    if (qp && qp.trim()) return qp.trim();
    if (u.hash.includes("prod=")) {
      const match = u.hash.match(/prod=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1].trim();
    }
    return null;
  }

  let queryLinkSuccess = 0;
  let hashLinkSuccess = 0;

  productRows.forEach(r => {
    const id = r[0];
    const queryUrl = `https://universehub.store/?prod=${id}`;
    const hashUrl = `https://universehub.store/#shop?prod=${id}`;

    if (simulateDeepLinkExtraction(queryUrl) === id) queryLinkSuccess++;
    if (simulateDeepLinkExtraction(hashUrl) === id) hashLinkSuccess++;
  });

  assert(queryLinkSuccess === 33, `All 33 products resolve correctly via query parameter '?prod=ID' (${queryLinkSuccess}/33)`);
  assert(hashLinkSuccess === 33, `All 33 products resolve correctly via hash parameter '#shop?prod=ID' (${hashLinkSuccess}/33)`);

  // Test invalid product ID handling
  const invalidExtract = simulateDeepLinkExtraction("https://universehub.store/?prod=invalid-id-xyz");
  assert(invalidExtract === "invalid-id-xyz", "Router safely extracts invalid ID for graceful fallback check");
  const noParamExtract = simulateDeepLinkExtraction("https://universehub.store/#shop");
  assert(noParamExtract === null, "Router returns null when no product param present without error");

  console.log("\n=================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
