import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  images: {
    formats: ["image/avif", "image/webp"],
    // Fotos subidas desde el panel a Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    // La importación de catálogos manda el CSV completo a una Server Action (WooCommerce trae descripciones en HTML).
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
