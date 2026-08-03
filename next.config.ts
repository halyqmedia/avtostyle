import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // WhatsApp file/audio attachments go through a Server Action as multipart form data.
      bodySizeLimit: "16mb",
    },
  },
  // Uses runtime-computed require() to pick its platform binary — Next's bundler can't
  // statically analyze that, so it needs Node's own require instead of being bundled.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
};

export default nextConfig;
