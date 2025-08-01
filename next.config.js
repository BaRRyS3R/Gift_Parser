/** @type {import('next').NextConfig} */
const JavaScriptObfuscator = require('webpack-obfuscator');

const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    // МИНИМАЛЬНАЯ ОБФУСКАЦИЯ ДЛЯ ПРОВЕРКИ СОВМЕСТИМОСТИ
    if (!isServer && !dev) {
      try {
        config.plugins.push(
          new JavaScriptObfuscator({
            // Только самые базовые настройки
            compact: true,
            identifierNamesGenerator: 'mangled',

            // Минимальная защита Telegram API
            reservedNames: [
              'Telegram',
              'WebApp',
              'window',
              'document',
              'React',
              'useState',
              'useEffect',
            ],

          })
        );
        console.log('✅ Обфускация включена (минимальная)');
      } catch (error) {
        console.warn('⚠️ Ошибка обфускации:', error.message);
        console.log('🔄 Сборка продолжается без обфускации');
      }
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