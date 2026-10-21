import type { NextConfig } from "next";

// The site is served from the root of tinget.social. GitHub Pages without a
// custom domain (e.g. a fork) serves under /<repo>/: the deploy workflow sets
// PAGES_BASE_PATH from actions/configure-pages, empty for the custom domain.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
};

export default nextConfig;
