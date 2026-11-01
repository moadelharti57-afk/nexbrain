import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Image Docker minimale (.next/standalone) — activé uniquement par le Dockerfile,
  // pour que `npm start` (next start) continue de fonctionner en local.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
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
