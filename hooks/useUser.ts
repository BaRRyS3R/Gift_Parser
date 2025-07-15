// src/hooks/useUser.tsx - Refactored: all data operations via API routes only

"use client";

import type { TournamentGameResult } from "@/types/tournaments";
import type { AchievementNotificationData } from "@/components/LeagueProgress/AchievementNotification";
import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
} from "react";

// Updated to include rotation mode and league achievements
type GameResult = any; // Use your types as needed

interface AttemptsCache {
  status: any;
  lastUpdate: number;
  isValid: boolean;
  source: "server" | "optimistic" | "initial";
}

interface UserContextType {
  user: any;
  telegramUser: any;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResult) => Promise<any>;
  saveTournamentResult: (
    tournamentId: string,
    gameResult: any,
  ) => Promise<any>;
  updateUser: (userData: any) => void;
  setTelegramUser: (userData: any) => void;
  getAttemptsStatus: () => Promise<any>;
  consumeAttemptForGame: () => Promise<any>;
  invalidateAttemptsCache: () => void;
  getCachedAttemptsStatus: () => any;
  currentAchievement: AchievementNotificationData | null;
  showAchievement: (achievement: AchievementNotificationData) => void;
  hideAchievement: () => void;
  isAuthenticated: boolean;
  authenticateWithTelegram: (initData: string, referralCode?: string) => Promise<void>;
  signOut: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

const CACHE_DURATION = 60000;

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [telegramUser, setTelegramUserState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementNotificationData | null>(null);
  const [attemptsCache, setAttemptsCache] = useState<AttemptsCache>({
    status: null,
    lastUpdate: 0,
    isValid: false,
    source: "initial",
  });

  // Telegram user auto-init
  useEffect(() => {
    if (!telegramUser && typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;
      if (user && user.id) {
        setTelegramUserState({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          is_premium: user.is_premium,
        });
      }
    }
  }, [telegramUser]);

  // Auth (stub, real JWT logic should be in middleware)
  const authenticateWithTelegram = useCallback(async (initData: string, referralCode?: string) => {
    setIsLoading(true);
    setError(null);
    // TODO: реализовать реальную аутентификацию через API
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setTelegramUserState(null);
    invalidateAttemptsCache();
    setError(null);
  }, []);

  const updateUser = useCallback((userData: any) => {
    setUser(userData);
    setError(null);
    setIsLoading(false);
  }, []);

  const setTelegramUserData = useCallback((tgUserData: any) => {
    setTelegramUserState(tgUserData);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!telegramUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
      const data = await res.json();
      if (data.success) {
        setUser(data.profile.user);
      } else {
        setError(data.error || "Ошибка профиля");
      }
    } catch (err) {
      setError("Ошибка профиля");
    } finally {
      setIsLoading(false);
    }
  }, [telegramUser]);

  const invalidateAttemptsCache = useCallback(() => {
    setAttemptsCache({ status: null, lastUpdate: 0, isValid: false, source: "initial" });
  }, []);

  const getCachedAttemptsStatus = useCallback(() => {
    const now = Date.now();
    if (attemptsCache.isValid && attemptsCache.status && now - attemptsCache.lastUpdate < CACHE_DURATION) {
      return attemptsCache.status;
    }
    return null;
  }, [attemptsCache]);

  const getAttemptsStatus = useCallback(async () => {
    if (!telegramUser) throw new Error("Пользователь Telegram не найден");
    const now = Date.now();
    if (attemptsCache.isValid && attemptsCache.status && attemptsCache.source === "server" && now - attemptsCache.lastUpdate < CACHE_DURATION) {
      return attemptsCache.status;
    }
    try {
      const res = await fetch("/api/user/attempts-status", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
      const data = await res.json();
      if (data.success) {
        setAttemptsCache({ status: data, lastUpdate: now, isValid: true, source: "server" });
        return data;
      } else {
        invalidateAttemptsCache();
        throw new Error(data.error || "Ошибка попыток");
      }
    } catch (error) {
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, attemptsCache, invalidateAttemptsCache]);

  const consumeAttemptForGame = useCallback(async () => {
    if (!telegramUser) throw new Error("Пользователь Telegram не найден");
    try {
      const res = await fetch("/api/game/consume-attempt", { method: "POST", headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
      const data = await res.json();
      if (data.success) {
        setAttemptsCache({ status: data, lastUpdate: Date.now(), isValid: true, source: "server" });
        return data;
      } else {
        invalidateAttemptsCache();
        throw new Error(data.error || "Ошибка попыток");
      }
    } catch (error) {
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, invalidateAttemptsCache]);

  const showAchievement = useCallback((achievement: AchievementNotificationData) => {
    setCurrentAchievement(achievement);
  }, []);
  const hideAchievement = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  const saveGameResult = useCallback(async (gameResult: GameResult) => {
    try {
      const res = await fetch("/api/game/save-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (localStorage.getItem('jwt') || '')
        },
        body: JSON.stringify(gameResult)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Ошибка сохранения");
      await refreshUser();
      invalidateAttemptsCache();
      return data;
    } catch (err) {
      throw err;
    }
  }, [refreshUser, invalidateAttemptsCache]);

  const saveTournamentResult = useCallback(async (tournamentId: string, gameResult: any) => {
    try {
      const res = await fetch("/api/tournament/save-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (localStorage.getItem('jwt') || '')
        },
        body: JSON.stringify({ tournamentId, ...gameResult })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Ошибка турнира");
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    if (telegramUser && !user && !isLoading) {
      refreshUser().catch((err) => {
        console.error("useUser - Failed to auto-load user:", err);
      });
    }
  }, [telegramUser, user, isLoading, refreshUser]);

  useEffect(() => {
    if (telegramUser) {
      invalidateAttemptsCache();
    }
  }, [telegramUser, invalidateAttemptsCache]);

  const contextValue: UserContextType = {
    user,
    telegramUser,
    isLoading,
    error,
    refreshUser,
    saveGameResult,
    saveTournamentResult,
    updateUser,
    setTelegramUser: setTelegramUserData,
    getAttemptsStatus,
    consumeAttemptForGame,
    invalidateAttemptsCache,
    getCachedAttemptsStatus,
    currentAchievement,
    showAchievement,
    hideAchievement,
    isAuthenticated,
    authenticateWithTelegram,
    signOut,
  };

  return React.createElement(
    UserContext.Provider,
    { value: contextValue },
    children,
  );
};

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser должен использоваться внутри UserProvider");
  }
  return context;
}