// src/locales/ru/security.ts - Security system localization

export const security = {
    // Modal titles
    captchaTitle: "Проверка Безопасности",
    biometricTitle: "Биометрическая Аутентификация",
    gyroscopeTitle: "Проверка Движения",

    // Modal descriptions
    captchaDescription: "Пожалуйста, решите математическую задачу для продолжения",
    biometricDescription: "Пожалуйста, пройдите аутентификацию с помощью биометрии",
    gyroscopeDescription: "Потрясите или наклоните устройство для проверки",

    // Common elements
    timeRemaining: "Осталось времени",
    attempt: "Попытка",
    of: "из",
    seconds: "секунд",

    // Captcha specific
    enterCode: "Введите ответ",
    solveProblem: "Решите задачу",
    mathChallenge: "Математическая Задача",

    // Biometric specific
    touchSensor: "Коснитесь датчика или посмотрите в камеру для аутентификации",
    biometricNotAvailable: "Биометрическая аутентификация недоступна на этом устройстве",
    biometricAccessDenied: "Доступ к биометрии отклонен. Включите биометрическую аутентификацию в настройках.",
    openSettings: "Открыть Настройки Биометрии",

    // Gyroscope specific
    shakeDevice: "Потрясите или наклоните устройство",
    motionDetected: "Движение обнаружено",
    motionInstructions: "Подвигайте устройство в любом направлении чтобы подтвердить, что вы человек",
    gyroscopeNotSupported: "Датчики движения не поддерживаются на этом устройстве",

    // Actions
    verify: "Проверить",
    authenticating: "Аутентификация...",
    verifying: "Проверка...",
    processing: "Обработка...",

    // Error states
    verificationFailed: "Проверка не пройдена",
    timeExpired: "Время истекло",
    tryAgain: "Попробуйте снова",
    authenticationTimeout: "Время аутентификации истекло",

    // Trust score related
    trustScoreUpdated: "Уровень безопасности обновлен",
    securityCheckRequired: "Требуется проверка безопасности",
    lowTrustScore: "Необходима дополнительная проверка безопасности",

    // Block warnings
    accountBlocked: "Аккаунт будет временно заблокирован в случае неудачной проверки",
    securityMeasure: "Это мера безопасности для защиты платформы",

    // Success messages
    verificationSuccessful: "Проверка пройдена успешно",
    authenticationSuccessful: "Аутентификация прошла успешно",
    securityCheckPassed: "Проверка безопасности пройдена",

    // General security
    securityNotice: "Уведомление Безопасности",
    verificationRequired: "Требуется Проверка",
    protectingPlatform: "Защита целостности платформы",
} as const;