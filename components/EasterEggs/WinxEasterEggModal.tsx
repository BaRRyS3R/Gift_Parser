// src/components/EasterEggs/WinxEasterEggModal.tsx
"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Image,
} from "@nextui-org/react";
import { Sparkles, Star } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface WinxEasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
  chance: number; // Шанс в процентах (например, 1 для 1%)
}

export default function WinxEasterEggModal({
  isOpen,
  onClose,
  chance,
}: WinxEasterEggModalProps) {
  const t = useT();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdrop="blur"
      placement="center"
      classNames={{
        base: "bg-gradient-to-br from-pink-900/95 to-purple-900/95 backdrop-blur-xl border-2 border-pink-400/30",
        header: "border-b border-pink-400/20",
        body: "py-6",
        footer: "border-t border-pink-400/20",
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="text-pink-400 animate-pulse" size={24} />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {t("game.easterEgg.title" as any)}
            </h2>
            <Sparkles className="text-purple-400 animate-pulse" size={24} />
          </div>
          <p className="text-pink-300/80 text-sm uppercase tracking-widest">
            {t("game.easterEgg.subtitle" as any)}
          </p>
        </ModalHeader>

        <ModalBody className="text-center space-y-6">
          {/* Поздравительный текст */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-pink-300">
              {t("game.easterEgg.congratulations" as any)}
            </h3>
            <p className="text-lg text-purple-300 font-semibold">
              {t("game.easterEgg.message" as any)}
            </p>
          </div>

          {/* Картинка Winx */}
          <div className="flex justify-center items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
              <Image
                src="https://notfren.com/circusle/winx.png"
                alt="Winx Fairy"
                className="relative z-10 rounded-xl border-2 border-pink-400/30 shadow-2xl"
                width={200}
                height={200}
                fallbackSrc="/winx-placeholder.png"
              />
            </div>
          </div>

          {/* Информация о шансе */}
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-pink-400/20">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="text-yellow-400" size={16} />
              <span className="text-pink-300 text-sm font-mono tracking-wider">
                {t("game.easterEgg.chanceText" as any)}
              </span>
              <Star className="text-yellow-400" size={16} />
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                {chance}%
              </span>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-center">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold px-8 py-2 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
            startContent={<Sparkles size={16} />}
          >
            {t("game.easterEgg.closeButton" as any)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}