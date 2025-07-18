// src/app/not-found.tsx - Standalone 404 page without context dependencies

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client side to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <h2 className="text-2xl mb-6">Page Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Background gradient for visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50" />
      
      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
        {/* Error icon */}
        <div className="w-24 h-24 mx-auto bg-white/10 border-2 border-white/30 rounded-full flex items-center justify-center">
          <div className="text-4xl">🕳️</div>
        </div>

        {/* Error message */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white tracking-wider">404</h1>
          <h2 className="text-2xl font-semibold text-white/90">Page Not Found</h2>
          <p className="text-white/60 leading-relaxed">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          <Link
            href="/main"
            className="inline-block w-full px-8 py-4 bg-white/15 border-2 border-white/30 text-white rounded-xl font-semibold hover:border-white hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Return Home
          </Link>
          
          <Link
            href="/game"
            className="inline-block w-full px-8 py-3 bg-transparent border border-white/20 text-white/80 rounded-xl font-medium hover:border-white/40 hover:text-white transition-all duration-300"
          >
            Browse Games
          </Link>
        </div>

        {/* Additional help text */}
        <div className="text-center">
          <p className="text-white/40 text-sm">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
      <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}