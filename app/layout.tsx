// src/app/layout.tsx - Полная интеграция с Telegram WebApp API

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { Providers } from "./providers";
import NavigationWrapper from "@/components/Navigation/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "s0mething",
  description: "s0mething game???",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover"
  },
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "s0mething"
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="dark" lang="en">
      <head>
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/bpdots-diamond.otf"
          rel="preload"
          type="font/otf"
        />

        {/* Telegram Web App script - КРИТИЧЕСКИ ВАЖНО загружать первым */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        {/* PWA мета-теги */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Оптимизированный viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* Минимальные CSS стили */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Базовые стили для предотвращения только pull-to-refresh */
            html, body {
              overscroll-behavior-y: none !important;
              -webkit-overflow-scrolling: touch;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              position: fixed;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            
            /* Основной контейнер */
            #__next {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              overflow: auto;
              overscroll-behavior-y: none;
              -webkit-overflow-scrolling: touch;
            }

            /* Отключение выделения и zoom только для элементов игры */
            .game-container, .game-container * {
              -webkit-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
              touch-action: manipulation !important;
            }

            /* Остальные элементы сохраняют нормальное поведение */
            button, input, select, textarea {
              -webkit-tap-highlight-color: transparent;
            }

            /* Предупреждение об ориентации */
            .landscape-warning {
              display: none;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.95);
              z-index: 99999;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              color: white;
              font-family: 'BPDots Diamond', monospace;
              text-align: center;
              padding: 20px;
            }
            
            @media screen and (orientation: landscape) and (max-height: 500px) {
              .landscape-warning {
                display: flex !important;
              }
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        {/* Предупреждение о ландшафтной ориентации */}
        <div className="landscape-warning">
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            Please rotate your device
          </div>
          <div style={{ fontSize: '16px', opacity: 0.8, marginBottom: '10px' }}>
            This app works best in portrait mode
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>
            Turn off rotation lock if needed
          </div>
        </div>

        <Providers>
          {children}
          <NavigationWrapper />
        </Providers>

        {/* ОБНОВЛЕННАЯ Telegram WebApp инициализация с полной поддержкой API */}
        <Script id="telegram-webapp-init" strategy="afterInteractive">
          {`
            // Глобальные переменные для отслеживания состояния
            window.telegramWebAppReady = false;
            window.telegramWebAppError = null;

            // Функция комплексной инициализации Telegram WebApp
            function initTelegramWebApp() {
              console.log('🚀 Starting Telegram WebApp initialization...');
              
              if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
                console.warn('⚠️ Telegram WebApp API not available - running in browser mode');
                window.telegramWebAppError = 'API_NOT_AVAILABLE';
                initFallbackMode();
                return;
              }

              const tg = window.Telegram.WebApp;
              
              try {
                console.log('🤖 Telegram WebApp v' + tg.version + ' detected on ' + tg.platform);
                
                // 1. БАЗОВАЯ ИНИЦИАЛИЗАЦИЯ
                console.log('📱 Step 1: Basic initialization');
                tg.ready();
                tg.setHeaderColor('#000000');
                tg.setBackgroundColor('#000000');
                
                // 2. АВТОМАТИЧЕСКОЕ РАЗВОРАЧИВАНИЕ НА ВЕСЬ ЭКРАН
                console.log('📏 Step 2: Expanding to full screen');
                tg.expand();
                
                // Дополнительная проверка расширения через таймаут
                setTimeout(() => {
                  if (!tg.isExpanded) {
                    console.log('🔄 Re-attempting expansion...');
                    tg.expand();
                  } else {
                    console.log('✅ App successfully expanded to full screen');
                  }
                }, 500);

                // 3. ОТКЛЮЧЕНИЕ ВЕРТИКАЛЬНЫХ СВАЙПОВ (Bot API 7.7+)
                console.log('🚫 Step 3: Disabling vertical swipes');
                if (typeof tg.disableVerticalSwipes === 'function') {
                  tg.disableVerticalSwipes();
                  console.log('✅ Vertical swipes disabled via native API');
                } else {
                  console.warn('⚠️ disableVerticalSwipes not supported - using fallback');
                  initLegacySwipeBlock();
                }

                // 4. БЛОКИРОВКА ОРИЕНТАЦИИ В ПОРТРЕТНОМ РЕЖИМЕ
                console.log('🔒 Step 4: Locking orientation');
                if (typeof tg.lockOrientation === 'function') {
                  tg.lockOrientation();
                  console.log('✅ Orientation locked to portrait');
                } else {
                  console.warn('⚠️ Orientation lock not supported in this version');
                }

                // 5. ВКЛЮЧЕНИЕ ПОДТВЕРЖДЕНИЯ ЗАКРЫТИЯ
                console.log('🛡️ Step 5: Enabling closing confirmation');
                if (typeof tg.enableClosingConfirmation === 'function') {
                  tg.enableClosingConfirmation();
                  console.log('✅ Closing confirmation enabled');
                } else {
                  console.warn('⚠️ Closing confirmation not supported');
                }

                // 6. ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ТЕМЫ
                console.log('🎨 Step 6: Additional theme settings');
                if (typeof tg.setBottomBarColor === 'function') {
                  tg.setBottomBarColor('#000000');
                  console.log('✅ Bottom bar color set');
                }

                // 7. ЛОГИРОВАНИЕ ФИНАЛЬНОГО СОСТОЯНИЯ
                console.log('📊 Final WebApp state:');
                console.log('   - Expanded:', tg.isExpanded);
                console.log('   - Version:', tg.version);
                console.log('   - Platform:', tg.platform);
                console.log('   - Viewport height:', tg.viewportHeight);
                console.log('   - Viewport stable height:', tg.viewportStableHeight);
                
                if (typeof tg.isVerticalSwipesEnabled !== 'undefined') {
                  console.log('   - Vertical swipes enabled:', tg.isVerticalSwipesEnabled);
                }
                if (typeof tg.isOrientationLocked !== 'undefined') {
                  console.log('   - Orientation locked:', tg.isOrientationLocked);
                }
                if (typeof tg.isClosingConfirmationEnabled !== 'undefined') {
                  console.log('   - Closing confirmation:', tg.isClosingConfirmationEnabled);
                }

                window.telegramWebAppReady = true;
                console.log('🎉 Telegram WebApp initialization completed successfully!');

              } catch (error) {
                console.error('❌ Telegram WebApp initialization failed:', error);
                window.telegramWebAppError = error.message;
                initFallbackMode();
              }
            }

            // Фолбэк для старых версий Telegram или браузерного режима
            function initLegacySwipeBlock() {
              console.log('🔧 Initializing legacy swipe blocking...');
              
              let startY = 0;
              let startX = 0;
              
              document.addEventListener('touchstart', function(e) {
                startY = e.touches[0].pageY;
                startX = e.touches[0].pageX;
              }, { passive: true });
              
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) {
                  return; // Позволяем мультитач
                }
                
                const currentY = e.touches[0].pageY;
                const currentX = e.touches[0].pageX;
                const deltaY = currentY - startY;
                const deltaX = currentX - startX;
                
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const isAtTop = scrollTop <= 10;
                
                // Блокируем только pull-to-refresh: 
                // - находимся наверху страницы
                // - движение преимущественно вертикальное вниз
                // - вертикальное движение больше горизонтального (не горизонтальный свайп)
                if (isAtTop && deltaY > 30 && Math.abs(deltaY) > Math.abs(deltaX) * 2) {
                  e.preventDefault();
                }
              }, { passive: false });
              
              console.log('✅ Legacy swipe blocking initialized');
            }

            // Фолбэк режим для браузеров без Telegram API
            function initFallbackMode() {
              console.log('🌐 Initializing fallback mode for browser...');
              initLegacySwipeBlock();
              
              // Блокировка zoom жестов
              document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gesturechange', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gestureend', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              console.log('✅ Fallback mode initialized');
            }

            // Глобальная функция для проверки готовности (может использоваться в компонентах)
            window.isTelegramWebAppReady = function() {
              return window.telegramWebAppReady === true;
            };

            // Глобальная функция для получения ошибок
            window.getTelegramWebAppError = function() {
              return window.telegramWebAppError;
            };

            // Инициализация при загрузке
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initTelegramWebApp);
            } else {
              initTelegramWebApp();
            }

            // Дополнительная инициализация через небольшую задержку на случай медленной загрузки API
            setTimeout(() => {
              if (!window.telegramWebAppReady && !window.telegramWebAppError) {
                console.log('🔄 Retrying Telegram WebApp initialization...');
                initTelegramWebApp();
              }
            }, 1000);
          `}
        </Script>
      </body>
    </html>
  );
}