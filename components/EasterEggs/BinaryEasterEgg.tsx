// src/components/EasterEggs/BinaryEasterEgg.tsx

"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/react";
import { Check, X } from "lucide-react";

interface BinaryEasterEggProps {
  isVisible: boolean;
  onClose: () => void;
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function BinaryEasterEgg({ isVisible, onClose, makeAuthenticatedRequest }: BinaryEasterEggProps) {
  const [binaryString, setBinaryString] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>(""); // DEBUG STATE

  // Haptic feedback helper
  const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      } catch (error) {
        // Fallback for non-Telegram environments
        if (navigator.vibrate) {
          const vibrationMap = {
            light: 50,
            medium: 100,
            heavy: 200
          };
          navigator.vibrate(vibrationMap[type]);
        }
      }
    }
  };

  // Handle binary digit click (0 or 1)
  const handleBinaryClick = (digit: "0" | "1") => {
    triggerHaptic("medium"); // Enhanced haptic feedback for circle clicks
    setBinaryString(prev => prev + digit);
    setResultMessage(""); // Clear any previous messages
    setDebugInfo(""); // Clear debug info when starting new sequence
  };

  // Handle check button click
  const handleCheck = async () => {
    if (binaryString.length === 0) {
      setResultMessage("Enter some binary digits first!");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");
    setDebugInfo("Starting binary check...");

    try {
      setDebugInfo(prev => prev + "\nMaking API request...");
      
      const response = await makeAuthenticatedRequest('/api/easter-egg/binary-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ binaryString }),
      });

      setDebugInfo(prev => prev + `\nResponse: ${response.status} ${response.ok ? 'OK' : 'NOT OK'}`);

      if (!response.ok) {
        setDebugInfo(prev => prev + "\nResponse not OK, parsing error...");
        const errorData = await response.json().catch(() => ({}));
        setDebugInfo(prev => prev + `\nError data: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      setDebugInfo(prev => prev + "\nParsing response JSON...");
      const data = await response.json();
      setDebugInfo(prev => prev + `\nParsed data: ${JSON.stringify(data)}`);

      if (data.success) {
        setDebugInfo(prev => prev + "\nSUCCESS - correct binary!");
        setIsSuccess(true);
        setResultMessage(data.message);
        // Success haptic feedback
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
          } catch (error) {
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }
        }
      } else {
        setDebugInfo(prev => prev + `\nWRONG binary - API error: "${data.error}"`);
        setIsSuccess(false);
        setResultMessage(data.error || "Wrong binary sequence!");
        // Clear the binary string for retry
        setBinaryString("");
        // Error haptic feedback
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
          } catch (error) {
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
      }
    } catch (error) {
      setDebugInfo(prev => prev + `\nCATCH BLOCK: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSuccess(false);
      setResultMessage("Network error. Try again!");
      setBinaryString("");
      // Error haptic feedback
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
        } catch (error) {
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    triggerHaptic("light");
    setBinaryString("");
    setResultMessage("");
    setIsSuccess(false);
    setDebugInfo(""); // Clear debug info
    onClose();
  };

  // Copy success message to clipboard
  const handleCopyMessage = async () => {
    if (isSuccess && resultMessage) {
      try {
        await navigator.clipboard.writeText(resultMessage);
        triggerHaptic("medium");
        // Could add a temporary "Copied!" indicator here
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full animate-fade-in-up">
      {/* Easter egg container */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6 relative">
        {/* Close button */}
        <button
          onTouchEnd={handleClose}
          className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Close easter egg"
          type="button"
          style={{ touchAction: 'manipulation' }}
        >
          <X size={16} />
        </button>

        {/* Binary input area */}
        <div className="space-y-4">
          {/* Binary circles - no numbers shown */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onTouchEnd={() => handleBinaryClick("0")}
              disabled={isSubmitting}
              type="button"
              aria-label="Add binary 0"
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              {/* Empty circle for 0 */}
            </button>
            <button
              onTouchEnd={() => handleBinaryClick("1")}
              disabled={isSubmitting}
              type="button"
              aria-label="Add binary 1"
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              {/* Empty circle for 1 */}
            </button>
          </div>

          {/* Check button */}
          <div className="flex justify-center">
            <Button
              onClick={handleCheck}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              type="button"
              aria-label="Check binary sequence"
              className="bg-white/20 text-white border border-white/40 hover:bg-white/30"
              style={{ touchAction: 'manipulation' }}
              startContent={!isSubmitting ? <Check size={16} /> : null}
            >
              {isSubmitting ? "Checking..." : "Check"}
            </Button>
          </div>

          {/* Visual feedback for testing - REMOVE LATER */}
          {binaryString && (
            <div className="text-center">
              <div className="text-white/70 text-sm">Current string:</div>
              <div className="text-white font-mono text-lg break-all">
                {binaryString}
              </div>
              <div className="text-white/50 text-xs">
                Length: {binaryString.length}
              </div>
            </div>
          )}

          {/* Debug info - TEMPORARY */}
          {debugInfo && (
            <div className="text-center">
              <div className="bg-gray-800/90 text-gray-300 text-xs p-3 rounded-lg border border-gray-600">
                <div className="font-bold text-yellow-400 mb-2">DEBUG INFO:</div>
                <pre className="whitespace-pre-wrap text-left overflow-x-auto">
                  {debugInfo}
                </pre>
              </div>
            </div>
          )}

          {/* Result message */}
          {resultMessage && (
            <div className="text-center">
              {isSuccess ? (
                <button
                  className="w-full p-3 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                  onTouchEnd={handleCopyMessage}
                  type="button"
                  aria-label="Copy success message"
                  style={{ touchAction: 'manipulation' }}
                >
                  {resultMessage}
                  <div className="text-green-300/80 text-xs mt-1">
                    Tap to copy
                  </div>
                </button>
              ) : (
                <div className="p-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40">
                  {resultMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}