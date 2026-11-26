/**
 * Cloudflare Pages Function: Meta Commerce Manager CSV Product Feed
 * Route: GET /meta-product-feed.csv
 * 
 * Generates an automated, RFC 4180-compliant, UTF-8 encoded product catalogue data feed
 * for Universe Hub. Dynamically adapts to the active request origin (Preview vs Production).
 */

const SUPABASE_URL = "https://mukctesllfgdgvkttjkb.supabase.co/rest/v1/products?select=*&order=created_at.desc";
const DEFAULT_ANON_KEY = "sb_publishable_f20oiNxVRdSdz7FhICoWlg_8PEoqOVS";

// Taxonomy map for Google / Meta product types
const CATEGORY_TAXONOMY_MAP = {
  "used-iphones": "Electronics > Mobile Phones > Certified Used iPhones",
  "brand-new-iphones": "Electronics > Mobile Phones > Brand New iPhones",
  "cables": "Electronics > Mobile Phone Accessories > Charging Cables",
  "chargers": "Electronics > Mobile Phone Accessories > Fast Chargers & GaN",
  "power-banks": "Electronics > Mobile Phone Accessories > Power Banks & MagSafe Battery",
  "audio": "Electronics > Audio > Headphones & Earphones",
  "cases": "Electronics > Mobile Phone Accessories > Cases & Screen Protectors",
  "tempered-glass": "Electronics > Mobile Phone Accessories > Screen Protectors",
  "camera-lens": "Electronics > Mobile Phone Accessories > Camera Lens Protectors"
};

/**
 * Escapes a field according to RFC 4180 CSV specifications.
 */
