import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

/**
 * robots.txt
 *
 * Disallows every authenticated or transactional path. These are also
 * noindex at the page level; the two together mean a crawler neither wastes
 * budget on them nor surfaces one that leaks into a link somewhere.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/cart",
          "/checkout",
          "/order/",
          "/login",
          "/api/",
          "/*?*sort=",
          "/*?*page=",
          "/*?*purity=",
          "/*?*occasion=",
          "/*?*stone=",
          "/*?*gender=",
          "/*?*min=",
          "/*?*max=",
          "/search",
        ],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Applebot-Extended", "Google-Extended"],
        allow: ["/", "/llms.txt", "/shop", "/product/", "/category/"],
        disallow: ["/admin/", "/account/", "/cart", "/checkout", "/api/"],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
