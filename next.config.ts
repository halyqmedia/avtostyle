import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // WhatsApp file/audio attachments go through a Server Action as multipart form data.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