function escapeCsvField(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Determines product availability per Meta Commerce guidelines.
 * Allowed values: 'in stock', 'out of stock', 'available for order', 'preorder'
 */
function getAvailability(p) {
  const stock = Number(p.stock);
  const stockStatus = p.specs && typeof p.specs === "object" ? String(p.specs.stockStatus || "").toLowerCase() : "";

  if (stockStatus === "out-of-stock" || (!isNaN(stock) && stock <= 0)) {
    return "out of stock";
  }
  if (stockStatus === "on-request") {
    return "available for order";
  }
  if (stockStatus === "preorder") {
    return "preorder";
  }
  return "in stock";
}

/**
 * Determines product condition per Meta Commerce guidelines.
 * Allowed values: 'new', 'refurbished', 'used'
 */
function getCondition(p) {
  const cat = String(p.category || "").toLowerCase();
  const specCond = p.specs && typeof p.specs === "object" ? String(p.specs.condition || "").toLowerCase() : "";
  const badge = String(p.badge || "").toLowerCase();

  if (cat.includes("used") || specCond.includes("used") || specCond.includes("grade") || badge.includes("used")) {
    return "used";
  }
  if (specCond.includes("refurbish") || badge.includes("refurbish")) {
    return "refurbished";
  }
  return "new";
}

/**
 * Formats image URLs into public HTTPS URLs suitable for Meta.
 * Uses the dynamic baseUrl of the active deployment (Preview or Production).
 */
function formatImageUrl(imageStr, productId, version, baseUrl, idx = null) {
  if (!imageStr || typeof imageStr !== "string") {
    return `${baseUrl}/api/product-image?id=${encodeURIComponent(productId)}${version ? `&v=${encodeURIComponent(version)}` : ""}`;
  }
  if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
    return imageStr;
  }
  if (imageStr.startsWith("assets/") || imageStr.startsWith("/assets/")) {
    return `${baseUrl}/${imageStr.replace(/^\//, "")}`;
  }
  // Base64 Data URI -> route through version-aware dynamic image streaming endpoint
  const idxParam = idx !== null ? `&idx=${idx}` : "";
  const vParam = version ? `&v=${encodeURIComponent(version)}` : "";
  return `${baseUrl}/api/product-image?id=${encodeURIComponent(productId)}${idxParam}${vParam}`;
}

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const baseUrl = reqUrl.origin; // Dynamically binds to current preview or production domain

    const apiKey = (context.env && context.env.SUPABASE_ANON_KEY) ? context.env.SUPABASE_ANON_KEY : DEFAULT_ANON_KEY;

    // Fetch live products with strict read-only operation
    const response = await fetch(SUPABASE_URL, {
      method: "GET",
      headers: {
        "apikey": apiKey,
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      // Return temporary error response, NEVER return an empty feed with 200 OK
      return new Response("Database service temporarily unavailable. Please retry later.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "300"
        }
      });
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      return new Response("No published catalog products available.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "120"
        }
      });
    }

    // Filter genuine eligible products (exclude obsolete samples and malformed records)
    const eligibleProducts = products.filter(p => {
      if (!p || !p.id || !p.title) return false;
      const id = String(p.id).trim();
      if (id === "prod-anker-maggo-10k") return false;
      if (id.startsWith("prod-sample")) return false;
      const numPrice = Number(p.price);
      if (isNaN(numPrice) || numPrice <= 0) return false;
      return true;
    });

    if (eligibleProducts.length === 0) {
      return new Response("Catalog contains no eligible products.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "120"
        }
      });
    }

    // Headers required by Meta Commerce Manager
    const csvHeaders = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand",
      "product_type",
      "additional_image_link"
    ];

    const rows = eligibleProducts.map(p => {
      const id = String(p.id).trim();
      const title = String(p.title).trim();

      // Clean description
      let description = (p.description || "").replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      if (!description) description = title;

      const availability = getAvailability(p);
      const condition = getCondition(p);
      const price = `${Number(p.price).toFixed(2)} LKR`;
      // Standard query-parameter product deep link for full crawler & mobile landing page compatibility
      const link = `${baseUrl}/?prod=${encodeURIComponent(id)}`;

      const version = p.updated_at || p.created_at || "1";
      const image_link = formatImageUrl(p.image, id, version, baseUrl);

      // Brand mapping
      let brand = (p.brand || "").trim();
      if (!brand) {
        if (p.category === "used-iphones" || title.toLowerCase().includes("iphone")) {
          brand = "Apple";
        } else {
          brand = "Universe Hub";
        }
      }

      // Product taxonomy breadcrumb
      const product_type = CATEGORY_TAXONOMY_MAP[p.category] || `Electronics > Mobile Phone Accessories > ${p.category || "General"}`;

      // Additional images handling
      let additional_image_link = "";
      if (Array.isArray(p.images) && p.images.length > 0) {
        const extraUrls = p.images
          .filter(img => img && typeof img === "string" && img.trim().length > 0)
          .map((img, idx) => formatImageUrl(img, id, version, baseUrl, idx));
        additional_image_link = extraUrls.join(",");
      }

      return [
        escapeCsvField(id),
        escapeCsvField(title),
        escapeCsvField(description),
        escapeCsvField(availability),
        escapeCsvField(condition),
        escapeCsvField(price),
        escapeCsvField(link),
        escapeCsvField(image_link),
        escapeCsvField(brand),
        escapeCsvField(product_type),
        escapeCsvField(additional_image_link)
      ].join(",");
    });

    // Prepend UTF-8 BOM (\uFEFF) for universal multilingual UTF-8 compatibility
    const csvContent = "\uFEFF" + [csvHeaders.join(","), ...rows].join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=900, s-maxage=900", // 15-min cache
        "Access-Control-Allow-Origin": "*",
        "X-Product-Count": String(eligibleProducts.length)
      }
    });

  } catch (err) {
    return new Response(`Error generating catalog feed: ${err.message}`, {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "300"
      }
    });
  }
}

// Export onRequest to handle both GET and HEAD requests natively
export const onRequest = onRequestGet;
export const onRequestHead = onRequestGet;
