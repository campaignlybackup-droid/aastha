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
          // Faceted URLs multiply into near-duplicate pages; the canonical
          // category page is what should rank.
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
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
