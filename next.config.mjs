/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // allow-popups (not plain same-origin) so Stripe/OAuth popups keep their opener
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://www.weblaunchacademy.com https://weblaunchacademy.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com https://www.weblaunchacademy.com https://weblaunchacademy.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'self' https://www.weblaunchacademy.com https://*.weblaunchacademy.com",
              // Additive hardening (safe — no effect on normal app behavior):
              // block plugin/object embeds and prevent <base> tag hijacking of relative URLs.
              "object-src 'none'",
              "base-uri 'self'",
              // Restrict where forms can POST (self + Stripe checkout). If a form legitimately
              // posts elsewhere, add that origin here.
              "form-action 'self' https://js.stripe.com https://hooks.stripe.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
