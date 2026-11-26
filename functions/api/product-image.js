/**
 * Cloudflare Pages Function: Dynamic Product Image Streaming Endpoint
 * Route: GET /api/product-image?id=<productId>&idx=<optional>&v=<optional>
 * 
 * Securely streams product images from Supabase to Meta Commerce Manager
 * and public clients, converting base64 data URIs into binary image responses
 * with version-aware edge caching and dynamic host resolution.
 */

const SUPABASE_API = "https://mukctesllfgdgvkttjkb.supabase.co/rest/v1/products";
const DEFAULT_ANON_KEY = "sb_publishable_f20oiNxVRdSdz7FhICoWlg_8PEoqOVS";

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);

/**
 * Converts a base64 string to a Uint8Array across standard Web/Worker environments.
 */
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin; // Dynamically bound to current preview or production domain
    const prodId = url.searchParams.get("id");
    const idxParam = url.searchParams.get("idx");

    if (!prodId || typeof prodId !== "string" || prodId.trim().length === 0) {
      return new Response("Missing product ID parameter 'id'.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const cleanId = prodId.trim();

    // Security check: exclude obsolete samples and invalid IDs
    if (cleanId === "prod-anker-maggo-10k" || cleanId.startsWith("prod-sample")) {
      return new Response("Product not found.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const apiKey = (context.env && context.env.SUPABASE_ANON_KEY) ? context.env.SUPABASE_ANON_KEY : DEFAULT_ANON_KEY;

    // Fetch product details (strictly read-only)
    const fetchUrl = `${SUPABASE_API}?id=eq.${encodeURIComponent(cleanId)}&select=id,image,images,updated_at,created_at`;
    const dbRes = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "apikey": apiKey,
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    if (!dbRes.ok) {
      return new Response("Database service temporarily unavailable.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "120"
        }
      });
    }

    const list = await dbRes.json();
    if (!Array.isArray(list) || list.length === 0) {
      return new Response("Product not found.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const product = list[0];
    let targetImage = product.image;

    // If an index was requested for secondary images
    if (idxParam !== null && !isNaN(Number(idxParam))) {
      const idx = Number(idxParam);
      if (Array.isArray(product.images) && product.images[idx]) {
        targetImage = product.images[idx];
      }
    }

    if (!targetImage || typeof targetImage !== "string" || targetImage.trim().length === 0) {
      return new Response("No image available for this product.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // 1. If stored as a relative static asset path (e.g. assets/products/iphone-14.jpg)
    if (targetImage.startsWith("assets/") || targetImage.startsWith("/assets/")) {
      return Response.redirect(`${baseUrl}/${targetImage.replace(/^\//, "")}`, 302);
    }

    // 2. If stored as a full HTTP/HTTPS URL
    if (targetImage.startsWith("http://") || targetImage.startsWith("https://")) {
      return Response.redirect(targetImage, 302);
    }

    // 3. If stored as Base64 Data URI (e.g. data:image/jpeg;base64,...)
    const base64Match = targetImage.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return new Response("Invalid image data encoding.", {
        status: 415,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const rawMime = base64Match[1].toLowerCase().trim();
    const mimeType = rawMime === "image/jpg" ? "image/jpeg" : rawMime;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return new Response("Unsupported image MIME format.", {
        status: 415,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const versionTag = product.updated_at || product.created_at || "1";
    const idxTag = idxParam !== null ? `-${idxParam}` : "";
    const etag = `"img-${cleanId}${idxTag}-${versionTag}"`;

    // Conditional caching: check If-None-Match
    const ifNoneMatch = context.request.headers.get("If-None-Match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, max-age=604800, s-maxage=604800"
        }
      });
    }

    const binaryData = base64ToUint8Array(base64Match[2]);

    return new Response(binaryData, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(binaryData.byteLength),
        "Cache-Control": "public, max-age=604800, s-maxage=604800", // 1 week cache
        "ETag": etag,
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (err) {
    return new Response(`Error serving product image: ${err.message}`, {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "120"
      }
    });
  }
}

// Export onRequest to handle both GET and HEAD requests natively
export const onRequest = onRequestGet;
export const onRequestHead = onRequestGet;
