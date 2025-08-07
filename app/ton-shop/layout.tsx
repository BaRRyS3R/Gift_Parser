// src/app/ton-shop/layout.tsx

import type { Metadata } from "next";

import { ReactNode } from "react";

import { TonShopProvider } from "./components/ton-shop-provider";

export const metadata: Metadata = {
  title: "Circusle",
  description: "Purchase game attempts using TON cryptocurrency",
  robots: {
    index: false,
    follow: false,
  },
};

interface TonShopLayoutProps {
  children: ReactNode;
}

export default function TonShopLayout({ children }: TonShopLayoutProps) {
  return <TonShopProvider>{children}</TonShopProvider>;
}
