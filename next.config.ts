import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its own data files at runtime, so keep it out of the bundle
  serverExternalPackages: ["pdfkit"],
  // Make sure the PDF fonts are uploaded when deploying (e.g. to Vercel)
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./fonts/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The app-install helper must always be fresh so updates reach phones
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
