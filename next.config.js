/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // важно для Cloudflare
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: {}, // Cloudflare не поддерживает пока
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    return config;
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;