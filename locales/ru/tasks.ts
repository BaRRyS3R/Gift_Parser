// src/locales/ru/tasks.ts - Russian translations for tasks

export const tasks = {
  title: "Задания",
  subtitle: "Выполняйте задания и получайте попытки",
  loading: "Загрузка заданий...",
  loadingTasks: "Загрузка заданий...",
  noTasks: "Нет доступных заданий",
  noTasksDescription: "Загляните позже за новыми заданиями",
  failedToLoad: "Не удалось загрузить задания",
  authenticationRequired: "Для просмотра заданий требуется аутентификация",
  
  // Task actions
  complete: "Выполнить",
  completed: "Выполнено",
  completeTask: "Выполнить задание",
  verify: "Проверить",
  verifying: "Проверяем...",
  completing: "Выполняем...",
  openLink: "Открыть ссылку",
  visitWebsite: "Посетить сайт",
  joinChannel: "Присоединиться к каналу",
  followAccount: "Подписаться на аккаунт",
  shareStory: "Поделиться историей",
  
  // Task types
  types: {
    telegramChannel: "Telegram канал",
    telegramChannelDesc: "Подписаться на Telegram канал",
    telegramChat: "Telegram чат",
    telegramChatDesc: "Присоединиться к Telegram чату",
    twitterFollow: "Подписка Twitter",
    twitterFollowDesc: "Подписаться на аккаунт в Twitter",
    twitterRepost: "Репост Twitter",
    twitterRepostDesc: "Сделать репост в Twitter",
    visitWebsite: "Посещение сайта",
    visitWebsiteDesc: "Посетить веб-сайт",
    telegramStory: "Telegram история",
    telegramStoryDesc: "Поделиться в Telegram историях",
  },
  
  // Task status
  status: {
    available: "Доступно",
    completed: "Выполнено",
    expired: "Истекло",
    pending: "Ожидает",
    verified: "Проверено",
    failed: "Неудачно",
  },
  
  // Rewards
  rewards: {
    attempts: "попыток",
    attempt: "попытка",
    earn: "Заработать",
    earned: "Заработано",
    reward: "Награда",
    totalEarned: "Всего заработано",
  },
  
  // Statistics
  stats: {
    totalTasks: "Всего заданий",
    completedTasks: "Выполненных заданий",
    completionRate: "Процент выполнения",
    totalAttemptsEarned: "Всего попыток заработано",
  },
  
  // Messages
  messages: {
    taskCompleted: "Задание выполнено успешно!",
    taskCompletedDesc: "Вы получили {attempts} {plural}",
    taskFailed: "Не удалось выполнить задание",
    taskFailedDesc: "Пожалуйста, попробуйте еще раз",
    verificationRequired: "Требуется проверка",
    verificationRequiredDesc: "Сначала выполните необходимое действие",
    verificationSuccess: "Проверка прошла успешно",
    verificationSuccessDesc: "Задание было успешно проверено",
    verificationFailed: "Проверка не удалась",
    verificationFailedDesc: "Выполните необходимое действие и попробуйте еще раз",
    alreadyCompleted: "Задание уже выполнено",
    alreadyCompletedDesc: "Вы уже выполнили это задание",
    taskNotFound: "Задание не найдено",
    taskNotFoundDesc: "Запрашиваемое задание не найдено",
    confirmCompletion: "Вы уверены, что хотите выполнить это задание?",
    confirmCompletionDesc: "Вы получите {attempts} {plural}",
  },
  
  // Notifications
  notifications: {
    taskSuccess: "Задание выполнено!",
    taskSuccessMessage: "Вы получили {attempts} {plural}!",
    verificationSuccess: "Проверка прошла успешно!",
    verificationSuccessMessage: "Задание было проверено и выполнено",
    taskError: "Ошибка задания",
    taskErrorMessage: "Не удалось выполнить задание. Попробуйте еще раз.",
    verificationError: "Ошибка проверки",
    verificationErrorMessage: "Не удалось проверить задание. Попробуйте еще раз.",
  },
  
  // Instructions
  instructions: {
    telegramChannel: "Присоединитесь к Telegram каналу по ссылке ниже, затем нажмите Выполнить для проверки подписки",
    telegramChat: "Присоединитесь к Telegram чату по ссылке ниже, затем нажмите Выполнить для проверки участия",
    twitterFollow: "Подпишитесь на Twitter аккаунт по ссылке ниже, затем нажмите Выполнить для проверки подписки",
    twitterRepost: "Сделайте репост в Twitter по ссылке ниже, затем нажмите Выполнить для проверки репоста",
    visitWebsite: "Посетите веб-сайт по ссылке ниже, затем нажмите Выполнить для получения награды",
    telegramStory: "Поделитесь контентом в ваших Telegram историях по ссылке ниже, затем нажмите Выполнить для проверки поста",
    general: "Выполните требуемое действие по ссылке ниже, затем нажмите Выполнить для получения награды",
  },
  
  // Error messages
  errors: {
    taskNotFound: "Задание не найдено",
    alreadyCompleted: "Задание уже выполнено",
    verificationFailed: "Проверка не удалась",
    completionFailed: "Не удалось выполнить задание",
    networkError: "Произошла ошибка сети",
    unknownError: "Произошла неизвестная ошибка",
    authenticationError: "Ошибка аутентификации",
    permissionDenied: "Доступ запрещен",
    taskExpired: "Задание истекло",
    invalidRequest: "Неверный запрос",
    serverError: "Произошла ошибка сервера",
  },
  
  // Buttons
  buttons: {
    complete: "Выполнить",
    completed: "Выполнено",
    verify: "Проверить",
    verifying: "Проверяем...",
    completing: "Выполняем...",
    openLink: "Открыть ссылку",
    tryAgain: "Попробовать еще раз",
    refresh: "Обновить",
    goBack: "Назад",
    close: "Закрыть",
    confirm: "Подтвердить",
    cancel: "Отменить",
  },
  
  // Badges
  badges: {
    new: "Новое",
    popular: "Популярное",
    limited: "Ограниченное",
    exclusive: "Эксклюзивное",
    bonus: "Бонус",
    featured: "Рекомендуемое",
  },
} as const;