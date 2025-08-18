// src/components/MatreshkaAccordion.tsx
"use client";

import React, { useState } from "react";
import { Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, Button } from "@nextui-org/react";
import { ChevronDown, ChevronRight, Play } from "lucide-react";

interface AccordionLevel {
    id: number;
    emoji: string;
    isOpen: boolean;
}

export default function MatreshkaAccordion() {
    const [levels, setLevels] = useState<AccordionLevel[]>([
        { id: 1, emoji: "💪", isOpen: false },
        { id: 2, emoji: "🎪", isOpen: false },
        { id: 3, emoji: "🎭", isOpen: false },
        { id: 4, emoji: "🎨", isOpen: false },
        { id: 5, emoji: "🎉", isOpen: false },
    ]);

    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    const openVideoModal = () => {
        setIsVideoModalOpen(true);

        // Haptic feedback for video opening
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
            } catch (error) {
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]); // Celebration vibration
                }
            }
        }
    };

    const toggleLevel = (levelId: number) => {
        setLevels(prev => prev.map(level => {
            if (level.id === levelId) {
                return { ...level, isOpen: !level.isOpen };
            }
            // Close all deeper levels when closing a parent
            if (level.id > levelId) {
                return { ...level, isOpen: false };
            }
            return level;
        }));
    };

    const renderLevel = (level: AccordionLevel, depth: number = 0): React.ReactNode => {
        const isLastLevel = level.id === 5;
        const nextLevel = levels.find(l => l.id === level.id + 1);

        return (
            <Card
                key={level.id}
                className={`
          bg-white/5 border border-white/20 
          hover:border-white/30 hover:bg-white/10
          transition-all duration-300
          ${depth > 0 ? 'mt-3' : ''}
        `}
                style={{ marginLeft: `${depth * 12}px` }}
            >
                <CardBody className="p-3">
                    <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        role="button"
                        tabIndex={0}
                        aria-expanded={level.isOpen}
                        onClick={() => toggleLevel(level.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleLevel(level.id);
                            }
                        }}
                        style={{
                            WebkitTapHighlightColor: "transparent",
                            WebkitTouchCallout: "none",
                            WebkitUserSelect: "none",
                            userSelect: "none",
                            touchAction: "manipulation",
                        }}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">{level.emoji}</span>
                        </div>

                        <div className="text-white/50">
                            {level.isOpen ? (
                                <ChevronDown size={20} className="transform transition-transform duration-200" />
                            ) : (
                                <ChevronRight size={20} className="transform transition-transform duration-200" />
                            )}
                        </div>
                    </div>

                    {/* Content area with smooth animation */}
                    <div
                        className={`
              overflow-hidden transition-all duration-500 ease-in-out
              ${level.isOpen ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}
            `}
                    >
                        {isLastLevel && level.isOpen ? (
                            // Final level content with button to open video modal
                            <div className="text-center space-y-4">
                                <Button
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                                    size="lg"
                                    startContent={<Play size={20} />}
                                    onPress={openVideoModal}
                                >
                                    🎁
                                </Button>
                            </div>
                        ) : (
                            // Render next level if current is open and there is a next level
                            level.isOpen && nextLevel && renderLevel(nextLevel, depth + 1)
                        )}
                    </div>
                </CardBody>
            </Card>
        );
    };

    const firstLevel = levels[0];

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-4">
                <span className="text-white/40 text-xs uppercase tracking-wider">
                    Bonus Content
                </span>
            </div>
            {renderLevel(firstLevel)}

            {/* Video Modal */}
            <Modal
                isOpen={isVideoModalOpen}
                onClose={() => setIsVideoModalOpen(false)}
                size="lg"
                classNames={{
                    body: "py-6",
                    backdrop: "bg-black/50 backdrop-opacity-40",
                    base: "border-white/20 bg-gradient-to-r from-gray-900 to-black text-white",
                    header: "border-b-[1px] border-white/20",
                    footer: "border-t-[1px] border-white/20",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold text-center">
                            🎉 NOTHING 🎉
                        </h2>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex justify-center">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="rounded-lg max-w-full h-auto border border-white/20"
                                style={{ maxHeight: '300px' }}
                            >
                                <source src="https://notfren.com/circusle/kek.webm" type="video/webm" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </div>
    );
}
