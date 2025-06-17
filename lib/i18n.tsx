import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, namespace?: string, params?: Record<string, any>) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
  telegramLanguageCode?: string;
}

export function I18nProvider({ 
  children, 
  defaultLanguage = 'en',
  telegramLanguageCode 
}: I18nProviderProps): JSX.Element {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    // Определяем язык на основе telegramLanguageCode
    if (telegramLanguageCode === 'ru') {
      setLanguage('ru');
    } else {
      setLanguage('en');
    }
  }, [telegramLanguageCode]);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const namespaces = ['common', 'game', 'navigation', 'leaderboard', 'shop', 'profile'];
        const loadedTranslations: Record<string, Record<string, any>> = {};
        
        for (const namespace of namespaces) {
          const translation = await import(`../locales/${language}/${namespace}.json`);
          loadedTranslations[namespace] = translation.default;
        }
        
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
      }
    };

    loadTranslations();
  }, [language]);

  const t = (key: string, namespace: string = 'common', params?: Record<string, any>): string => {
    try {
      const keys = key.split('.');
      let value = translations[namespace];
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          console.warn(`Translation key not found: ${namespace}.${key}`);
          return key;
        }
      }
      
      if (params && typeof value === 'string') {
        return Object.entries(params).reduce((str, [key, val]) => {
          return str.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
        }, value);
      }
      
      return typeof value === 'string' ? value : key;
    } catch (error) {
      console.warn(`Error getting translation for key: ${namespace}.${key}`, error);
      return key;
    }
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    return new Intl.DateTimeFormat(language, options).format(date);
  };

  const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(language, options).format(number);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, formatDate, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
} 