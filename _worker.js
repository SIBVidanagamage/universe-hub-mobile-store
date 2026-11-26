/**
 * Universe Hub Cloudflare Worker Entrypoint
 * Handles dynamic routing for Meta Commerce Manager data feed & image endpoints
 * while proxying all storefront assets transparently to env.ASSETS.
 */

import { onRequestGet as getFeed } from "./functions/meta-product-feed.csv.js";
import { onRequestGet as getImage } from "./functions/api/product-image.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Meta Product Catalogue Data Feed
    if (url.pathname === "/meta-product-feed.csv") {
      return getFeed({ request, env });
    }

    // 2. Dynamic Product Image Streaming Endpoint
    if (url.pathname === "/api/product-image") {
      return getImage({ request, env });
    }

    // 3. Fallback to static assets (HTML, CSS, JS, images, etc.)
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
