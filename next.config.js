/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // "standalone" output makes the app portable: it works on Vercel today
  // and can be copied to a plain Linux VPS (behind Node/PM2/Nginx) later
  // without any Vercel-specific dependencies.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Serve modern formats when the browser supports them, falling back
    // automatically — no change needed on the upload/storage side.
    formats: ['image/avif', 'image/webp'],
  },

  // ------------------------------------------------------------------
  // Phase 6: production security headers.
  // These are additive — they don't change any existing route behavior,
  // and the CSP is deliberately permissive on connect-src/img-src since
  // product images may be hosted on an external domain (see next.config
  // `images.remotePatterns`). Tighten `img-src`/`connect-src` once the
  // restaurant's final image host and any analytics domains are known.
  // ------------------------------------------------------------------
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Next.js needs 'unsafe-inline' for its hydration bootstrap scripts
          // in this version; tighten with nonces if upgrading the framework.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];

    return [
      {
        // Applies everywhere, including admin — admin gets extra
        // no-store caching headers below on top of these.
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Never let intermediaries/browsers cache admin pages or the
        // authenticated admin API responses.
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        // Order tracking is per-customer private data — never cache it.
        source: '/api/orders/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        // Static PWA assets are safe to cache aggressively.
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

module.exports = nextConfig;
