// src/contexts/LocalizationContext.tsx - Updated for modular localization

"use client";

import type {
  SupportedLanguage,
  LocalizationContextValue,
  TranslationKey,
  TranslationParams,
  TranslationFunction,
} from "@/locales/types";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  translations,
  getNestedValue,
  interpolateString,
  detectLanguageFromTelegram,
  STORAGE_KEYS,
} from "@/locales";

// Create the context
const LocalizationContext = createContext<LocalizationContextValue | undefined>(
  undefined,
);

// Provider component props
interface LocalizationProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
}

// Function to get Telegram user language directly
const getTelegramLanguage = (): string | undefined => {
  if (typeof window === "undefined") return undefined;

  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;

    return user?.language_code;
  }

  return undefined;
};

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({
  children,
  defaultLanguage = "en",
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language based on Telegram user data and stored preferences
  useEffect(() => {
    const initializeLanguage = () => {
      try {
        // First, try to get stored language preference
        const storedLanguage = localStorage.getItem(
          STORAGE_KEYS.LANGUAGE,
        ) as SupportedLanguage;

        if (
          storedLanguage &&
          (storedLanguage === "en" || storedLanguage === "ru")
        ) {
          setLanguage(storedLanguage);
          setIsInitialized(true);

          return;
        }

        // If no stored preference, detect from Telegram
        const telegramLanguageCode = getTelegramLanguage();

        if (telegramLanguageCode) {
          const detectedLanguage =
            detectLanguageFromTelegram(telegramLanguageCode);

          setLanguage(detectedLanguage);

          // Store the detected language for future use
          localStorage.setItem(STORAGE_KEYS.LANGUAGE, detectedLanguage);
        } else {
          // Fallback to default language
          setLanguage(defaultLanguage);
          localStorage.setItem(STORAGE_KEYS.LANGUAGE, defaultLanguage);
        }

        setIsInitialized(true);
      } catch (error) {
        // If localStorage is not available (e.g., in some environments)
        console.warn(
          "Could not access localStorage for language preference:",
          error,
        );

        // Fallback to Telegram detection or default
        const telegramLanguageCode = getTelegramLanguage();

        if (telegramLanguageCode) {
          const detectedLanguage =
            detectLanguageFromTelegram(telegramLanguageCode);

          setLanguage(detectedLanguage);
        } else {
          setLanguage(defaultLanguage);
        }

        setIsInitialized(true);
      }
    };

    // Add a small delay to ensure Telegram WebApp is fully loaded
    const timer = setTimeout(initializeLanguage, 100);

    return () => clearTimeout(timer);
  }, [defaultLanguage]);

  // Translation function
  const t: TranslationFunction = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      try {
        const currentTranslations = translations[language];
        const translatedValue = getNestedValue(currentTranslations, key);

        // If translation is not found, try fallback to English
        if (translatedValue === key && language !== "en") {
          const fallbackValue = getNestedValue(translations.en, key);

          console.warn(
            `Translation missing for key "${key}" in language "${language}", using English fallback`,
          );

          return interpolateString(fallbackValue, params);
        }

        return interpolateString(translatedValue, params);
      } catch (error) {
        console.error(`Translation error for key "${key}":`, error);

        return key; // Return the key itself as fallback
      }
    },
    [language],
  );

  // Change language function
  const changeLanguage = useCallback((newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);

    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLanguage);
    } catch (error) {
      console.warn(
        "Could not save language preference to localStorage:",
        error,
      );
    }
  }, []);

  // Context value
  const contextValue: LocalizationContextValue = {
    language,
    t,
    changeLanguage,
  };

  // Show loading only briefly while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white font-bpdots">INIT...</p>
        </div>
      </div>
    );
  }

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Hook to use localization
export const useTranslation = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);

  if (context === undefined) {
    throw new Error(
      "useTranslation must be used within a LocalizationProvider",
    );
  }

  return context;
};

// Convenience hook that just returns the translation function
export const useT = (): TranslationFunction => {
  const { t } = useTranslation();

  return t;
};

// Hook for language detection and management
export const useLanguage = () => {
  const { language, changeLanguage } = useTranslation();

  return {
    currentLanguage: language,
    isRussian: language === "ru",
    isEnglish: language === "en",
    setLanguage: changeLanguage,
    toggleLanguage: () => changeLanguage(language === "en" ? "ru" : "en"),
  };
};
