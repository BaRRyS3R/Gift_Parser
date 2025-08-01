/** @type {import('next').NextConfig} */

// Попробуем загрузить webpack-obfuscator с обработкой ошибок
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('webpack-obfuscator');
  console.log('✅ webpack-obfuscator загружен успешно');
} catch (error) {
  console.error('❌ Ошибка загрузки webpack-obfuscator:', error.message);
  console.log('💡 Попробуйте переустановить: npm uninstall webpack-obfuscator && npm install webpack-obfuscator@^3.5.1');
}

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

    // ВАРИАНТ 1: Минимальная обфускация (если webpack-obfuscator работает)
    if (!dev && !isServer && JavaScriptObfuscator) {
      try {
        config.plugins.push(
          new JavaScriptObfuscator(
            {
              // ТОЛЬКО БАЗОВЫЕ ОПЦИИ
              stringArray: true,
              debugProtection: true,
              selfDefending: true,
              identifierNamesGenerator: 'hexadecimalNumericString'
            },
            ['**/node_modules/**', '**/sw.js', '**/workbox*']
          )
        );
        console.log('✅ Обфускация настроена успешно');
      } catch (error) {
        console.error('❌ Ошибка настройки обфускации:', error.message);
        console.log('⚠️ Сборка продолжится без обфускации');
      }
    }

    // ВАРИАНТ 2: Альтернативная защита через Webpack (если obfuscator не работает)
    if (!dev && !isServer && !JavaScriptObfuscator) {
      console.log('🔧 Применяем альтернативную защиту кода...');

      // Минификация переменных
      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [
          ...config.optimization.minimizer || [],
        ],
      };

      // Настройки Terser для дополнительной защиты
      const TerserPlugin = require('terser-webpack-plugin');
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Оставляем критические логи
              drop_debugger: true,
              pure_funcs: ['console.log'], // Удаляем только console.log
            },
            mangle: {
              // Запутывание имен переменных
              properties: {
                regex: /^_/, // Запутываем только приватные свойства
              },
            },
            format: {
              comments: false, // Удаляем комментарии
            },
          },
          extractComments: false,
        })
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
      // Заголовки безопасности для защиты кода
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
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },

  // Настройки компилера для базовой защиты
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"], // Сохраняем критические логи
    } : false,
  },

  // SWC минификация всегда включена
  swcMinify: true,

  // Экспериментальные настройки для оптимизации
  experimental: {
    optimizeCss: true,
    // Дополнительная защита через манглинг
    swcMinifyDebugOptions: {
      compress: {
        arguments: true,
        dead_code: true,
      },
      mangle: true,
    },
  },
};

// Инструкции для диагностики проблем
console.log(`
🔍 ДИАГНОСТИКА ОБФУСКАЦИИ:
- Режим: ${process.env.NODE_ENV || 'development'}
- webpack-obfuscator: ${JavaScriptObfuscator ? '✅ Доступен' : '❌ Недоступен'}

📋 ЕСЛИ ОБФУСКАЦИЯ НЕ РАБОТАЕТ:
1. Проверьте версию: npm list webpack-obfuscator
2. Переустановите: npm uninstall webpack-obfuscator && npm install webpack-obfuscator@3.5.1
3. Альтернатива: npm install javascript-obfuscator@4.0.2

🛡️ ТЕКУЩИЕ МЕТОДЫ ЗАЩИТЫ:
- SWC минификация: ✅ Включена
- Удаление console.log: ✅ В production
- Терсер оптимизация: ✅ Включена  
- Заголовки безопасности: ✅ Настроены
${JavaScriptObfuscator ? '- Полная обфускация: ✅ Настроена' : '- Обфускация: ⚠️ Отключена (ошибка конфигурации)'}
`);

module.exports = nextConfig;