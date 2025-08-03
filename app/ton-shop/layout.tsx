// src/app/ton-shop/layout.tsx

import { ReactNode } from "react";
import { TonShopProvider } from "./components/ton-shop-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "TON Shop - Purchase Game Attempts",
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
    return (
        <TonShopProvider>
            {children}
        </TonShopProvider>
    );
}