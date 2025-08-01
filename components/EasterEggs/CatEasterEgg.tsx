// src/components/EasterEggs/CatEasterEgg.tsx

"use client";

import React, { useState, useEffect } from "react";

interface CatEasterEggProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function CatEasterEgg({
  isVisible,
  onComplete,
}: CatEasterEggProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isVisible && !isActive) {
      setIsActive(true);

      // Complete animation after 9 seconds
      const completeTimeout = setTimeout(() => {
        setIsActive(false);
        onComplete();
      }, 6000);

      return () => {
        clearTimeout(completeTimeout);
      };
    }
  }, [isVisible, isActive, onComplete]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none cat-easter-egg-container"
      style={{
        height: "100vh",
      }}
    >
      <div className="flex items-end justify-center h-full pb-16">
        <div className="relative cat-image-container">
          <img
            alt=""
            className="cat-image"
            draggable={false}
            src="https://notfren.com/circusle/ee/cat.png"
            style={{
              width: "280px",
              height: "280px",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
            style={{
              width: "240px",
              height: "60px",
              background:
                "radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)",
              filter: "blur(15px)",
              zIndex: -1,
            }}
          />
        </div>
      </div>
    </div>
  );
}
