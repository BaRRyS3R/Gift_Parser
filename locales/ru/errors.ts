// src/locales/ru/errors.ts - Error messages
export const errors = {
    telegramUnavailable: "API Telegram WebApp недоступен",
    userNotFound: "Пользователь не найден",
    noAttempts: "Попытки закончились",
    saveGameResult: "Не удалось сохранить результат игры",
    connectionError: "Ошибка соединения",
    unknownError: "Произошла неизвестная ошибка",
    paymentCancelled:
        "Платёж был отменён или не удался. Пожалуйста, попробуйте снова.",
    createInvoice: "Не удалось создать платёжный счёт",
    consumeAttempt: "Ошибка использования попытки",
} as const;