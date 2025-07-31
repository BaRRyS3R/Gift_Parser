// src/components/EasterEggs/StonksEasterEgg.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";

interface StonksEasterEggProps {
    isActive: boolean;
    onComplete: () => void;
}

const StonksEasterEgg: React.FC<StonksEasterEggProps> = ({
    isActive,
    onComplete,
}) => {
    const [showArrow, setShowArrow] = useState(false);
    const [showHodlText, setShowHodlText] = useState(false);
    const [showRockets, setShowRockets] = useState(false);
    const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        if (!isActive) {
            // Clear all timeouts and reset state
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current = [];
            setShowArrow(false);
            setShowHodlText(false);
            setShowRockets(false);
            return;
        }

        // Start the stonks sequence
        const sequence = [
            // Phase 1: Show arrow and start price animations (immediately)
            () => {
                setShowArrow(true);
                // Add stonks class to all product cards
                const productCards = document.querySelectorAll('[data-product-card]');
                productCards.forEach((card) => {
                    card.classList.add('stonks-vibrate');
                });

                // Replace all prices with stonks text
                const priceElements = document.querySelectorAll('[data-price]');
                priceElements.forEach((element) => {
                    const originalPrice = element.textContent;
                    element.setAttribute('data-original-price', originalPrice || '');
                    element.textContent = '📈 TO THE MOON 🚀';
                    element.classList.add('stonks-price');
                });
            },

            // Phase 2: Show HODL text (500ms delay)
            () => setShowHodlText(true),

            // Phase 3: Show rockets (1000ms delay)
            () => setShowRockets(true),

            // Phase 4: Start cleanup (4000ms delay)
            () => {
                setShowArrow(false);
                setShowHodlText(false);
                setShowRockets(false);

                // Remove stonks effects from cards
                const productCards = document.querySelectorAll('[data-product-card]');
                productCards.forEach((card) => {
                    card.classList.remove('stonks-vibrate');
                });

                // Restore original prices
                const priceElements = document.querySelectorAll('[data-price]');
                priceElements.forEach((element) => {
                    const originalPrice = element.getAttribute('data-original-price');
                    if (originalPrice) {
                        element.textContent = originalPrice;
                        element.removeAttribute('data-original-price');
                        element.classList.remove('stonks-price');
                    }
                });
            },

            // Phase 5: Complete (5000ms delay)
            () => onComplete(),
        ];

        // Execute sequence with delays
        const delays = [0, 500, 1000, 4000, 5000];

        sequence.forEach((action, index) => {
            const timeout = setTimeout(action, delays[index]);
            timeoutRefs.current.push(timeout);
        });

        // Trigger haptic feedback if available
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }

        // Cleanup function
        return () => {
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current = [];
        };
    }, [isActive, onComplete]);

    if (!isActive) return null;

    return (
        <>
            {/* Background Overlay */}
            <div className="stonks-overlay" />

            {/* Green Arrow */}
            {showArrow && (
                <div className="stonks-arrow">
                    <div className="stonks-arrow-shape">📈</div>
                </div>
            )}

            {/* HODL Text */}
            {showHodlText && (
                <div className="stonks-hodl-text">
                    <div className="stonks-hodl-content">
                        HODL
                        <div className="stonks-hodl-subtitle">💎🙌</div>
                    </div>
                </div>
            )}

            {/* Floating Rockets */}
            {showRockets && (
                <div className="stonks-rockets">
                    <div className="stonks-rocket stonks-rocket-1">🚀</div>
                    <div className="stonks-rocket stonks-rocket-2">🚀</div>
                    <div className="stonks-rocket stonks-rocket-3">🚀</div>
                    <div className="stonks-rocket stonks-rocket-4">🚀</div>
                    <div className="stonks-rocket stonks-rocket-5">🚀</div>
                    <div className="stonks-rocket stonks-rocket-6">🚀</div>
                </div>
            )}
        </>
    );
};

export default StonksEasterEgg;