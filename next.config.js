/** @type {import('next').NextConfig} */
const WebpackObfuscator = require('webpack-obfuscator');
const path = require('path');

const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    // Добавляем обфускатор только для client-side production сборки
    if (!isServer && config.mode === "production") {
      config.plugins.push(
        new WebpackObfuscator(
          {
            rotateStringArray: true,
            stringArray: true,
            stringArrayEncoding: ['rc4'],
            stringArrayThreshold: 0.75,
          },
          ['excluded_bundle_name.js'] // можно указать конкретные файлы, которые не нужно обфусцировать
        )
      );
    }

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
