// src/locales/types.ts - Updated modular localization types

import type { en } from './en';

// Define the supported languages
export type SupportedLanguage = "en" | "ru";

// Create the translation type from the English translations (master)
export type TranslationKeys = typeof en;

// Utility type to get nested keys from translation object
export type NestedKeyOf<T> = T extends object
    ? {
        [K in keyof T]: T[K] extends object
        ? K extends string
        ? `${K}.${NestedKeyOf<T[K]>}`
        : never
        : K extends string
        ? K
        : never;
    }[keyof T]
    : never;

// Translation key type for type-safe translation keys
export type TranslationKey = NestedKeyOf<TranslationKeys>;

// Parameters for string interpolation
export interface TranslationParams {
    [key: string]: string | number;
}

// Translation function signature
export interface TranslationFunction {
    (key: TranslationKey, params?: TranslationParams): string;
}

// Context value type
export interface LocalizationContextValue {
    language: SupportedLanguage;
    t: TranslationFunction;
    changeLanguage: (lang: SupportedLanguage) => void;
}

// Utility function to get nested value from object using dot notation
export function getNestedValue(obj: any, path: string): string {
    return path.split(".").reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : path;
    }, obj);
}

// Utility function to interpolate string with parameters
export function interpolateString(
    str: string,
    params?: TranslationParams,
): string {
    if (!params) return str;

    return str.replace(/\{(\w+)\}/g, (match, key) => {
        const value = params[key];
        return value !== undefined ? String(value) : match;
    });
}

// Utility function to handle pluralization for Russian
export function getPlural(
    count: number,
    singular: string,
    few: string,
    many: string,
): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod100 >= 11 && mod100 <= 14) {
        return many;
    }

    if (mod10 === 1) {
        return singular;
    }

    if (mod10 >= 2 && mod10 <= 4) {
        return few;
    }

    return many;
}

// Language detection utility
export function detectLanguageFromTelegram(
    languageCode?: string,
): SupportedLanguage {
    return languageCode === "ru" ? "ru" : "en";
}

// Storage keys for preferences
export const STORAGE_KEYS = {
    LANGUAGE: "user_language_preference",
} as const;