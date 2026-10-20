import type { NextConfig } from "next";

// GitHub Pages serves project sites under /<repo>/. The deploy workflow sets
// PAGES_BASE_PATH from actions/configure-pages; it is empty locally and once a
// custom domain is configured.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
};

export default nextConfig;
