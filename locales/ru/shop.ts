// src/locales/ru/shop.ts - Shop and purchases with TON Shop localization
export const shop = {
  title: "SHOP",
  subtitle: "Покупка дополнительных игровых попыток",
  paymentMethods: "Способы оплаты",
  payWithTON: "За TON",
  tonDescription: "Дешевле",
  openTONShop: "TON",
  payWithStars: "Telegram Stars",
  starsDescription: "Мммм, звёздочки",
  moreAttempts: "Больше Попыток",
  description: "Получите 1 дополнительную игровую попытку",
  features: "Особенности",
  benefits: [
    "Сыграйте ещё одну игру",
    "Мгновенная активация",
    "Без срока действия",
  ],
  price: "{price} Telegram Stars",
  purchase: "КУПИТЬ ЗА {price} ⭐",
  creatingInvoice: "СОЗДАНИЕ СЧЁТА...",
  processingPayment: "ОБРАБОТКА ПЛАТЕЖА...",
  purchaseSuccessful: "Покупка Успешна!",
  purchaseFailed: "Покупка Не Удалась",
  attemptAdded: "+1 попытка добавлена на ваш аккаунт",
  paymentInfo: "Информация о Платеже",
  purchaseSuccess: "Покупка Успешна!",
  purchaseSuccessMessage: "Оп, попыточки: +{attempts}",
  instantResetSuccess: "Попытки Восстановлены!",
  instantResetMessage: "Ваши попытки восстановлены и таймер сброшен",
  support: "Поддержка",
  supportContact: "По вопросам возврата обращайтесь:",
  supportLink: "https://t.me/mrmrcrowley",
  paymentDetails: [
    "• Платежи обрабатываются через Telegram Stars",
    "• Попытки добавляются мгновенно после оплаты",
    "• Безопасный платёж через Telegram",
    "• Нет ограничений на количество попыток",
    "• Без регулярных платежей",
  ],
  products: {
    attempts1: {
      title: "+1 Попытка",
      description: "Получите 1 дополнительную игровую попытку",
    },
    attempts5: {
      title: "+5 Попыток",
      description: "Получите 5 дополнительных игровых попыток",
    },
    attempts10: {
      title: "+10 Попыток",
      description: "Получите 10 дополнительных игровых попыток",
    },
    attempts100: {
      title: "+100 Попыток",
      description: "Получите 100 дополнительных игровых попыток",
    },
    instantReset: {
      title: "Мгновенный Сброс",
      description: "Мгновенно восстановите 10 попыток и сбросьте таймер",
    },
  },
  attemptNotRecorded: "⚠ Попытка не записана",
  onlySuccessful: "Только успешное время реакции сохраняется в таблицу лидеров",
  saveFailed: "✗ Сохранение не удалось после {attempts} попыток",
  recordedLocally: "Ваше время записано локально, но не синхронизировано",
  retrySave: "ПОВТОРИТЬ СОХРАНЕНИЕ",
  badges: {
    test: "Тест",
    popular: "Популярно",
    bestvalue: "Выгодно",
    ultimate: "Максимум",
    instant: "Мгновенно",
  },
  testProduct: {
    title: "Тестовый товар",
    description: "Демонстрация визуальных эффектов",
    button: "Тест эффектов",
  },
  buy: "Купить",
  loading: "Загрузка...",
  notifications: {
    purchaseSuccess: "Покупка Успешна!",
    purchaseSuccessMessage: "{attempts} попыт{plural} добавлено на ваш аккаунт",
    instantResetSuccess: "Попытки Восстановлены!",
    instantResetMessage: "Ваши попытки восстановлены и таймер сброшен",
  },

  // TON Shop specific localization
  tonShop: {
    title: "TON Магазин",
    subtitle: "Покупка игровых попыток за криптовалюту TON",
    loading: "Загрузка TON магазина...",

    errors: {
      missingAuthData:
        "Отсутствуют данные аутентификации. Пожалуйста, откройте эту страницу через основное приложение.",
      invalidAuthData: "Неверные данные аутентификации",
      initializationFailed: "Не удалось инициализировать магазин",
      loadingError: "Ошибка загрузки магазина",
      orderCreationFailed: "Не удалось создать заказ",
      walletNotConnected: "Кошелек не подключен",
      invalidOrderData: "Неверные данные заказа",
      transactionCancelled: "Транзакция отменена пользователем",
      insufficientBalance: "Недостаточно TON на балансе кошелька",
      transactionFailed:
        "Не удалось отправить транзакцию. Пожалуйста, попробуйте снова.",
      statusCheckFailed: "Не удалось проверить статус заказа",
      timeoutExpired:
        "Время ожидания истекло. Пожалуйста, проверьте статус транзакции вручную.",
      authDataUnavailable: "Не удалось получить данные аутентификации Telegram",
      openingFailed: "Не удалось открыть TON магазин",
    },

    wallet: {
      connected: "Кошелек подключен",
      connectRequired: "Подключите кошелек для совершения покупок",
    },

    user: {
      greeting: "Добро пожаловать, {name}!",
    },

    status: {
      creatingOrder: "Создание заказа...",
      preparingPurchase: "Подготовка вашей покупки",
      processingPayment: "Обработка платежа...",
      processingTime:
        "Ваша транзакция обрабатывается. Это может занять до 5 минут.",
      paymentSuccessful: "Платеж успешно завершен!",
      attemptsAdded: "Ваши попытки добавлены на аккаунт.",
      paymentError: "Ошибка платежа",
    },

    actions: {
      newPurchase: "Новая покупка",
      tryAgain: "Попробовать снова",
      processing: "Обработка...",
      buyWithTON: "Купить за TON",
      opening: "Открытие...",
    },

    info: {
      processingTime: "Платежи обрабатываются автоматически в течение 5 минут",
      safeToClose: "Вы можете безопасно закрыть эту страницу после оплаты",
      attemptsVisible:
        "Попытки будут видны в основном приложении после обработки",
      corporateWallet: "Тут крч транзы все",
    },

    badges: {
      popular: "d46351ba",
      bestValue: "333607e13db3",
      ultimate: "3ff954c06925",
    },

    products: {
      attempts_1: {
        title: "+1 Попытка",
        description: "Получите 1 дополнительную игровую попытку",
      },
      attempts_5: {
        title: "+5 Попыток",
        description: "Получите 5 дополнительных игровых попыток",
      },
      attempts_10: {
        title: "+10 Попыток",
        description: "Получите 10 дополнительных игровых попыток",
      },
      attempts_100: {
        title: "+100 Попыток",
        description: "Получите 100 дополнительных игровых попыток",
      },
    },

    button: {
      tooltip:
        "Открыть TON магазин для покупки игровых попыток за криптовалюту TON",
    },
  },
} as const;
