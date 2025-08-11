// src/app/layout.tsx - Enhanced with global text selection prevention

import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { Providers } from "./providers";

import NavigationWrapper from "@/components/Navigation/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Circusle",
  description: "Play. Tap. Win. Dab.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Circusle",
  },
  manifest: "/manifest.json",
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
        {/* Telegram Web App script */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/* PWA and safe area support */}
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta
          content="black-translucent"
          name="apple-mobile-web-app-status-bar-style"
        />
        <meta content="telephone=no" name="format-detection" />
        <meta content="no" name="msapplication-tap-highlight" />
        {/* Enhanced viewport for text selection prevention */}
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
          name="viewport"
        />

        {/* Inline styles for immediate text selection prevention */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            * {
              -webkit-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            
            input[type="text"],
            input[type="email"], 
            input[type="password"],
            input[type="search"],
            input[type="url"],
            textarea,
            [contenteditable="true"],
            .selectable-text {
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
              -webkit-touch-callout: default !important;
            }
            
            ::selection {
              background: transparent !important;
            }
            
            ::-moz-selection {
              background: transparent !important;
            }
          `,
          }}
        />

        {/* Global event handlers for text selection prevention */}
        <Script id="text-selection-prevention" strategy="afterInteractive">
          {`
            (function() {
              // Prevent context menu
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              }, { passive: false });
              
              // Prevent text selection
              document.addEventListener('selectstart', function(e) {
                if (!e.target.matches('input, textarea, [contenteditable="true"], .selectable-text')) {
                  e.preventDefault();
                  return false;
                }
              }, { passive: false });
              
              // Prevent drag start
              document.addEventListener('dragstart', function(e) {
                if (!e.target.matches('input, textarea, [contenteditable="true"], .selectable-text')) {
                  e.preventDefault();
                  return false;
                }
              }, { passive: false });
              
              // Prevent keyboard shortcuts
              document.addEventListener('keydown', function(e) {
                const isCtrlA = (e.ctrlKey || e.metaKey) && e.key === 'a';
                const isF12 = e.key === 'F12';
                const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I';
                const isCtrlU = (e.ctrlKey || e.metaKey) && e.key === 'u';
                
                if (isCtrlA || isF12 || isCtrlShiftI || isCtrlU) {
                  e.preventDefault();
                  return false;
                }
              }, { passive: false });
              
              // Mobile-specific handlers
              if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                // Prevent zoom on double tap
                let lastTouchEnd = 0;
                document.addEventListener('touchend', function(e) {
                  const now = new Date().getTime();
                  if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                  }
                  lastTouchEnd = now;
                }, { passive: false });
                
                // Prevent long press context menu
                document.addEventListener('touchstart', function(e) {
                  if (e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
              }
            })();
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <NavigationWrapper />
        </Providers>
      </body>
    </html>
  );
}
