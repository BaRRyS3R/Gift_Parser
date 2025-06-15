// src/app/game/survival/page.tsx

"use client";

import { useRouter } from "next/navigation";

import SurvivalGameManager from "@/game-modes/survival/SurvivalGameManager";

export default function SurvivalGamePage() {
  const router = useRouter();

  const handleBackToMenu = () => {
    router.push("/game");
  };

  return <SurvivalGameManager onBackToMenu={handleBackToMenu} />;
}
