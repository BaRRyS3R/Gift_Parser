// src/locales/index.ts - Main localization export

export { en } from './en';
export { ru } from './ru';
export * from './types';

// Translation dictionaries for easy import
import { en } from './en';
import { ru } from './ru';

export const translations = {
    en,
    ru,
} as const;