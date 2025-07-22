// src/components/backgrounds/LightRays.tsx - Light rays background effect

import React from 'react';

interface LightRaysProps {
    className?: string;
    opacity?: number;
}

export default function LightRays({ className = '', opacity = 0.3 }: LightRaysProps) {
    return (
        <div className={`absolute inset-0 overflow-hidden ${className}`}>
            <div
                className="absolute inset-0"
                style={{
                    background: `
            radial-gradient(ellipse at center top, 
              rgba(255, 255, 255, ${opacity * 0.8}) 0%, 
              rgba(255, 255, 255, ${opacity * 0.4}) 20%, 
              transparent 70%
            ),
            conic-gradient(from 0deg at 50% -20%, 
              transparent 0deg,
              rgba(255, 255, 255, ${opacity * 0.2}) 60deg,
              rgba(255, 255, 255, ${opacity * 0.6}) 90deg,
              rgba(255, 255, 255, ${opacity * 0.2}) 120deg,
              transparent 180deg,
              rgba(255, 255, 255, ${opacity * 0.2}) 240deg,
              rgba(255, 255, 255, ${opacity * 0.6}) 270deg,
              rgba(255, 255, 255, ${opacity * 0.2}) 300deg,
              transparent 360deg
            )
          `,
                    maskImage: `
            linear-gradient(to bottom,
              black 0%,
              black 40%,
              transparent 100%
            )
          `,
                    WebkitMaskImage: `
            linear-gradient(to bottom,
              black 0%,
              black 40%,
              transparent 100%
            )
          `
                }}
            />
        </div>
    );
}