// src/components/Auth/AuthGuard.tsx - Authentication guard component

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  showError?: boolean;
  requireCompleteAuth?: boolean;
}

interface AuthErrorProps {
  onRetry: () => void;
  onGoHome: () => void;
  error?: string;
}

const AuthErrorScreen: React.FC<AuthErrorProps> = ({
  onRetry,
  onGoHome,
  error,
}) => {
  const t = useT();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-400" size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">auth error title</h1>
            <p className="text-white/70 text-sm leading-relaxed">
              {error || "auth error message"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg">
            <p className="text-amber-300 text-sm">aoth error suggestion</p>
          </div>

          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              onClick={onRetry}
            >
              <RefreshCw size={18} />
              <span>auth error retry</span>
            </button>

            <button
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-transparent border border-white/30 text-white hover:bg-white/10 rounded-lg font-medium transition-colors duration-200"
              onClick={onGoHome}
            >
              <Home size={18} />
              <span>Auth error botton go home</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-white/40 text-xs">Auth error footer</p>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC = () => {
  const t = useT();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-white/60 text-sm">auth checking</p>
      </div>
    </div>
  );
};

/**
 * AuthGuard component that protects routes from unauthenticated access
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  redirectTo = "/",
  showError = true,
  requireCompleteAuth = true,
}) => {
  const router = useRouter();
  const { authState, isLoading, telegramUser } = useUser();
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle authentication state changes
  useEffect(() => {
    const checkAuthentication = async () => {
      // Wait for authentication system to initialize
      if (isLoading) {
        return;
      }

      try {
        // Check if user is authenticated
        if (!authState.isAuthenticated) {
          console.log("User not authenticated, access denied");
          setAuthError(
            "User authentication required. Please restart the application through the main entry point.",
          );
          setIsInitializing(false);

          return;
        }

        // Check if we have required user data
        if (requireCompleteAuth && !authState.user) {
          console.log("Incomplete authentication data, access denied");
          setAuthError(
            "Authentication data incomplete. Please restart the application.",
          );
          setIsInitializing(false);

          return;
        }

        // Check if we have Telegram user data (for Telegram Web App context)
        if (requireCompleteAuth && !telegramUser) {
          console.log("Missing Telegram user data, access denied");
          setAuthError(
            "Telegram user data not available. Please ensure the application is launched from Telegram.",
          );
          setIsInitializing(false);

          return;
        }

        // All checks passed
        console.log("Authentication validation successful");
        setAuthError(null);
        setIsInitializing(false);
      } catch (error) {
        console.error("Authentication check error:", error);
        setAuthError("Authentication validation failed. Please try again.");
        setIsInitializing(false);
      }
    };

    checkAuthentication();
  }, [
    authState.isAuthenticated,
    authState.user,
    telegramUser,
    isLoading,
    requireCompleteAuth,
  ]);

  // Handle authentication errors
  useEffect(() => {
    if (authState.error) {
      setAuthError(authState.error);
      setIsInitializing(false);
    }
  }, [authState.error]);

  // Handle retry action
  const handleRetry = () => {
    setIsInitializing(true);
    setAuthError(null);
    // Trigger re-check by updating component state
    setTimeout(() => {
      setIsInitializing(false);
    }, 1000);
  };

  // Handle navigation to home
  const handleGoHome = () => {
    router.push(redirectTo);
  };

  // Show loading screen during initialization
  if (isInitializing || isLoading) {
    return <LoadingScreen />;
  }

  // Show error screen if authentication failed
  if (
    authError ||
    !authState.isAuthenticated ||
    (requireCompleteAuth && !authState.user)
  ) {
    if (showError) {
      return (
        <AuthErrorScreen
          error={authError || undefined}
          onGoHome={handleGoHome}
          onRetry={handleRetry}
        />
      );
    } else {
      // Redirect silently
      router.push(redirectTo);

      return <LoadingScreen />;
    }
  }

  // Render protected content
  return <>{children}</>;
};

export default AuthGuard;
