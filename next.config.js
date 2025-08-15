const WebpackObfuscator = require('webpack-obfuscator');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { dev, isServer }) => {
    // Алиасы путей
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    // Применяем обфускацию только для production и client-side кода
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            // === БАЗОВЫЕ НАСТРОЙКИ ОБФУСКАЦИИ ===
            compact: true, // Минимизация кода
            controlFlowFlattening: true, // Усложнение потока выполнения
            controlFlowFlatteningThreshold: 0.5, // Умеренный уровень (0.5 из 1)
            deadCodeInjection: true, // Добавление мертвого кода
            deadCodeInjectionThreshold: 0.2, // Небольшое количество мертвого кода
            
            // === ЗАЩИТА ОТ DEVTOOLS ===
            debugProtection: true, // Базовая защита от отладки
            debugProtectionInterval: 2000, // Интервал проверки отладчика (в мс)
            disableConsoleOutput: true, // Отключение console.log в production
            
            // === ЗАЩИТА СТРОК И ИДЕНТИФИКАТОРОВ ===
            identifierNamesGenerator: 'hexadecimal', // Генерация hex имен переменных
            renameGlobals: false, // Не переименовывать глобальные переменные (для совместимости)
            renameProperties: false, // Не переименовывать свойства (для совместимости с React)
            stringArray: true, // Извлечение строк в отдельный массив
            stringArrayCallsTransform: true, // Трансформация вызовов строк
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'], // Кодирование строк в base64
            stringArrayIndexShift: true, // Сдвиг индексов массива строк
            stringArrayRotate: true, // Ротация массива строк
            stringArrayShuffle: true, // Перемешивание массива строк
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            stringArrayThreshold: 0.6, // Обфусцировать 60% строк
            
            // === ЗАЩИТА ОТ КОПИРОВАНИЯ ===
            selfDefending: true, // Защита от форматирования и инъекций
            transformObjectKeys: true, // Трансформация ключей объектов
            unicodeEscapeSequence: false, // Не использовать unicode (для размера)
            
            // === ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ===
            ignoreImports: true, // Игнорировать import statements
            inputFileName: '',
            log: false,
            numbersToExpressions: true, // Преобразование чисел в выражения
            optionsPreset: 'default', // Использовать стандартный пресет
            simplify: true,
            splitStrings: true, // Разделение строк
            splitStringsChunkLength: 10,
            target: 'browser', // Целевая платформа
            
            // === ДОМЕНЫ И БЛОКИРОВКИ ===
            domainLock: ['circusle.xyz', '.circusle.xyz'], // Можете добавить домены: ['circusle.xyz', '.circusle.xyz']
            domainLockRedirectUrl: 'about:blank',
            forceTransformStrings: [],
            reservedNames: [],
            reservedStrings: [],
            seed: Date.now(), // Случайный seed для каждой сборки
            sourceMap: false,
            sourceMapBaseUrl: '',
            sourceMapFileName: '',
            sourceMapMode: 'separate',
          },
          // Исключения из обфускации
          [
            'node_modules/**/*.js',
            '**/*.min.js',
            '**/sw.js', // Service Worker
            '**/workbox-*.js',
            '**/fallback-*.js',
            // Исключаем критические библиотеки от обфускации
            '**/react-*.js',
            '**/framework-*.js',
            '**/main-*.js',
            '**/webpack-*.js',
            '**/polyfills-*.js',
          ]
        )
      );

      // Дополнительная защита через DefinePlugin
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          // Отключаем React DevTools в production
          '__REACT_DEVTOOLS_GLOBAL_HOOK__': '({ isDisabled: true })',
          // Дополнительные production флаги
          'process.env.NODE_ENV': JSON.stringify('production'),
        })
      );

      // Настройки оптимизации для обфусцированного кода
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        sideEffects: false,
      };
    }

    return config;
  },
  
  // Дополнительные настройки безопасности
  poweredByHeader: false, // Скрыть X-Powered-By header
  compress: true, // Включить gzip сжатие
  
  // Настройки production сборки
  productionBrowserSourceMaps: false, // Отключить source maps в production
  
  // Экспериментальные функции для лучшей производительности
  experimental: {
    optimizeCss: true, // Оптимизация CSS
    optimizePackageImports: ['@nextui-org/react'], // Оптимизация импортов
  },

  // Headers для безопасности и Service Worker
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
      // Дополнительные security headers для всех страниц
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Запрет встраивания в iframe
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Запрет MIME type sniffing
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block", // XSS защита
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.telegram.org https://*.supabase.co https://go.getblock.io https://toncenter.com wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;