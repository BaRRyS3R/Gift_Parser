/** @type {import('next').NextConfig} */
const JavaScriptObfuscator = require('webpack-obfuscator');

const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer, dev }) => {
    // Алиасы
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    // Обфускация только для production и клиентской части
    if (!isServer && !dev) {
      config.plugins.push(
        new JavaScriptObfuscator({
          // === МЯГКИЕ НАСТРОЙКИ ДЛЯ НАЧАЛА ===
          
          // Базовая обфускация
          compact: true,
          
          // Умеренное переименование переменных
          identifierNamesGenerator: 'mangled', // короткие имена a,b,c вместо hex
          renameGlobals: false, // НЕ переименовываем глобальные переменные
          
          // Минимальные преобразования потока управления
          controlFlowFlattening: false, // отключено для стабильности
          deadCodeInjection: false, // отключено для стабильности
          
          // Простое кодирование строк
          stringArray: true,
          stringArrayThreshold: 0.5, // только 50% строк
          stringArrayEncoding: ['base64'], // простое кодирование
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: false,
          
          // Отключаем агрессивные функции
          debugProtection: false,
          debugProtectionInterval: false,
          disableConsoleOutput: false, // оставляем console для отладки
          selfDefending: false,
          unicodeEscapeSequence: false,
          
          // === КРИТИЧЕСКИ ВАЖНЫЕ ИСКЛЮЧЕНИЯ ===
          
          // Telegram WebApp API - НЕ ТРОГАЕМ!
          reservedNames: [
            // Telegram WebApp Core
            'Telegram',
            'WebApp',
            'MainButton',
            'BackButton',
            'HapticFeedback',
            'CloudStorage',
            'SettingsButton',
            'MenuButton',
            'BiometricManager',
            
            // Telegram WebApp методы
            'ready',
            'expand',
            'close',
            'onEvent',
            'offEvent',
            'sendData',
            'switchInlineQuery',
            'openLink',
            'openTelegramLink',
            'openInvoice',
            'showPopup',
            'showAlert',
            'showConfirm',
            'showScanQrPopup',
            'closeScanQrPopup',
            'readTextFromClipboard',
            'requestWriteAccess',
            'requestContact',
            'invokeCustomMethod',
            
            // Telegram WebApp свойства
            'initData',
            'initDataUnsafe',
            'version',
            'platform',
            'colorScheme',
            'themeParams',
            'isExpanded',
            'viewportHeight',
            'viewportStableHeight',
            'headerColor',
            'backgroundColor',
            'isClosingConfirmationEnabled',
            'isVerticalSwipesEnabled',
            
            // Browser APIs
            'window',
            'document',
            'navigator',
            'location',
            'localStorage',
            'sessionStorage',
            'fetch',
            'XMLHttpRequest',
            'FormData',
            'URLSearchParams',
            'btoa',
            'atob',
            
            // React Core
            'React',
            'ReactDOM',
            'useState',
            'useEffect',
            'useCallback',
            'useMemo',
            'useRef',
            'useContext',
            'createContext',
            'forwardRef',
            'memo',
            
            // Next.js Core
            'Next',
            '__next',
            '_app',
            '_document',
            'useRouter',
            'useSearchParams',
            'usePathname',
            'notFound',
            
            // NextUI Components
            'NextUIProvider',
            'Button',
            'Card',
            'CardBody',
            'CardHeader',
            'Spinner',
            'Input',
            'Chip',
            'Modal',
            'ModalContent',
            'ModalHeader',
            'ModalBody',
            'ModalFooter',
            
            // Supabase
            'supabase',
            'createClient',
            'from',
            'select',
            'insert',
            'update',
            'delete',
            'auth',
            'signIn',
            'signOut',
            'signUp',
            
            // Ваши кастомные хуки (из кода)
            'useUser',
            'useTasks',
            'useT',
            'useAuth',
            
            // Ваши провайдеры
            'UserProvider',
            'LocalizationProvider',
            'SettingsProvider',
            
            // Критические функции из вашего кода
            'getTelegramInitData',
            'parseTelegramInitData',
            'extractReferralCode',
            'makeAuthenticatedRequest',
            'refreshUser',
            'initializeAuthentication',
            'attemptAuthentication',
            'registerNewUser',
            'handleTaskAction',
            'startTaskWithTimer',
            'claimReward',
          ],
          
          // Строки которые НЕ обфусцируем
          reservedStrings: [
            // API endpoints - НЕ ТРОГАЕМ!
            '/api/auth/register',
            '/api/auth/login',
            '/api/auth/validate',
            '/api/tasks/list',
            '/api/tasks/start',
            '/api/tasks/claim',
            '/api/user/profile',
            '/api/user/attempts',
            
            // Telegram WebApp события
            'ready',
            'expand',
            'close',
            'viewportChanged',
            'themeChanged',
            'mainButtonClicked',
            'backButtonClicked',
            'settingsButtonClicked',
            'invoiceClosed',
            'popupClosed',
            'qrTextReceived',
            'clipboardTextReceived',
            'writeAccessRequested',
            'contactRequested',
            
            // Роуты приложения
            '/main',
            '/tasks',
            '/blocked',
            '/nebula',
            '/not-found',
            
            // CSS классы и селекторы
            'safe-area-inset',
            'safe-area-inset-bottom',
            'safe-area-inset-game',
            'font-bpdots',
            'BPDots Diamond',
            'dark',
            'light',
            'animate-fade-in',
            'animate-pulse',
            'loader-container',
            'video-container',
            
            // LocalStorage ключи
            'telegram-user-data',
            'app-settings',
            'user-preferences',
            'game-state',
            'task-timers',
            
            // Ключи локализации (примеры из кода)
            'auth.telegramDataUnavailable',
            'auth.registering',
            'auth.checkingUser',
            'tasks.title',
            'tasks.start',
            'tasks.claim',
            'tasks.completed',
            'main.welcome',
            'main.initialize',
            'main.quickStart',
            'common.loading',
            'common.retry',
            'common.or',
            
            // HTTP заголовки
            'Content-Type',
            'Authorization',
            'Bearer',
            'application/json',
            'multipart/form-data',
            
            // Telegram Bot API
            'telegram_bot_token',
            'chat_id',
            'message_id',
            'inline_keyboard',
            'callback_data',
            
            // Supabase
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            
            // Важные константы
            'USER_NOT_FOUND',
            'INVALID_CREDENTIALS',
            'ACCESS_DENIED',
            'SUCCESS',
            'ERROR',
            
            // Mime types и file extensions
            'video/mp4',
            'image/png',
            'image/jpeg',
            'text/html',
            'application/javascript',
            '.mp4',
            '.png',
            '.jpg',
            '.js',
            '.css',
          ],
          
          // === НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ ===
          
          sourceMap: false,
          transformObjectKeys: false, // НЕ преобразуем ключи объектов
          
        }, [
          // === ИСКЛЮЧЕНИЯ ИЗ ОБФУСКАЦИИ ===
          
          // Системные файлы
          'node_modules/**',
          'public/**',
          '**/*.min.js',
          
          // Service Worker и PWA
          '**/sw.js',
          '**/workbox-*.js',
          '**/manifest.json',
          
          // Telegram WebApp скрипт
          '**/telegram-web-app.js',
          
          // API роуты - НЕ ОБФУСЦИРУЕМ!
          '**/api/**',
          '**/route.ts',
          '**/route.js',
          
          // Конфигурационные файлы
          '**/next.config.js',
          '**/tailwind.config.js',
          '**/postcss.config.js',
          
          // Middleware
          '**/middleware.ts',
          '**/middleware.js',
          
          // Layout и корневые файлы
          '**/layout.tsx',
          '**/layout.js',
          '**/not-found.tsx',
          '**/not-found.js',
          '**/error.tsx',
          '**/error.js',
          '**/global-error.tsx',
          '**/global-error.js',
          '**/loading.tsx',
          '**/loading.js',
          
          // Критические файлы интеграции
          '**/telegram-auth.ts',
          '**/telegram-auth.js',
        ])
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