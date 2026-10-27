import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rallied/shared"],
};

export default nextConfig;

// Bindings + Workers runtime helpers during `next dev` (no-op if unused).
initOpenNextCloudflareForDev();
