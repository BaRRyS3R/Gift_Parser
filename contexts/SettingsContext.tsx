// src/contexts/SettingsContext.tsx - Context for app settings

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export interface AppSettings {
  showBackgroundVideo: boolean;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleBackgroundVideo: () => void;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  showBackgroundVideo: true,
};

const SETTINGS_STORAGE_KEY = "app_settings";

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);

          console.log("Loaded settings from localStorage:", parsedSettings);
          setSettings({ ...defaultSettings, ...parsedSettings });
        } else {
          console.log("No saved settings found, using defaults");
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.warn("Failed to load settings from localStorage:", error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure localStorage is available
    const timer = setTimeout(loadSettings, 100);

    return () => clearTimeout(timer);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        console.log("Settings saved to localStorage:", settings);
      } catch (error) {
        console.warn("Failed to save settings to localStorage:", error);
      }
    }
  }, [settings, isLoading]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      console.log("Settings updated:", updated);

      return updated;
    });
  }, []);

  const toggleBackgroundVideo = useCallback(() => {
    updateSettings({ showBackgroundVideo: !settings.showBackgroundVideo });
  }, [settings.showBackgroundVideo, updateSettings]);

  const contextValue: SettingsContextValue = {
    settings,
    updateSettings,
    toggleBackgroundVideo,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
};
