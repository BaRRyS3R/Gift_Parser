// src/components/Tasks/BonusAttemptsInfoModal.tsx - Information modal about bonus attempts system

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Zap, RotateCcw, Info, ArrowRight } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface BonusAttemptsInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BonusAttemptsInfoModal: React.FC<BonusAttemptsInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useT();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        role="button"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full max-h-[85vh] relative overflow-hidden flex flex-col"
          style={{
            clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
          }}
        >
          {/* Semi-transparent background overlay */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Header - Fixed */}
          <div className="relative z-10 p-6 pb-4 border-b border-white/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <h2 className="text-xl font-mono tracking-[0.15em] uppercase">
                  {t("tasks.bonusInfo.modalTitle")}
                </h2>
              </div>
              <button
                className="w-8 h-8 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                style={{
                  clipPath:
                    "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                }}
                onClick={onClose}
              >
                <X className="text-white" size={14} />
              </button>
            </div>
            <p className="text-white/70 text-sm mt-2 font-mono tracking-wider">
              {t("tasks.bonusInfo.modalSubtitle")}
            </p>
          </div>

          {/* Scrollable Content */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="p-6 pt-4 space-y-6">
              {/* Instant Attempts Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center rounded">
                    <Zap className="text-yellow-400" size={16} />
                  </div>
                  <h3 className="font-mono text-lg tracking-wider text-yellow-400">
                    {t("tasks.bonusInfo.instantAttempts.title")}
                  </h3>
                </div>
                
                <div className="pl-11 space-y-3">
                  <p className="text-white/80 text-sm">
                    {t("tasks.bonusInfo.instantAttempts.description")}
                  </p>
                  <p className="text-white/60 text-xs font-mono">
                    {t("tasks.bonusInfo.instantAttempts.sources")}
                  </p>
                  <div className="bg-yellow-500/10 border border-yellow-400/20 p-3 rounded">
                    <p className="text-yellow-300 text-sm font-mono">
                      ✓ {t("tasks.bonusInfo.instantAttempts.advantage")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              {/* Restore Bonus Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500/20 border border-blue-400/40 flex items-center justify-center rounded">
                    <RotateCcw className="text-blue-400" size={16} />
                  </div>
                  <h3 className="font-mono text-lg tracking-wider text-blue-400">
                    {t("tasks.bonusInfo.restoreBonus.title")}
                  </h3>
                </div>
                
                <div className="pl-11 space-y-3">
                  <p className="text-white/80 text-sm">
                    {t("tasks.bonusInfo.restoreBonus.description")}
                  </p>
                  <p className="text-white/60 text-xs font-mono">
                    {t("tasks.bonusInfo.restoreBonus.sources")}
                  </p>
                  <div className="bg-blue-500/10 border border-blue-400/20 p-3 rounded">
                    <p className="text-blue-300 text-sm font-mono mb-2">
                      ✓ {t("tasks.bonusInfo.restoreBonus.advantage")}
                    </p>
                    <p className="text-blue-200 text-xs font-mono">
                      📝 {t("tasks.bonusInfo.restoreBonus.formula")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              {/* Comparison Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Info className="text-white/60" size={20} />
                  <h3 className="font-mono text-lg tracking-wider text-white/90">
                    {t("tasks.bonusInfo.comparison.title")}
                  </h3>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                    <span className="text-yellow-300">⚡ {t("tasks.bonusInfo.comparison.instant")}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                    <span className="text-blue-300">🔄 {t("tasks.bonusInfo.comparison.restore")}</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-400/20 p-3 rounded">
                    <p className="text-emerald-300 text-sm font-mono">
                      💡 {t("tasks.bonusInfo.comparison.strategy")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              {/* Example Section */}
              <div className="space-y-4">
                <h3 className="font-mono text-lg tracking-wider text-white/90">
                  {t("tasks.bonusInfo.example.title")}
                </h3>
                
                <div className="space-y-3">
                  <p className="text-white/80 text-sm">
                    {t("tasks.bonusInfo.example.scenario")}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-400/20 rounded">
                      <span className="text-red-300 text-sm">
                        {t("tasks.bonusInfo.example.before")}
                      </span>
                    </div>
                    <div className="flex items-center justify-center py-2">
                      <ArrowRight className="text-white/40" size={16} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-400/20 rounded">
                      <span className="text-green-300 text-sm">
                        {t("tasks.bonusInfo.example.after")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-purple-500/10 border border-purple-400/20 p-3 rounded">
                    <p className="text-purple-300 text-sm font-mono font-bold">
                      🎉 {t("tasks.bonusInfo.example.benefit")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="relative z-10 p-6 pt-4 border-t border-white/20 flex-shrink-0">
            <button
              className="w-full py-3 px-4 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 hover:from-white/20 hover:to-white/10 hover:border-white/30 transition-all duration-300 group flex items-center justify-center space-x-3"
              style={{
                clipPath:
                  "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
              }}
              onClick={onClose}
            >
              <span className="font-mono text-sm tracking-[0.15em] uppercase text-white">
                {t("tasks.bonusInfo.close")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to document.body
  return createPortal(modalContent, document.body);
};

export default BonusAttemptsInfoModal;