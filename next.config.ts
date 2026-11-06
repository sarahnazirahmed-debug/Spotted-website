import type { NextConfig } from "next";

// Cloudflare Pages build: "npm run build:cloudflare" sets NEXT_OUTPUT=export, which turns the site into
// plain files (HTML, CSS, JS) in the "out" folder. The whole site works that way: it has no server code.
// In that mode redirects come from public/_redirects (Cloudflare reads that file) instead of from here.
const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? { output: "export" as const }
    : {
        // The old creators address now goes to the Spotted Insider page.
        async redirects() {
          return [{ source: "/influencers", destination: "/insider", permanent: true }];
        },
      }),
  // (Next.js "Cache Components" is not used: it needs a Next.js server, and this site is plain ready-made pages.)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
