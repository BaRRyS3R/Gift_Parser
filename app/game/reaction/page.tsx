// src/app/game/reaction/page.tsx

"use client";

import { useRouter } from "next/navigation";

import ReactionGameManager from "@/game-modes/reaction/ReactionGameManager";

export default function ReactionGamePage() {
  const router = useRouter();

  const handleBackToMenu = () => {
    router.push("/main");
  };

  return <ReactionGameManager onBackToMenu={handleBackToMenu} />;
}
