// src/locales/ru/security.ts - Security system localization

export const security = {
    // Trust Score
    trustScore: "Рейтинг доверия",
    trustScoreGood: "Хороший",
    trustScoreFair: "Нормальный",
    trustScoreLow: "Низкий",
    trustScoreCritical: "Критический",
    trustScoreDescription: "Ваш рейтинг безопасности на основе взаимодействий с системой",

    // Security Checks
    securityVerification: "Проверка безопасности",
    verificationRequired: "Требуется верификация",
    securityCheckInProgress: "Выполняется проверка безопасности...",
    silentSecurityCheck: "Проверка статуса безопасности...",

    // Captcha
    captchaTitle: "Проверка безопасности",
    captchaDescription: "Пожалуйста, введите код для продолжения",
    captchaPlaceholder: "Введите код капчи",
    captchaRefresh: "Обновить",
    captchaVerify: "Проверить",
    captchaGenerating: "Генерация капчи...",
    captchaInstructions: "Введите код выше",
    captchaTimeRemaining: "осталось",
    captchaAttempt: "Попытка",
    captchaOf: "из",
    captchaFailed: "Неверная капча",
    captchaTimeout: "Время истекло. Попробуйте снова.",
    captchaWarning: "Требуется проверка безопасности. Ваш аккаунт будет временно заблокирован в случае неудачной проверки.",

    // Biometric
    biometricTitle: "Биометрическая проверка",
    biometricDescription: "Пожалуйста, пройдите аутентификацию с помощью биометрии устройства",
    biometricInitializing: "Инициализация биометрической аутентификации...",
    biometricNotAvailable: "Биометрическая аутентификация недоступна на этом устройстве",
    biometricAccessDenied: "Доступ к биометрии запрещен. Пожалуйста, включите биометрическую аутентификацию в настройках.",
    biometricAuthenticate: "Аутентификация",
    biometricAuthenticating: "Аутентификация...",
    biometricComplete: "Пожалуйста, завершите биометрическую аутентификацию на вашем устройстве",
    biometricFailed: "Аутентификация не удалась",
    biometricAttemptsRemaining: "попыток осталось",
    biometricTimeout: "Время аутентификации истекло. Попробуйте снова.",
    biometricWarning: "Требуется биометрическая проверка из-за низкого рейтинга доверия. Ваш аккаунт будет заблокирован в случае неудачной проверки.",
    biometricOpenSettings: "Открыть настройки биометрии",
    biometricFingerprint: "Отпечаток пальца",
    biometricFaceId: "Face ID",
    biometricGeneric: "Биометрия",
    biometricInstruction: "Коснитесь датчика или посмотрите в камеру для аутентификации",
    biometricPermissionTimeout: "Время запроса разрешения истекло",
    biometricRequestingAccess: "Запрос доступа к биометрии...",

    // Gyroscope
    gyroscopeTitle: "Проверка движения",
    gyroscopeDescription: "Пожалуйста, выполните движения поворота устройства согласно инструкциям",
    gyroscopeInitializing: "Инициализация датчиков движения...",
    gyroscopeNotAvailable: "Датчики движения недоступны на этом устройстве",
    gyroscopeStartVerification: "Начать проверку",
    gyroscopeStep: "Шаг",
    gyroscopeStepOf: "из",
    gyroscopeFollowInstructions: "Следуйте инструкциям выше",
    gyroscopeStepInstructions: {
        step1: "Держите устройство горизонтально и медленно поверните его влево, затем вправо",
        step2: "Наклоните устройство вперед, затем назад",
        step3: "Аккуратно потрясите устройство вверх-вниз 3 раза",
    },
    gyroscopeWarning: "Критическая проверка безопасности: Требуется проверка движения из-за очень низкого рейтинга доверия. Аккаунт будет навсегда заблокирован в случае неудачной проверки.",
    gyroscopeTimeout: "Время проверки истекло. Попробуйте снова.",
    gyroscopeFailed: "Проверка движения не удалась",

    // Block Messages
    accountBlocked: "Аккаунт временно заблокирован",
    accountPermanentlyBlocked: "Аккаунт навсегда заблокирован",
    securityMeasures: "Действуют меры безопасности",
    blockReason: "Причина",
    timeRemaining: "Время до разблокировки",
    timeUntilUnblock: "Время до разблокировки",
    checkStatus: "Проверить статус",
    checkingStatus: "Проверка статуса...",
    returnToStart: "Вернуться к началу",
    blockDuration: "Длительность блокировки",

    // Block Reasons
    suspiciousActivity: "Обнаружена подозрительная активность",

    // Block Descriptions
    captchaFailedDescription: "Ваш аккаунт был временно заблокирован из-за неудачной проверки капчи. Это помогает защитить систему от автоматического доступа.",
    biometricFailedDescription: "Ваш аккаунт был временно заблокирован из-за неудачной биометрической аутентификации. Это мера безопасности для защиты вашего аккаунта.",
    gyroscopeFailedDescription: "Ваш аккаунт был навсегда заблокирован из-за неудачной проверки движения. Это критическая мера безопасности.",
    suspiciousActivityDescription: "Ваш аккаунт был временно заблокирован из-за обнаруженной подозрительной активности. Это помогает поддерживать безопасность платформы.",

    // Block Durations
    captchaBlockDuration: "2 минуты",
    biometricBlockDuration: "24 часа",
    gyroscopeBlockDuration: "1 год",
    suspiciousBlockDuration: "10 минут",

    // General Messages
    securityNotice: "Уведомление безопасности",
    lowTrustScore: "Ваш рейтинг доверия низкий. Могут потребоваться дополнительные проверки безопасности.",
    verificationNeeded: "Требуется проверка",
    accountSecurity: "Безопасность аккаунта",
    whatHappensNext: "Что произойдет дальше?",
    automaticUnblock: "Ваш аккаунт будет автоматически разблокирован по истечении времени",
    followGuidelines: "Следуйте правилам безопасности для улучшения рейтинга доверия",
    repeatedViolations: "Повторные нарушения могут привести к более длительным блокировкам",

    // UI States
    locked: "ЗАБЛОКИРОВАНО",
    loading: "ЗАГРУЗКА",
    checking: "ПРОВЕРКА",
    verifying: "ВЕРИФИКАЦИЯ",
    failed: "ОШИБКА",
    success: "УСПЕХ",

    // Date and Time
    unblockDate: "Дата разблокировки",
    unblockTime: "Время разблокировки",
    autoRefresh: "Автообновление через",
    pageWillRefresh: "Страница автоматически обновится после разблокировки",

    // Errors
    verificationFailed: "Проверка не удалась",
    systemError: "Произошла системная ошибка",
    tryAgain: "Попробовать снова",
    unexpectedError: "Произошла непредвиденная ошибка",
} as const;