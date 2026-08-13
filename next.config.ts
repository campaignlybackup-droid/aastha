import type { NextConfig } from "next";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Security headers applied to every response.
 *
 * Content-Security-Policy is deliberately NOT set here. Razorpay's checkout,
 * GTM, and the Meta Pixel all inject scripts and frames at runtime, so a CSP
 * has to be assembled per-request with a nonce. That lives in middleware.ts
 * where the nonce is generated.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // AVIF first, WebP fallback. Jewellery photography is detail-heavy, so the
    // better compression is worth the extra encode time.
    formats: ["image/avif", "image/webp"],
    remotePatterns: cloudName
      ? [
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
            pathname: `/${cloudName}/**`,
          },
        ]
      : [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // Matches the storefront's breakpoints so the browser never downloads a
    // materially larger source than it renders.
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    // Keeps server action payloads small; product images upload via Cloudinary
    // directly rather than through the server.
    serverActions: { bodySizeLimit: "2mb" },
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      // Legacy/alternate paths kept stable for SEO.
      { source: "/products/:slug", destination: "/product/:slug", permanent: true },
      { source: "/categories/:slug", destination: "/category/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
