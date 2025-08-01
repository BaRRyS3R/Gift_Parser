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

    // Применяемые обфускацию только в production и только для клиентского кода
    if (!dev && !isServer) {
      config.plugins.push(
        new JavaScriptObfuscator(
          {
            // ОСНОВНЫЕ ТРЕБУЕМЫЕ МЕТОДЫ ОБФУСКАЦИИ
            
            // hexadecimal - используем через identifierNamesGenerator
            identifierNamesGenerator: 'hexadecimalNumericString',
            identifiersPrefix: '_0x',
            
            // stringArray - помещение строк в массив и замена ссылками
            stringArray: true,
            stringArrayShuffle: true,
            stringArrayThreshold: 0.75,
            stringArrayEncoding: ['base64'],
            
            // debugProtection - защита от отладки
            debugProtection: true,
            debugProtectionInterval: 2000,
            
            // selfDefending - самозащита кода
            selfDefending: true,
            
            // БАЗОВЫЕ НАСТРОЙКИ ДЛЯ СТАБИЛЬНОСТИ
            compact: true,
            target: 'browser',
            
            // Умеренные дополнительные настройки
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.3,
            
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.1,
            
            // Настройки совместимости
            disableConsoleOutput: false,
            ignoreRequireImports: true,
            transformObjectKeys: false,
            unicodeEscapeSequence: false,
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