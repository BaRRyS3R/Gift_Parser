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

    // Применяем обфускацию только для client-side production кода
    if (!isServer && !dev) {
      try {
        config.plugins.push(
          new JavaScriptObfuscator({
            // === УПРОЩЕННАЯ КОНФИГУРАЦИЯ ===
            // Обфусцируем только логику, не трогая API и библиотеки
            
            // БАЗОВАЯ ОБФУСКАЦИЯ
            compact: true,
            simplify: true,
            
            // ЗАЩИТА ОТ DEVTOOLS (Требование 1)
            debugProtection: true,
            debugProtectionInterval: 4000,
            disableConsoleOutput: true,
            
            // ЗАЩИТА ОТ ИНЪЕКЦИЙ (Требование 3)
            selfDefending: true,
            
            // ЛЕГКАЯ ОБФУСКАЦИЯ ЛОГИКИ (Требование 2)
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.25, // Только 25% кода
            deadCodeInjection: false, // Отключаем для производительности
            
            // ОБФУСКАЦИЯ СТРОК - только внутренних
            stringArray: true,
            stringArrayThreshold: 0.5, // 50% строк
            stringArrayEncoding: ['base64'],
            
            // === ВАЖНО: ОТКЛЮЧАЕМ ОПАСНЫЕ ТРАНСФОРМАЦИИ ===
            renameGlobals: false,      // НЕ переименовываем глобальные переменные
            renameProperties: false,    // НЕ переименовываем свойства объектов
            transformObjectKeys: false, // НЕ трансформируем ключи объектов
            
            // Используем простые имена
            identifierNamesGenerator: 'mangled',
            
            // === МИНИМАЛЬНЫЙ СПИСОК КРИТИЧЕСКИХ ЭЛЕМЕНТОВ ===
            // Только то, что точно нельзя трогать
            reservedNames: [
              // Только главные API
              'Telegram', 'WebApp',
              'window', 'document', 'navigator',
              'React', 'ReactDOM',
              'supabase'
            ],
            
            reservedStrings: [
              // Только критические endpoints
              '/api/*', // Паттерн для всех API
              'Content-Type',
              'Authorization',
              'application/json'
            ],
            
            // Отключаем source maps
            sourceMap: false,
            target: 'browser',
            ignoreImports: true,
          }, 
          // === ИСКЛЮЧАЕМ ИЗ ОБФУСКАЦИИ ВСЕ ВАЖНЫЕ ПАПКИ ===
          [
            // Системные и библиотеки
            'node_modules/**',
            '**/*.min.js',
            
            // Next.js runtime
            '**/_app*.js',
            '**/_document*.js',
            '**/_error*.js',
            '**/framework-*.js',
            '**/main-*.js',
            '**/polyfills-*.js',
            '**/webpack-*.js',
            
            // === ВАШИ ПАПКИ С API И ХУКАМИ ===
            // Исключаем целиком, чтобы не ломать
            '**/api/**/*.ts',        // Все API routes
            '**/lib/**/*.ts',        // Библиотеки и утилиты
            '**/hooks/**/*.ts',      // Все хуки
            '**/services/**/*.jts',   // Сервисы
            '**/utils/**/*.ts',      // Утилиты
            '**/store/**/*.ts',      // State management
            '**/context/**/*.tsx',    // React contexts
            '**/game-modes/**/*tsx',
            '**/game-modes/**/*ts',
            
            // Service Worker и PWA
            '**/sw.js',
            '**/workbox-*.js',
            '**/fallback-*.js',
            
            // Конфигурационные файлы
            '**/*.config.js',
            '**/config/**/*.js',
          ])
        );

        console.log('🔒 Обфускация включена:');
        console.log('   ✅ Защита от DevTools');
        console.log('   ✅ Защита от инъекций');
        console.log('   ✅ Легкая обфускация бизнес-логики');
        console.log('   ⚠️  API, хуки и утилиты НЕ обфусцированы');
        
      } catch (error) {
        console.warn('⚠️ Ошибка настройки обфускации:', error.message);
        console.log('🔄 Сборка продолжается без обфускации');
      }
    }

    return config;
  },
  
  // Отключаем source maps в production
  productionBrowserSourceMaps: false,
  
  // Скрываем powered by header
  poweredByHeader: false,
  
  // Включаем сжатие
  compress: true,
  
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
      // Security headers для защиты от инъекций
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options", 
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;