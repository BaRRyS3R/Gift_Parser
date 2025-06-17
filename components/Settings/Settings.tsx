// src/components/Settings/Settings.tsx - Settings modal without close button

"use client";

import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Globe, Video, VideoOff, Check } from 'lucide-react';
import { useTranslation, useLanguage } from '@/contexts/LocalizationContext';
import { useSettings } from '@/contexts/SettingsContext';
import type { SupportedLanguage } from '@/types/localization';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { currentLanguage, setLanguage } = useLanguage();
    const { settings, toggleBackgroundVideo } = useSettings();
    const [isChangingLanguage, setIsChangingLanguage] = useState(false);

    const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
        if (newLanguage === currentLanguage || isChangingLanguage) return;

        setIsChangingLanguage(true);

        // Add a small delay for better UX
        setTimeout(() => {
            setLanguage(newLanguage);
            setIsChangingLanguage(false);
        }, 300);
    };

    const getLanguageDisplayName = (lang: SupportedLanguage) => {
        switch (lang) {
            case 'en':
                return 'English';
            case 'ru':
                return 'Русский';
        }
    };

    const renderLanguageOption = (lang: SupportedLanguage) => {
        const isSelected = currentLanguage === lang;
        const isDisabled = isChangingLanguage;

        return (
            <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                disabled={isDisabled}
                className={`
                    flex items-center justify-between w-full p-3 rounded-lg border transition-all duration-300
                    ${isSelected
                        ? 'bg-white/20 border-white/40 text-white'
                        : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30'
                    }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                `}
            >
                <div className="flex items-center space-x-3">
                    <Globe
                        className={isSelected ? 'text-white' : 'text-white/60'}
                        size={18}
                    />
                    <span className="font-medium">
                        {getLanguageDisplayName(lang)}
                    </span>
                </div>
                {isSelected && (
                    <Check className="text-white" size={18} />
                )}
            </button>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <SettingsIcon className="text-white" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {t('common.settings')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
                        aria-label={t('common.close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Settings Content */}
                <div className="p-6 space-y-6">
                    {/* Language Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Globe className="text-white/80" size={18} />
                            <h3 className="text-lg font-bold text-white">
                                Language / Язык
                            </h3>
                        </div>

                        <div className="space-y-2">
                            {(['en', 'ru'] as const).map(renderLanguageOption)}
                        </div>

                        <p className="text-xs text-white/50">
                            {currentLanguage === 'en'
                                ? 'Language settings are saved automatically'
                                : 'Настройки языка сохраняются автоматически'
                            }
                        </p>
                    </div>

                    {/* Video Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            {settings.showBackgroundVideo ? (
                                <Video className="text-white/80" size={18} />
                            ) : (
                                <VideoOff className="text-white/80" size={18} />
                            )}
                            <h3 className="text-lg font-bold text-white">
                                {currentLanguage === 'en' ? 'Background Video' : 'Фоновое Видео'}
                            </h3>
                        </div>

                        <button
                            onClick={toggleBackgroundVideo}
                            className={`
                                flex items-center justify-between w-full p-3 rounded-lg border transition-all duration-300
                                ${settings.showBackgroundVideo
                                    ? 'bg-green-500/20 border-green-400/40 text-green-300'
                                    : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30'
                                }
                                hover:scale-[1.02] active:scale-[0.98]
                            `}
                        >
                            <div className="flex items-center space-x-3">
                                {settings.showBackgroundVideo ? (
                                    <Video className="text-green-300" size={18} />
                                ) : (
                                    <VideoOff className="text-white/60" size={18} />
                                )}
                                <span className="font-medium">
                                    {settings.showBackgroundVideo
                                        ? (currentLanguage === 'en' ? 'Video Enabled' : 'Видео Включено')
                                        : (currentLanguage === 'en' ? 'Video Disabled' : 'Видео Выключено')
                                    }
                                </span>
                            </div>
                            <div className={`
                                w-12 h-6 rounded-full relative transition-all duration-300
                                ${settings.showBackgroundVideo ? 'bg-green-400' : 'bg-white/20'}
                            `}>
                                <div className={`
                                    w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300
                                    ${settings.showBackgroundVideo ? 'translate-x-6' : 'translate-x-0.5'}
                                `} />
                            </div>
                        </button>

                        <p className="text-xs text-white/50">
                            {currentLanguage === 'en'
                                ? 'Toggle background video on main page for better performance'
                                : 'Переключить фоновое видео на главной странице для лучшей производительности'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;