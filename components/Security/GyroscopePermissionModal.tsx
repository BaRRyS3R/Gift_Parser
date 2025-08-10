// src/components/Security/GyroscopePermissionModal.tsx - Обновленное модальное окно с обработкой отклоненных разрешений

"use client";

import { useEffect } from "react";
import { Compass, Shield, Settings, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface GyroscopePermissionModalProps {
    isOpen: boolean;
    isRequesting: boolean;
    permissionDenied: boolean;
    needsManualEnable: boolean;
    error: string | null;
    onRequestPermission: () => Promise<void>;
    onRecheckPermission: () => Promise<void>;
    onSkipPermission: () => void;
    onClose?: () => void; // Опциональное закрытие для случаев когда гироскоп недоступен
}

export default function GyroscopePermissionModal({
    isOpen,
    isRequesting,
    permissionDenied,
    needsManualEnable,
    error,
    onRequestPermission,
    onRecheckPermission,
    onSkipPermission,
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

    // Определение текущего состояния для отображения
    const isManualEnableMode = permissionDenied && needsManualEnable;
    const isInitialRequest = !permissionDenied && !needsManualEnable;

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

                    {/* Кнопка закрытия (только если доступна функция закрытия) */}
                    {onClose && (
                        <button
                            className="absolute top-4 right-4 z-20 p-2 text-blue-400/60 hover:text-blue-400 transition-colors"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Контент */}
                    <div className="relative z-10 p-6 space-y-6">
                        {/* Заголовок с иконкой */}
                        <div className="text-center space-y-4">
                            <div className={`w-16 h-16 mx-auto rounded-lg flex items-center justify-center border ${isManualEnableMode
                                    ? "bg-orange-500/20 border-orange-400/30"
                                    : "bg-blue-500/20 border-blue-400/30"
                                }`}>
                                {isManualEnableMode ? (
                                    <Settings className="text-orange-400" size={32} />
                                ) : (
                                    <Compass className="text-blue-400" size={32} />
                                )}
                            </div>

                            <div>
                                <h3 className={`text-xl font-bold tracking-wider mb-2 ${isManualEnableMode ? "text-orange-300" : "text-blue-300"
                                    }`}>
                                    {isManualEnableMode
                                        ? t("game.gyroscope.modal.manualTitle")
                                        : t("game.gyroscope.modal.title")
                                    }
                                </h3>
                                <p className={`text-sm leading-relaxed ${isManualEnableMode ? "text-orange-200/80" : "text-blue-200/80"
                                    }`}>
                                    {isManualEnableMode
                                        ? t("game.gyroscope.modal.manualDescription")
                                        : t("game.gyroscope.modal.description")
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Разделитель */}
                        <div className={`h-px bg-gradient-to-r from-transparent to-transparent ${isManualEnableMode ? "via-orange-400/30" : "via-blue-400/30"
                            }`} />

                        {/* Информационный блок */}
                        {isManualEnableMode ? (
                            <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 space-y-3">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="text-orange-400 flex-shrink-0" size={16} />
                                    <span className="text-orange-300 font-mono text-sm tracking-wider uppercase">
                                        {t("game.gyroscope.modal.manualRequired")}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-orange-200/70 text-xs leading-relaxed">
                                        {t("game.gyroscope.modal.manualInstructions")}
                                    </p>
                                    <div className="bg-orange-500/10 border border-orange-400/20 rounded p-2">
                                        <p className="text-orange-200 text-xs font-mono">
                                            {t("game.gyroscope.modal.safariPath")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                        )}

                        {/* Ошибка, если есть */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                                <p className="text-red-300 text-xs text-center">
                                    {t("game.gyroscope.modal.error")}: {error}
                                </p>
                            </div>
                        )}

                        {/* Кнопки действий */}
                        <div className="space-y-3">
                            {isManualEnableMode ? (
                                <>
                                    {/* Кнопка повторной проверки */}
                                    <button
                                        className={`w-full px-6 py-4 border-2 rounded-lg font-mono text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 ${isRequesting
                                                ? "border-orange-400/30 text-orange-400/50 cursor-not-allowed"
                                                : "border-orange-400/60 text-orange-300 hover:border-orange-400 hover:bg-orange-500/10 hover:scale-105 active:scale-95"
                                            }`}
                                        disabled={isRequesting}
                                        onClick={onRecheckPermission}
                                    >
                                        {isRequesting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                                                <span>{t("game.gyroscope.modal.checking")}</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={16} />
                                                <span>{t("game.gyroscope.modal.recheckAccess")}</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Кнопка пропуска */}
                                    <button
                                        className="w-full px-6 py-3 border border-gray-600/60 text-gray-400 rounded-lg font-mono text-xs tracking-wider uppercase transition-all duration-300 hover:border-gray-500 hover:text-gray-300"
                                        onClick={onSkipPermission}
                                    >
                                        {t("game.gyroscope.modal.skipForNow")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Кнопка первичного запроса */}
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

                                    {/* Кнопка пропуска */}
                                    <button
                                        className="w-full px-6 py-3 border border-gray-600/60 text-gray-400 rounded-lg font-mono text-xs tracking-wider uppercase transition-all duration-300 hover:border-gray-500 hover:text-gray-300"
                                        onClick={onSkipPermission}
                                    >
                                        {t("game.gyroscope.modal.skipForNow")}
                                    </button>
                                </>
                            )}

                            {/* Дополнительная информация */}
                            <div className="text-center">
                                <p className={`text-xs ${isManualEnableMode ? "text-orange-200/50" : "text-blue-200/50"
                                    }`}>
                                    {isManualEnableMode
                                        ? t("game.gyroscope.modal.manualHelp")
                                        : t("game.gyroscope.modal.instructions")
                                    }
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