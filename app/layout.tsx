// src/app/layout.tsx
// ИСПРАВЛЕНО: Правильный порядок провайдеров и компонентов

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "s0mething",
  description: "s0mething game???",
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
    title: "s0mething",
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
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta
          content="black-translucent"
          name="apple-mobile-web-app-status-bar-style"
        />
        <meta content="telephone=no" name="format-detection" />
        <meta content="no" name="msapplication-tap-highlight" />
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          name="viewport"
        />
      </head>
      <body className={inter.className}>
        {/* ИСПРАВЛЕНО: Весь контент теперь внутри Providers */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}