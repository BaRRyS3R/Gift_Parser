/** @type {import('next').NextConfig} */
const JavaScriptObfuscator = require('webpack-obfuscator');

const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { dev, isServer }) => {
    // Настройка алиасов
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    // Применяем обфускацию только в production и только для клиентского кода
    if (!dev && !isServer) {
      config.plugins.push(
        new JavaScriptObfuscator(
          {
            // МИНИМАЛЬНАЯ РАБОЧАЯ КОНФИГУРАЦИЯ
            
            // stringArray - основной метод обфускации строк
            stringArray: true,
            stringArrayThreshold: 0.8,
            
            // debugProtection - защита от отладки
            debugProtection: true,
            
            // selfDefending - самозащита кода
            selfDefending: true,
            
            // hexadecimal через identifierNames
            identifierNamesGenerator: 'hexadecimalNumericString',
            
            // Базовые настройки
            compact: true,
            target: 'browser'
          },
          // ИСКЛЮЧЕНИЯ - НЕ ОБФУСКИРУЕМ КРИТИЧЕСКИЕ ФАЙЛЫ (используем glob паттерны)
          [
            // Исключаем Telegram Web App SDK и связанные файлы
            '**/telegram-web-app*',
            '**/twa-dev*',
            
            // Исключаем внешние библиотеки которые могут сломаться
            '**/node_modules/**',
            
            // Исключаем service worker
            '**/sw.js',
            '**/workbox*',
            
            // Исключаем конфигурационные файлы
            '**/*.config.*',
            '**/manifest.json',
            
            // Исключаем критические системные файлы Next.js
            '**/_app.*',
            '**/_document.*',
            '**/middleware.*',
            
            // Исключаем полифиллы
            '**/polyfill*',
            '**/webpack*',
            
            // Исключаем файлы с чувствительной к обфускации логикой
            '**/auth/**',
            '**/jwt*',
            '**/crypto*'
          ]
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
      // Добавляем заголовки безопасности для обфусцированного кода
      {
        source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options", 
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  
  // Оптимизация для production с учетом обфускации
  experimental: {
    optimizeCss: true,
  },
  
  // Настройки компилера для совместимости с обфускацией
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"], // Оставляем критические логи
    } : false,
  },
  
  // Настройки минификации
  swcMinify: true,
};

module.exports = nextConfig;