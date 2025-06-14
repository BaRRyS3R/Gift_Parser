// src/app/layout.tsx - Complete with Telegram WebApp controls

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
        {/* Telegram Web App script - ВАЖНО: загружается первым */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        {/* PWA и мобильные мета-теги */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Расширенный viewport с блокировкой overscroll */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />

        {/* CSS для блокировки pull-to-refresh и других мобильных жестов */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Глобальная блокировка pull-to-refresh и zoom */
            html, body {
              overscroll-behavior: none !important;
              overscroll-behavior-y: none !important;
              touch-action: pan-x pan-y !important;
              -webkit-overflow-scrolling: touch;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
              position: fixed;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            
            /* Основной контейнер приложения */
            #__next {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              overflow: auto;
              overscroll-behavior: none;
              -webkit-overflow-scrolling: touch;
            }

            /* Блокировка zoom на inputs */
            button, input, select, textarea {
              touch-action: manipulation !important;
              -webkit-tap-highlight-color: transparent;
            }

            /* Предотвращение выделения текста в игре */
            .game-container, .game-container * {
              -webkit-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            /* Ориентационное предупреждение для ландшафтного режима */
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

        {/* Telegram WebApp инициализация и контролы */}
        <Script id="telegram-webapp-init" strategy="afterInteractive">
          {`
            // Функция инициализации Telegram WebApp
            function initTelegramWebApp() {
              if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                
                try {
                  console.log('🤖 Initializing Telegram WebApp v' + tg.version + ' on ' + tg.platform);
                  
                  // Базовая инициализация
                  tg.ready();
                  tg.expand();
                  tg.setHeaderColor('#000000');
                  tg.setBackgroundColor('#000000');
                  
                  // 🔒 БЛОКИРОВКА ОРИЕНТАЦИИ В ПОРТРЕТНОМ РЕЖИМЕ
                  if (tg.lockOrientation) {
                    tg.lockOrientation();
                    console.log('✅ Orientation locked to portrait');
                  } else {
                    console.warn('⚠️ Orientation lock not supported in this Telegram version');
                  }
                  
                  // 🚫 ОТКЛЮЧЕНИЕ ВЕРТИКАЛЬНЫХ СВАЙПОВ (pull-to-refresh)
                  if (tg.disableVerticalSwipes) {
                    tg.disableVerticalSwipes();
                    console.log('✅ Vertical swipes disabled (pull-to-refresh blocked)');
                  } else {
                    console.warn('⚠️ Vertical swipes control not supported in this Telegram version');
                  }
                  
                  // 🛡️ ВКЛЮЧЕНИЕ ПОДТВЕРЖДЕНИЯ ЗАКРЫТИЯ
                  if (tg.enableClosingConfirmation) {
                    tg.enableClosingConfirmation();
                    console.log('✅ Closing confirmation enabled');
                  }
                  
                  // Логирование статуса
                  if (tg.isOrientationLocked !== undefined) {
                    console.log('📱 Orientation locked:', tg.isOrientationLocked);
                  }
                  if (tg.isVerticalSwipesEnabled !== undefined) {
                    console.log('👆 Vertical swipes enabled:', tg.isVerticalSwipesEnabled);
                  }
                  
                } catch (error) {
                  console.error('❌ Telegram WebApp initialization error:', error);
                }
              } else {
                console.warn('⚠️ Telegram WebApp API not available - running in browser mode');
              }
            }
            
            // Дополнительная блокировка pull-to-refresh через touch events
            function initTouchControls() {
              let startY = 0;
              let isAtTop = true;
              
              // Предотвращение pull-to-refresh
              document.addEventListener('touchstart', function(e) {
                startY = e.touches[0].pageY;
                isAtTop = window.scrollY <= 10;
              }, { passive: false });
              
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) {
                  // Блокируем pinch-to-zoom
                  e.preventDefault();
                  return;
                }
                
                const y = e.touches[0].pageY;
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                
                // Блокируем pull-to-refresh когда наверху страницы и тянем вниз
                if (scrollTop <= 10 && y > startY && isAtTop) {
                  e.preventDefault();
                }
              }, { passive: false });
              
              // Блокировка жестов масштабирования
              document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gesturechange', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gestureend', function(e) {
                e.preventDefault();
              }, { passive: false });
              
              console.log('✅ Touch controls initialized');
            }
            
            // Инициализация при загрузке страницы
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() {
                initTelegramWebApp();
                initTouchControls();
              });
            } else {
              initTelegramWebApp();
              initTouchControls();
            }
          `}
        </Script>
      </body>
    </html>
  );
}