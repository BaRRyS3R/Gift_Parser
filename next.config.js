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
              // ========== TELEGRAM WEB APP API ==========
              'Telegram', 'WebApp', 'MainButton', 'BackButton', 'HapticFeedback',
              'CloudStorage', 'BiometricManager', 'LocationManager',
              'tg', 'initData', 'initDataUnsafe', 'platform', 'version',
              
              // ========== БРАУЗЕРНЫЕ API ==========
              'window', 'document', 'navigator', 'location', 'history',
              'localStorage', 'sessionStorage', 'console', 'setTimeout', 'setInterval',
              'clearTimeout', 'clearInterval', 'fetch', 'XMLHttpRequest',
              'Promise', 'JSON', 'Date', 'Math', 'parseInt', 'parseFloat',
              'encodeURIComponent', 'decodeURIComponent', 'btoa', 'atob',
              
              // ========== REACT И NEXT.JS ==========
              'React', 'ReactDOM', 'useState', 'useEffect', 'useCallback', 'useRef',
              'useMemo', 'useContext', 'useReducer', 'useLayoutEffect',
              'useRouter', 'useSearchParams', 'usePathname', 'Link', 'Image',
              'Head', 'Script', 'NextResponse', 'NextRequest',
              
              // ========== КАСТОМНЫЕ ХУКИ ==========
              'useUser', 'useAttempts', 'usePurchase', 'useSeasons', 'useT', 
              'useSettings', 'useAuth', 'useTasks', 'useLeaderboard', 'useProfile',
              'useLeagues', 'useGame', 'useTournament',
              
              // ========== КОМПОНЕНТЫ ПРИЛОЖЕНИЯ ==========
              'AuthGuard', 'Settings', 'AboutModal', 'AttemptsDisplay',
              'CompactLeagueDisplay', 'LeagueProgressModal', 'SeasonButton',
              'TournamentCard', 'NavigationWrapper', 'Providers',
              
              // ========== КОНТЕКСТЫ ==========
              'LocalizationContext', 'SettingsContext', 'UserContext', 
              'UserProvider', 'NextUIProvider',
              
              // ========== NEXTUI КОМПОНЕНТЫ ==========
              'Button', 'Card', 'CardHeader', 'CardBody', 'CardFooter',
              'Input', 'Textarea', 'Select', 'SelectItem', 'Dropdown',
              'DropdownTrigger', 'DropdownMenu', 'DropdownItem', 'Modal',
              'ModalContent', 'ModalHeader', 'ModalBody', 'ModalFooter',
              'Spinner', 'Progress', 'Badge', 'Chip', 'Avatar', 'Divider',
              'Skeleton', 'Switch', 'Slider', 'CheckboxGroup', 'Checkbox',
              'RadioGroup', 'Radio', 'Tabs', 'Tab', 'Accordion', 'AccordionItem',
              
              // ========== УТИЛИТЫ АУТЕНТИФИКАЦИИ ==========
              'createJWT', 'verifyJWT', 'createRefreshToken', 'verifyRefreshToken',
              'extractTokenFromHeader', 'isTokenExpired',
              'getTelegramInitData', 'parseTelegramInitData', 'createInitDataHash',
              'validateTelegramInitData',
              
              // ========== СЕРВИСЫ И МОДУЛИ ==========
              'makeAuthenticatedRequest', 'serverUserService', 'serverTasksService',
              'serverBlockService', 'serverNebulaService', 'supabase', 'createClient',
              
              // ========== MIDDLEWARE ФУНКЦИИ ==========
              'middleware', 'handleCORSPreflight', 'addCORSHeaders',
              'PUBLIC_ENDPOINTS', 'ADMIN_ENDPOINTS',
              
              // ========== КОНСТАНТЫ И КОНФИГУРАЦИЯ ==========
              'JWT_SECRET', 'TOKEN_STORAGE_KEYS', 'API_ENDPOINTS',
              'TASK_CONFIG', 'TASK_TYPE_CONFIG', 'TaskType', 'TaskStatus',
              
              // ========== LUCIDE ИКОНКИ ==========
              'Play', 'Settings', 'Info', 'Trophy', 'Clock', 'Target', 'RotateCcw',
              'ShoppingCart', 'Star', 'Medal', 'Award', 'Crown', 'ChevronRight',
              'User', 'Users', 'Home', 'Menu', 'X', 'Check', 'ArrowLeft', 'ArrowRight',
              
              // ========== ХРАНИЛИЩЕ И СОСТОЯНИЕ ==========
              'storeTokens', 'getStoredTokens', 'clearTokens',
              'setAuthState', 'setUserState', 'setLoadingState',
              
              // ========== ТИПЫ ИНТЕРФЕЙСОВ ==========
              'User', 'TelegramUser', 'AuthState', 'AuthTokens', 'Tournament',
              'TournamentStatus', 'Season', 'Task', 'TaskWithStatus', 'AttemptsStatus',
              'LeaderboardEntry', 'PurchaseState', 'ProductType',
              
              // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
              'onClick', 'onChange', 'onSubmit', 'onLoad', 'onError',
              'handleClick', 'handleChange', 'handleSubmit', 'handleLogin',
              'handleRegister', 'handleRefresh', 'handleLogout',
            ],

            // === ЗАРЕЗЕРВИРОВАННЫЕ СТРОКИ ===
            reservedStrings: [
              // ========== API ENDPOINTS ==========
              '/api/auth/login', '/api/auth/register', '/api/auth/refresh',
              '/api/user/profile', '/api/user/attempts', '/api/user/stats',
              '/api/game/start', '/api/game/finish', '/api/game/score',
              '/api/tasks/list', '/api/tasks/start', '/api/tasks/verify', '/api/tasks/claim',
              '/api/tournament/current', '/api/tournament/leaderboard',
              '/api/leagues/current', '/api/leagues/progress',
              '/api/purchase/create', '/api/purchase/verify',
              '/api/referral/info', '/api/referral/bonus',
              '/api/leaderboard/global', '/api/leaderboard/weekly',
              '/api/nebula/verify', '/api/nebula/captcha',
              '/api/seasons/current', '/api/seasons/leaderboard',
              '/api/easter-egg/trigger',
              '/api/check-telegram-membership',
              '/api/health', '/api/status',
              
              // ========== РОУТЫ ПРИЛОЖЕНИЯ ==========
              '/main', '/tasks', '/leaderboard', '/profile', '/settings',
              '/blocked', '/tournament', '/leagues', '/seasons',
              
              // ========== HTTP ЗАГОЛОВКИ ==========
              'Content-Type', 'Authorization', 'Accept', 'User-Agent',
              'X-User-ID', 'X-Telegram-ID', 'X-Auth-Verified',
              'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods',
              'Access-Control-Allow-Headers', 'Access-Control-Allow-Credentials',
              
              // ========== HTTP МЕТОДЫ ==========
              'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH',
              
              // ========== TELEGRAM СОБЫТИЯ ==========
              'ready', 'expand', 'viewportChanged', 'themeChanged',
              'mainButtonClicked', 'backButtonClicked', 'settingsButtonClicked',
              'invoiceClosed', 'popupClosed', 'qrTextReceived',
              
              // ========== КЛЮЧИ ЛОКАЛЬНОГО ХРАНИЛИЩА ==========
              'auth_access_token', 'auth_refresh_token',
              'user_settings', 'user_preferences', 'game_stats',
              'telegram_init_data', 'last_sync_time',
              
              // ========== СТАТУСЫ И СОСТОЯНИЯ ==========
              'success', 'error', 'loading', 'idle', 'pending',
              'completed', 'failed', 'verified', 'not_started', 'started',
              'blocked', 'active', 'inactive', 'expired',
              
              // ========== MIME TYPES ==========
              'application/json', 'text/plain', 'multipart/form-data',
              
              // ========== КОДЫ ОШИБОК ==========
              'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR',
              'MISSING_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED',
              'TELEGRAM_VERIFICATION_FAILED', 'INSUFFICIENT_ATTEMPTS',
              
              // ========== ПЛАТФОРМЫ И ДОМЕНЫ ==========
              'telegram', 'web.telegram.org', 'notfren.com',
              'https://telegram.org', 'https://web.telegram.org',
              
              // ========== ВАЛЮТЫ И ПЛАТЕЖИ ==========
              'TON', 'USDT', 'USD', 'EUR', 'RUB',
              'invoice', 'payment', 'subscription',
              
              // ========== ИГРОВЫЕ КОНСТАНТЫ ==========
              'TELEGRAM_CHANNEL', 'TELEGRAM_CHAT', 'WEBSITE_VISIT',
              'TWITTER_FOLLOW', 'TWITTER_REPOST',
              'NOT_STARTED', 'STARTED', 'COMPLETED', 'REWARDED',
              
              // ========== УРОВНИ ЛОГИРОВАНИЯ ==========
              'debug', 'info', 'warn', 'error', 'trace',
              
              // ========== CSS КЛАССЫ ==========
              'dark', 'light', 'hidden', 'visible', 'loading', 'disabled',
              'active', 'inactive', 'selected', 'highlighted',
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