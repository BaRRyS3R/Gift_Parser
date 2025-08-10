// src/components/Security/GyroscopePermissionModal.tsx - Модальное окно для запроса разрешения гироскопа

"use client";

import { useEffect } from "react";
import { Compass, Shield, Settings } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface GyroscopePermissionModalProps {
    isOpen: boolean;
    isRequesting: boolean;
    error: string | null;
    onRequestPermission: () => Promise<void>;
    onClose?: () => void; // Опциональное закрытие для случаев когда гироскоп недоступен
}

export default function GyroscopePermissionModal({
    isOpen,
    isRequesting,
    error,
    onRequestPermission,
    onClose,
}: GyroscopePermissionModalProps): JSX.Element | null {
    const t = useT();

    // Блокировка скролла страницы при открытом модальном окне
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "unset";
            };
        }
    }, [isOpen]);

    // Обработка клавиши Escape (только если есть функция закрытия)
    useEffect(() => {
        if (!isOpen || !onClose) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop с размытием */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Модальное окно */}
            <div className="relative w-full max-w-md animate-fade-in">
                {/* Future-tech контейнер с полигональными срезами */}
                <div
                    className="bg-black/95 backdrop-blur-xl border-2 border-blue-400/40 text-white w-full relative overflow-hidden"
                    style={{
                        clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                    }}
                >
                    {/* Внутренний градиент */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />

                    {/* Анимированная рамка */}
                    <div className="absolute inset-0 border border-blue-400/20 pointer-events-none animate-pulse" />

                    {/* Контент */}
                    <div className="relative z-10 p-6 space-y-6">
                        {/* Заголовок с иконкой */}
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                                <Compass className="text-blue-400" size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold tracking-wider text-blue-300 mb-2">
                                    {t("game.gyroscope.modal.title")}
                                </h3>
                                <p className="text-blue-200/80 text-sm leading-relaxed">
                                    {t("game.gyroscope.modal.description")}
                                </p>
                            </div>
                        </div>

                        {/* Разделитель */}
                        <div className="h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

                        {/* Информационный блок */}
                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2">
                                <Shield className="text-blue-400 flex-shrink-0" size={16} />
                                <span className="text-blue-300 font-mono text-sm tracking-wider uppercase">
                                    {t("game.gyroscope.modal.requirement")}
                                </span>
                            </div>
                            <p className="text-blue-200/70 text-xs leading-relaxed">
                                {t("game.gyroscope.modal.explanation")}
                            </p>
                        </div>

                        {/* Ошибка, если есть */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                                <p className="text-red-300 text-xs text-center">
                                    {t("game.gyroscope.modal.error")}: {error}
                                </p>
                            </div>
                        )}

                        {/* Кнопка действия */}
                        <div className="space-y-3">
                            <button
                                className={`w-full px-6 py-4 border-2 rounded-lg font-mono text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 ${isRequesting
                                        ? "border-blue-400/30 text-blue-400/50 cursor-not-allowed"
                                        : "border-blue-400/60 text-blue-300 hover:border-blue-400 hover:bg-blue-500/10 hover:scale-105 active:scale-95"
                                    }`}
                                disabled={isRequesting}
                                onClick={onRequestPermission}
                            >
                                {isRequesting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                                        <span>{t("game.gyroscope.modal.requesting")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Settings size={16} />
                                        <span>{t("game.gyroscope.modal.grantAccess")}</span>
                                    </>
                                )}
                            </button>

                            {/* Дополнительная информация */}
                            <div className="text-center">
                                <p className="text-blue-200/50 text-xs">
                                    {t("game.gyroscope.modal.instructions")}
                                </p>
                            </div>
                        </div>

                        {/* Индикатор необходимости */}
                        <div className="border-t border-blue-400/20 pt-4">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                <span className="text-blue-300/60 text-xs uppercase tracking-wider">
                                    {t("game.gyroscope.modal.required")}
                                </span>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Декоративные элементы */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-400/20 to-transparent pointer-events-none" />
                </div>
            </div>
        </div>
    );
}