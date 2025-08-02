// src/components/AttemptsDisplay/AttemptsInfoModal.tsx - Полностью исправленная версия с порталом

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Clock, ShoppingCart, Zap } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import type { AttemptsStatus } from "@/hooks/modules/useAttempts";

interface AttemptsInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    attemptsStatus: AttemptsStatus | null;
    attemptsRemaining: number;
}

const AttemptsInfoModal: React.FC<AttemptsInfoModalProps> = ({
    isOpen,
    onClose,
    attemptsStatus,
    attemptsRemaining,
}) => {
    const t = useT();
    const router = useRouter();

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleVisitShop = () => {
        onClose();
        router.push("/shop");
    };

    const formatResetTime = (resetTime: Date): string => {
        const now = new Date();
        const diff = resetTime.getTime() - now.getTime();

        if (diff <= 0) return t("attempts.modal.resetNow");

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (hours > 0) {
            return t("attempts.modal.resetInHours", { hours, minutes });
        } else {
            return t("attempts.modal.resetInMinutes", { minutes });
        }
    };

    const isEmpty = attemptsRemaining === 0;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Backdrop */}
            <div
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                    }
                }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div
                    className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full h-[70vh] relative overflow-hidden flex flex-col"
                    style={{
                        clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                    }}
                >
                    {/* Semi-transparent background overlay */}
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                    {/* Header - Fixed */}
                    <div className="relative z-10 p-6 pb-4 border-b border-white/20 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <h2 className="text-xl font-mono tracking-[0.15em] uppercase">
                                    {t("attempts.modal.title")}
                                </h2>
                            </div>
                            <button
                                className="w-8 h-8 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                                style={{
                                    clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                                }}
                                onClick={onClose}
                            >
                                <X className="text-white" size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="relative z-10 flex-1 overflow-y-auto">
                        <div className="p-6 pt-4">
                            <div className="space-y-6">
                                {/* Current Status */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-3">
                                        <Zap
                                            className={isEmpty ? "text-red-400" : "text-green-400"}
                                            size={24}
                                        />
                                        <h3 className="text-2xl font-mono tracking-widest">
                                            {attemptsRemaining}
                                        </h3>
                                    </div>
                                    <div className="text-sm text-white/70">
                                        {isEmpty
                                            ? t("attempts.modal.noAttemptsLeft")
                                            : t("attempts.modal.attemptsRemaining", { count: attemptsRemaining })
                                        }
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Reset Information - показывается только когда попытки закончились */}
                                {isEmpty && attemptsStatus?.resetTime && (
                                    <>
                                        <div>
                                            <div className="mb-3">
                                                <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                                    {t("attempts.modal.nextReset")}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-3 pl-6">
                                                <Clock className="text-green-400" size={16} />
                                                <span className="text-white/80 font-mono">
                                                    {formatResetTime(attemptsStatus.resetTime)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                    </>
                                )}

                                {/* How Attempts Work */}
                                <div>
                                    <div className="mb-4">
                                        <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                            {t("attempts.modal.howItWorks")}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm text-white/80">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("attempts.modal.rule1")}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("attempts.modal.rule2")}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("attempts.modal.rule3")}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("attempts.modal.rule4")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Why Attempts Matter */}
                                <div>
                                    <div className="mb-4">
                                        <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                            {t("attempts.modal.whyImportant")}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm text-white/80">
                                        <p>{t("attempts.modal.importance1")}</p>
                                        <p>{t("attempts.modal.importance2")}</p>
                                        <p className="text-white/60 italic">{t("attempts.modal.importance3")}</p>
                                    </div>
                                </div>

                                {/* Shop Section - показывается всегда */}
                                <div>
                                    <div className="mb-4">
                                        <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                            {t("attempts.modal.needMore")}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm text-white/80">
                                        <p>{t("attempts.modal.shopDescription")}</p>
                                        <p className="text-white/60 text-xs">{t("attempts.modal.shopDisclaimer")}</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Important Information */}
                                <div className="space-y-3 text-xs font-mono tracking-wide">
                                    <div className="text-yellow-300/90">
                                        {t("attempts.modal.automaticReset")}
                                    </div>
                                    <div className="text-white/70">
                                        {t("attempts.modal.fairPlay")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixed (Only show shop button if out of attempts) */}
                    {isEmpty && (
                        <div className="relative z-10 p-6 pt-4 border-t border-white/20 flex-shrink-0">
                            <button
                                className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 group flex items-center justify-center space-x-3"
                                style={{
                                    clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                                }}
                                onClick={handleVisitShop}
                            >
                                <ShoppingCart
                                    className="text-yellow-300 group-hover:scale-110 transition-transform duration-300"
                                    size={16}
                                />
                                <span className="font-mono text-sm tracking-[0.15em] uppercase text-yellow-300">
                                    {t("attempts.modal.visitShop")}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Render modal using portal to document.body
    return createPortal(modalContent, document.body);
};

export default AttemptsInfoModal;