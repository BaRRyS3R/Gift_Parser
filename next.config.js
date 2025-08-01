/** @type {import('next').NextConfig} */
const JavaScriptObfuscator = require('webpack-obfuscator');

// УРОВНИ ОБФУСКАЦИИ - раскомментируйте нужный уровень

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

    if (!isServer && !dev) {
      try {
        config.plugins.push(
          new JavaScriptObfuscator({
            // Базовые настройки
            compact: true,
            identifierNamesGenerator: 'mangled',
            
            // НОВОЕ: Кодирование строк
            stringArray: true,
            stringArrayThreshold: 0.6, // 60% строк будут закодированы
            stringArrayEncoding: ['base64'], // простое кодирование
            stringArrayWrappersCount: 1,
            
            // Защита критических API
            reservedNames: [
              'Telegram', 'WebApp', 'MainButton', 'BackButton',
              'window', 'document', 'navigator',
              'React', 'ReactDOM', 'useState', 'useEffect', 'useCallback', 'useRef',
              'useRouter', 'useSearchParams',
              'Button', 'Card', 'Spinner', 'NextUIProvider',
              'supabase', 'createClient',
              'useUser', 'useTasks', 'useT',
              'getTelegramInitData', 'parseTelegramInitData'
            ],
            
            reservedStrings: [
              '/api/auth/register', '/api/auth/login', '/api/tasks/start',
              '/main', '/tasks', '/blocked',
              'ready', 'expand', 'viewportChanged',
              'Content-Type', 'Authorization'
            ],
          })
        );

        console.log('🔒 Обфускация включена (максимальный уровень)');
        
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