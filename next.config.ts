import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old creators address now goes to the Spotted Insider page.
  async redirects() {
    return [{ source: "/influencers", destination: "/insider", permanent: true }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
