// src/app/layout.tsx

import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Telegram Mini App",
  description: "Telegram Mini App with Next.js",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
