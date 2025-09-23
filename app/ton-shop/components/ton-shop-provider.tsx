// src/app/ton-shop/components/ton-shop-provider.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { TonConnectUIProvider, THEME } from "@tonconnect/ui-react";
import { Spinner } from "@nextui-org/react";

interface TonShopProviderProps {
  children: ReactNode;
}

// Define platform types explicitly
type Platform =
  | "ios"
  | "android"
  | "chrome"
  | "firefox"
  | "safari"
  | "windows"
  | "macos"
  | "linux";

// Define wallet configurations with proper typing
const WALLET_CONFIGS = [
  {
    appName: "tonkeeper",
    name: "Tonkeeper",
    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
    aboutUrl: "https://tonkeeper.com",
    universalLink: "https://app.tonkeeper.com/ton-connect",
    jsBridgeKey: "tonkeeper",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
    platforms: [
      "ios",
      "android",
      "chrome",
      "firefox",
      "safari",
      "windows",
      "macos",
      "linux",
    ] as Platform[],
  },
  {
  appName: "mytonwallet",
  name: "MyTonWallet",
  imageUrl: "https://mytonwallet.io/icon-256.png",         
  aboutUrl: "https://mytonwallet.io",                        
  universalLink: "https://connect.mytonwallet.org/",          
  bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge", 
  platforms: [
    "ios",
    "android",
    "windows",
    "macos",
    "linux",
    "chrome",
    "firefox",
    "safari",
  ] as Platform[],
  },
];

export function TonShopProvider({ children }: TonShopProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Определяем URL манифеста с учетом среды выполнения
  const getManifestUrl = () => {
    if (typeof window === "undefined") {
      return `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/tonconnect-manifest.json`;
    }

    return `${window.location.origin}/tonconnect-manifest.json`;
  };

  useEffect(() => {
    // Проверяем доступность браузерного окружения
    if (typeof window === "undefined") {
      setError("This page can only be accessed in a browser");

      return;
    }

    // Проверяем, что страница открыта в правильном контексте
    const isValidContext =
      window.Telegram?.WebApp || window.location.search.includes("initdata");

    if (!isValidContext && process.env.NODE_ENV === "production") {
      setError("This page must be accessed through the Telegram app");

      return;
    }

    setIsReady(true);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">Access Error</h2>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner color="white" size="lg" />
          <p className="text-white/70">Initializing TON Connect...</p>
        </div>
      </div>
    );
  }

  return (
    <TonConnectUIProvider
      manifestUrl={getManifestUrl()}
      uiPreferences={{
        theme: THEME.DARK,
      }}
      walletsListConfiguration={{
        includeWallets: WALLET_CONFIGS,
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}
