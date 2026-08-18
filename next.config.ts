import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // WhatsApp file/audio attachments and production-order forms (several material
      // photos in one submit) go through a Server Action as multipart form data.
      bodySizeLimit: "32mb",
    },
  },
  // Uses runtime-computed require() to pick its platform binary — Next's bundler can't
  // statically analyze that, so it needs Node's own require instead of being bundled.
  // baileys is ESM-only and holds long-lived WebSocket connections in module scope —
  // both need Node's own module loader rather than Next's bundler.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "baileys"],
};

export default nextConfig;
