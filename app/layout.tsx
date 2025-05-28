// src/app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextUIProvider } from '@nextui-org/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Telegram Gifts Aggregator',
  description: 'Агрегатор подарков Telegram из различных маркетплейсов',
  viewport: 'width=device-width, initial-scale=1.0'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <NextUIProvider>
          <div className="dark text-foreground bg-background min-h-screen">
            <header className="border-b border-divider">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      🎁
                    </div>
                    <h1 className="text-xl font-bold">Telegram Gifts Aggregator</h1>
                  </div>
                  <div className="text-sm text-gray-400">
                    Мониторинг подарков в реальном времени
                  </div>
                </div>
              </div>
            </header>
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="border-t border-divider mt-12">
              <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div>© 2025 Telegram Gifts Aggregator</div>
                  <div className="flex items-center space-x-4">
                    <span>Источники: Tonnel Network</span>
                    <span>•</span>
                    <span>Обновление каждые 5 минут</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </NextUIProvider>
      </body>
    </html>
  )
}