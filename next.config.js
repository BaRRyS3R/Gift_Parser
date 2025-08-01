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
            // ОСНОВНЫЕ НАСТРОЙКИ ОБФУСКАЦИИ
            
            // hexadecimal - конвертация строк в шестнадцатеричные значения
            stringArrayEncoding: ['base64', 'rc4'],
            
            // stringArray - помещение строк в массив и замена ссылками
            stringArray: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.8,
            
            // debugProtection - защита от отладки
            debugProtection: true,
            debugProtectionInterval: 2000,
            
            // selfDefending - самозащита кода
            selfDefending: true,
            
            // ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ДЛЯ СТАБИЛЬНОСТИ
            
            // Средний уровень обфускации переменных
            identifierNamesGenerator: 'hexadecimalNumericString',
            identifiersPrefix: '_0x',
            
            // Преобразование управляющих структур
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.5,
            
            // Мертвый код для усложнения анализа  
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.2,
            
            // Разделение строк
            splitStrings: true,
            splitStringsChunkLength: 3,
            
            // Настройки для стабильности
            compact: true,
            simplify: true,
            target: 'browser',
            
            // Отключаем слишком агрессивные опции для стабильности
            disableConsoleOutput: false, // Оставляем консоль для отладки
            domainLock: [], // Не блокируем домены для Telegram
            reservedNames: [], // Не резервируем имена
            
            // Исключения для критических частей
            ignoreRequireImports: true,
            numbersToExpressions: false, // Отключаем для стабильности с числами
            simplifyExpressions: false, // Отключаем упрощение выражений
            
            // Настройки трансформации
            transformObjectKeys: true,
            unicodeEscapeSequence: false, // Отключаем для совместимости с Telegram
            
            // Производительность
            optionsPreset: 'medium-obfuscation',
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