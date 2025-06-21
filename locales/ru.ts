// src/locales/ru.ts - Updated Russian localization with tournament rules

export const ru = {
    // Common UI elements
    common: {
        loading: "ЗАГРУЗКА...",
        error: "ОШИБКА",
        retry: "ПОВТОР",
        cancel: "ОТМЕНА",
        confirm: "ПОДТВЕРДИТЬ",
        close: "ЗАКРЫТЬ",
        back: "НАЗАД",
        next: "ДАЛЕЕ",
        save: "СОХРАНИТЬ",
        delete: "УДАЛИТЬ",
        edit: "РЕДАКТИРОВАТЬ",
        yes: "ДА",
        no: "НЕТ",
        ok: "ОК",
        continue: "ПРОДОЛЖИТЬ",
        skip: "ПРОПУСТИТЬ",
        start: "СТАРТ",
        stop: "СТОП",
        play: "ИГРАТЬ",
        pause: "ПАУЗА",
        quit: "ВЫЙТИ",
        menu: "МЕНЮ",
        settings: "НАСТРОЙКИ",
        about: "О ПРОГРАММЕ",
        help: "ПОМОЩЬ",
        info: "ИНФО",
        share: "ПОДЕЛИТЬСЯ",
        copy: "КОПИРОВАТЬ",
        copied: "СКОПИРОВАНО!",
        total: "ВСЕГО",
        best: "ЛУЧШИЙ",
        score: "СЧЁТ",
        time: "ВРЕМЯ",
        level: "УРОВЕНЬ",
        attempts: "ПОПЫТКИ",
        remaining: "ОСТАЛОСЬ",
        used: "ИСПОЛЬЗОВАНО",
        available: "ДОСТУПНО",
        unlimited: "БЕЗЛИМИТ",
        or: "или",
    },

    // Navigation
    nav: {
        home: "Главная",
        leaderboard: "Рейтинг",
        profile: "Профиль",
        shop: "Магазин",
        game: "Игра",
        tournament: "Турнир",
        tasks: "Задания",
    },

    // Задания

    tasks: {
        // Основные элементы
        title: "ЗАДАНИЯ",
        subtitle: "Выполняйте задания для получения дополнительных попыток",
        loading: "Загрузка",

        // Кнопки и статусы
        start: "НАЧАТЬ",
        checking: "ПРОВЕРКА...",
        claim: "ПОЛУЧИТЬ",
        completed: "ВЫПОЛНЕНО",
        subscribe: "ПОДПИСАТЬСЯ",
        visit: "ПОСЕТИТЬ",
        follow: "ПОДПИСАТЬСЯ",
        repost: "РЕПОСТ",
        share: "ПОДЕЛИТЬСЯ",

        // Статусы ожидания
        waitSeconds: "Ждите {seconds}с",
        waitMinutes: "Ждите {minutes}м",
        verifying: "Проверяем...",

        // Награды
        reward: "Попыток:",

        // Разделы
        sections: {
            story: "Специальное задание",
            active: "Активные задания",
            completed: "Выполненные задания"
        },

        // Типы заданий
        types: {
            telegram_channel: "Подписка",
            telegram_chat: "Вступить",
            twitter_follow: "Подписка",
            twitter_repost: "Репост",
            website_visit: "Посетить",
            story_share: "Сторис"
        },

        // Сообщения об ошибках
        errors: {
            notSubscribed: "Вы не подписаны на этот канал/чат",
            taskNotFound: "Задание не найдено",
            alreadyCompleted: "Задание уже выполнено",
            cooldownActive: "Задание недоступно",
            verificationFailed: "Проверка не удалась, попробуйте еще раз",
            rewardClaimFailed: "Не удалось получить награду",
            unknownError: "Произошла неизвестная ошибка"
        },

        // Сообщения об успехе
        success: {
            taskStarted: "Задание начато успешно",
            taskCompleted: "Задание выполнено успешно",
            rewardClaimed: "Награда получена! +{count} попыток добавлено",
            subscriptionVerified: "Подписка успешно подтверждена"
        },

        // Описания заданий
        descriptions: {
            telegram_channel: "Подпишитесь на наш канал для получения обновлений",
            telegram_chat: "Присоединитесь к нашему чату",
            twitter_follow: "Подпишитесь на нас в Twitter",
            twitter_repost: "Сделайте репост нашего твита",
            website_visit: "Посетите наш веб-сайт",
            story_share: "Поделитесь игрой в своих сторис Telegram"
        },

        // Специальное задание
        storyTask: {
            title: "Поделиться в сторис",
            description: "Делитесь игрой в сторис Telegram каждые 2 часа",
            cooldownText: "Доступно снова через {time}",
            notSupported: "Публикация в сторис не поддерживается в этой версии"
        },

        // Пустые состояния
        empty: {
            noActiveTasks: "Нет доступных заданий",
            noCompletedTasks: "Пока нет выполненных заданий",
            startCompleting: "Начните выполнять задания для получения попыток!"
        },

        // Информационные сообщения
        info: {
            telegramVerification: "Подписка будет проверена автоматически",
            trustVerification: "Выполнение задания проверяется на основе доверия",
            completionDelay: "Пожалуйста, подождите {seconds} секунд для проверки"
        }
    },

    // Main page
    main: {
        title: "something",
        greeting: "Привет, {name}",
        startGame: "НАЧАТЬ ИГРУ",
        loading: "Загрузка...",
        welcome: "ДОБРО ПОЖАЛОВАТЬ",
        chooseEntryMethod: "Выберите способ входа",
        initialize: "ИНИЦИАЛИЗАЦИЯ",
        quickStart: "БЫСТРЫЙ СТАРТ",
        fullExperience: "С вступительным видео",
        recommended: "Рекомендуется для новых пользователей",
        skipIntro: "Пропустить интро • Режим картошки",
        slowConnections: "Для медленного интернета и нетерпеливых 🥔",
    },

    // Auth/Registration
    auth: {
        checkingUser: "Проверка пользователя...",
        registering: "Регистрация...",
        processingReferralBonus: "Обработка реферального бонуса...",
        continueWithoutVideo: "Продолжить без видео",
        referralBonus: "РЕФЕРАЛЬНЫЙ БОНУС!",
        youllGet: "Вы получите",
        extraAttempt: "дополнительную попытку",
        extraAttempts: "дополнительных попыток",
        referredBy: "Пригласил:",
        telegramDataUnavailable: "Данные Telegram WebApp недоступны",
        databaseConnectionError: "Ошибка подключения к базе данных",
        userNotFound: "Пользователь не найден в базе данных, требуется регистрация",
        registrationFailed: "Ошибка регистрации пользователя",
        unknownError: "Произошла неизвестная ошибка",
    },

    // Game modes
    game: {
        modes: {
            title: "МОД",
            subtitle: "Выберите испытание",
            reaction: {
                name: "СКОРОСТЬ РЕАКЦИИ",
                description: "Проверьте молниеносные рефлексы с точным таймингом",
                difficulty: "Средний",
                duration: "~10 секунд",
                objective:
                    "Кликните по целевому кругу как можно быстрее при его появлении для измерения времени реакции.",
                features: [
                    "Точность одной цели",
                    "Случайный тайминг (3-5с)",
                    "Измерение скорости",
                    "Оценка производительности",
                ],
                rules: [
                    "Один круг появится после случайной задержки (3-5 секунд)",
                    "Кликните по кругу как можно быстрее при его появлении",
                    "Только успешные клики записываются в таблицу лидеров",
                    "Чем быстрее ваша реакция, тем выше счёт",
                    "Максимальное время ожидания: 10 секунд до тайм-аута",
                ],
                tips: [
                    "Оставайтесь сосредоточенным и готовым в период ожидания",
                    "Не предвосхищайте - реагируйте только когда видите цель",
                    "Используйте доминирующую руку для более быстрого ответа",
                    "Поддерживайте удобное положение руки",
                    "Тренируйтесь регулярно для улучшения рефлексов",
                ],
                scoring:
                    "Счёт рассчитывается на основе времени реакции: Молния (≤150мс) = бонус 1.5x, Отлично (≤200мс) = бонус 1.3x, Хорошо (≤300мс) = бонус 1.1x. Базовый счёт = 1000 - время_реакции_мс.",
                instructions: {
                    ready: "Приготовьтесь к тесту молниеносных рефлексов",
                    waiting: "Ждите появления белого круга...",
                    clickNow: "ТЫКАЙ! СКОРЕЕ!",
                    targetWillAppear: "Цель появится через 3-5 секунд",
                    lightningFast: "Требуются молниеносные рефлексы",
                    preparing: "Подготовка",
                },
                results: {
                    title: "ТЕСТ РЕАКЦИИ",
                    subtitle: "Тест скорости завершён",
                    reactionTime: "ВРЕМЯ РЕАКЦИИ",
                    missed: "ПРОМАХ",
                    testAgain: "ТЕСТ СНОВА",
                    backToMenu: "НАЗАД В МЕНЮ",
                    noAttemptsLeft: "НЕТ ПОПЫТОК",
                },
                ratings: {
                    lightning: "МОЛНИЯ",
                    excellent: "ОТЛИЧНО",
                    good: "ХОРОШО",
                    average: "СРЕДНЕ",
                    slow: "МЕДЛЕННО",
                    missed: "ПРОМАХ",
                },
                ratingDescriptions: {
                    lightning: "Сверхчеловеческие рефлексы!",
                    excellent: "Отличная скорость!",
                    good: "Хорошее время реакции!",
                    average: "Продолжайте тренироваться!",
                    slow: "Можно быстрее...",
                    missed: "Цель пропущена или неправильный клик.",
                },
            },
            survival: {
                name: "РЕЖИМ ВЫЖИВАНИЯ",
                description:
                    "Выживите в эскалирующих испытаниях точности со смертельными ловушками",
                difficulty: "Экстремальный",
                duration: "До провала",
                objective:
                    "Выживайте как можно дольше, кликая по белым кругам и избегая красных кругов-ловушек на все более сложных уровнях.",
                features: [
                    "15 эскалирующих уровней",
                    "Множественные цели",
                    "Круги-ловушки (красные)",
                    "Одна ошибка = смерть",
                ],
                rules: [
                    "Кликайте только по белым кругам - они исчезают при правильном клике",
                    "Никогда не кликайте по красным кругам - это ловушки, которые завершают игру",
                    "Никогда не кликайте по неактивным (серым) кругам - это тоже завершает игру",
                    "Пропуск тайм-аута белого круга также завершает игру",
                    "Проходите через 15 уровней с возрастающей сложностью",
                    "Каждый уровень увеличивает скорость, цели и сложность",
                ],
                tips: [
                    "Сосредоточьтесь на точности, а не на скорости - одна ошибка завершает всё",
                    "Отслеживайте несколько целей одновременно",
                    "Развивайте периферийное зрение",
                    "Сохраняйте спокойствие при увеличении интенсивности",
                    "Учитесь быстро различать цвета под давлением",
                ],
                scoring:
                    "Базовый счёт = секунды_выживания + (идеальная_серия × 3) + (достигнутый_уровень × 15). Более высокие уровни и длинные серии дают экспоненциальные бонусы.",
                instructions: {
                    oneMistakeDeath: "ОДНА ОШИБКА = СМЕРТЬ",
                },
                results: {
                    title: "КОНЕЦ ВЫЖИВАНИЯ",
                    survivalTime: "ВРЕМЯ ВЫЖИВАНИЯ",
                    finalScore: "ФИНАЛЬНЫЙ СЧЁТ",
                    attemptsLeft: "ПОПЫТОК ОСТАЛОСЬ",
                    perfectStreak: "ИДЕАЛЬНАЯ СЕРИЯ",
                    correctHits: "ПРАВИЛЬНЫХ ПОПАДАНИЙ",
                    levelProgress: "Прогресс уровня",
                    levelsCompleted: "УРОВНЕЙ ПРОЙДЕНО",
                    surviveAgain: "ВЫЖИТЬ СНОВА",
                    escapeToMenu: "ПОБЕГ В МЕНЮ",
                    starting: "ЗАПУСК...",
                },
                deathCauses: {
                    miss: "Не удалось попасть по белой цели вовремя",
                    wrongClick: "Клик по неактивной цели",
                    decoyHit: "Клик по красному кругу-ловушке",
                    default: "Выживание завершено",
                },
                levels: {
                    warmingUp: "РАЗМИНКА",
                    gettingStarted: "НАЧИНАЕМ",
                    basicPrecision: "БАЗОВАЯ ТОЧНОСТЬ",
                    focusRequired: "НУЖНА КОНЦЕНТРАЦИЯ",
                    multiTarget: "МУЛЬТИ-ЦЕЛЬ",
                    enhancedDifficulty: "ПОВЫШЕННАЯ СЛОЖНОСТЬ",
                    intenseFocus: "ИНТЕНСИВНАЯ КОНЦЕНТРАЦИЯ",
                    overwhelming: "ПОДАВЛЯЮЩИЙ",
                    chaosManagement: "УПРАВЛЕНИЕ ХАОСОМ",
                    expertPrecision: "ЭКСПЕРТНАЯ ТОЧНОСТЬ",
                    masterLevel: "МАСТЕРСКИЙ УРОВЕНЬ",
                    legandarySkill: "ЛЕГЕНДАРНОЕ МАСТЕРСТВО",
                    superhuman: "СВЕРХЧЕЛОВЕЧЕСКИЙ",
                    beyondLimits: "ЗА ПРЕДЕЛАМИ",
                    perfectMachine: "СОВЕРШЕННАЯ МАШИНА",
                },
            },
        },
        general: {
            initializingGame: "ИНИЦИАЛИЗАЦИЯ ИГРЫ...",
            noAttempts: "НЕТ ПОПЫТОК",
            noAttemptsLeft: "НЕТ ПОПЫТОК",
            attemptsUsed: "Все попытки использованы",
            waitForReset:
                "Дождитесь автоматического сброса или купите больше попыток",
            resetIn: "Сброс через:",
            automaticReset: "Попытки сбрасываются автоматически через 2 часа",
            useWisely: "Используйте попытки мудро - каждая игра на счету!",
            objective: "ЦЕЛЬ",
            rules: "ПРАВИЛА",
            proTips: "ПРОФЕССИОНАЛЬНЫЕ СОВЕТЫ",
            scoringSystem: "СИСТЕМА ОЧКОВ",
            difficulty: "Сложность",
            duration: "Длительность",
            startPlaying: "НАЧАТЬ ИГРАТЬ",
            checkingAttempts: "ПРОВЕРКА ПОПЫТОК...",
        },
    },

    // Tournament system
    tournament: {
        title: "ТУРНИР",
        noActiveTournament: "Нет Активных Турниров",
        noActiveTournamentDesc: "В данный момент нет активных турниров. Проверьте позже для получения информации о предстоящих турнирах!",
        tournamentActive: "Турнир Активен",
        timeRemaining: "осталось",
        enterTournament: "ВОЙТИ В ТУРНИР",
        playTournamentAgain: "ИГРАТЬ В ТУРНИРЕ СНОВА",
        tournamentEnd: "КОНЕЦ ТУРНИРА",
        tournamentMode: "Турнирный Режим",
        prizes: "ПРИЗЫ ТУРНИРА",
        winners: "ОБЛАДАТЕЛИ ПРИЗОВ",
        participants: "УЧАСТНИКИ",
        otherParticipants: "ДРУГИЕ УЧАСТНИКИ",
        noParticipants: "Пока нет участников",
        beFirstParticipant: "Станьте первым участником турнира!",
        yourBestResult: "ВАШ ЛУЧШИЙ РЕЗУЛЬТАТ",
        rank: "МЕСТО",
        maxLevel: "МАКС УРОВЕНЬ",
        bestTime: "ЛУЧШЕЕ ВРЕМЯ",
        survivalTime: "ВРЕМЯ ВЫЖИВАНИЯ",
        tournamentScore: "ТУРНИРНЫЙ СЧЁТ",
        perfectStreak: "ИДЕАЛЬНАЯ СЕРИЯ",
        correctHits: "ПРАВИЛЬНЫХ ПОПАДАНИЙ",
        levelsCompleted: "уровней пройдено",
        savingResult: "Сохранение результата турнира...",
        resultSaved: "Результат турнира успешно сохранён",
        resultSavedAfterRetries: "Сохранено после {attempts} попыток",
        dataSynchronized: "Данные синхронизированы с турнирной таблицей лидеров",
        saveFailedRetries: "Сохранение не удалось после {attempts} попыток",
        resultRecordedLocally: "Ваш результат записан локально, но не синхронизирован",
        retrySave: "ПОВТОРИТЬ СОХРАНЕНИЕ",
        connectionIssue: "Проблема соединения - автоматический повтор",
        retryingSave: "Повтор сохранения ({attempt}/{max})...",
        loadingTournament: "Загрузка турнира...",
        tournamentNotFound: "Турнир не найден",
        redirectingToTournament: "Перенаправление на страницу турнира...",
        ended: "Завершён",
        rulesTitle: "Правила Турнира",
        rulesSubtitle: "Рекомендации и Регламент Соревнования",
        rulesButton: "Правила и Рекомендации Турнира",
        rules: {
            gameMode: {
                title: "Игровой Режим",
                description: "Турниры используют исключительно режим выживания",
                detail1: "Проходите через 12 уровней возрастающей сложности",
                detail2: "Выживайте как можно дольше для достижения максимального счёта",
                detail3: "Каждый уровень приносит более быстрые цели и большую сложность"
            },
            competition: {
                title: "Правила Соревнования",
                description: "Основные правила турнирного соревнования",
                detail1: "Каждая игра тратит одну попытку с баланса вашего аккаунта",
                detail2: "Только ваш лучший результат учитывается в турнирной таблице",
                detail3: "Кликайте по белым кругам для получения очков и прогресса",
                detail4: "Избегайте красных кругов-ловушек любой ценой - они завершают игру",
                detail5: "Пропуск любой цели немедленно завершает игру",
                detail6: "Турнир проходит только в течение ограниченного периода времени"
            },
            scoring: {
                title: "Система Подсчёта Очков",
                description: "Как определяются турнирные рейтинги",
                detail1: "Время выживания является основным фактором рейтинга",
                detail2: "Игрок с самым длительным временем выживания побеждает",
                detail3: "Достигнутый уровень служит вторичным фактором рейтинга",
                detail4: "Идеальная серия показывает количество последовательных успешных попаданий",
                detail5: "В случае одинакового времени выживания побеждает наивысший достигнутый уровень",
                detail6: "Турнирная таблица обновляется в реальном времени после каждой игры"
            },
            format: {
                title: "Формат Турнира",
                description: "Структура соревнования и временные рамки",
                detail1: "Турнир проходит в течение ограниченного периода времени",
                detail2: "Турнирная таблица обновляется в реальном времени после каждой завершённой игры",
                detail3: "Победители определяются по завершении турнира",
                detail4: "Регистрация не требуется - просто начните играть",
                detail5: "Распределение призов основано на финальных рейтингах",
                detail6: "Разрешены множественные попытки в течение турнирного периода"
            },
            fairPlay: {
                title: "Политика Честной Игры",
                description: "Правила для честного соревнования",
                detail1: "Запрещены внешние инструменты или программы автоматизации",
                detail2: "Совместное использование аккаунта строго запрещено",
                detail3: "Подозрительная активность может привести к дисквалификации",
                detail4: "Все игры должны быть сыграны честно владельцем аккаунта",
                detail5: "Нарушения могут привести к постоянному запрету участия в турнирах"
            },
            tips: {
                title: "Профессиональные Советы",
                description: "Стратегии для успеха в турнире",
                detail1: "Тренируйтесь в обычном режиме выживания перед участием в соревновании",
                detail2: "Сосредоточьтесь на точности, а не на скорости, чтобы избежать ошибок",
                detail3: "Сохраняйте спокойствие при увеличении сложности уровней",
                detail4: "Внимательно следите за изменениями цвета под давлением",
                detail5: "Развивайте периферийное зрение для множественных целей",
                detail6: "Стратегически управляйте своими попытками в течение турнирного периода"
            }
        }
    },

    // Attempts system
    attempts: {
        current: "ТЕКУЩИЕ ПОПЫТКИ",
        remaining: "ПОПЫТОК ОСТАЛОСЬ",
        noRemaining: "Попытки закончились - купите ещё, чтобы продолжить игру",
        lowRemaining: "Мало попыток - рассмотрите покупку дополнительных",
        plenty: "У вас много попыток для игры",
        resetTime: "Следующий сброс через",
        total: "ВСЕГО",
    },

    // Profile page
    profile: {
        title: "ПРОФИЛЬ",
        loadingProfile: "ЗАГРУЗКА ПРОФИЛЯ...",
        notFound: "ПРОФИЛЬ НЕ НАЙДЕН",
        overallStats: "Общая статистика",
        reactionMode: "Режим реакции",
        survivalMode: "Режим выживания",
        noReactionTestsYet: "Пока нет тестов реакции",
        testReflexesToSeeStats: "Пройдите тест на рефлексы, чтобы увидеть статистику",
        noSurvivalAttemptsYet: "Пока не было попыток выживания",
        enterSurvivalToSeeStats: "Войдите в режим выживания, чтобы увидеть статистику",
        totalGames: "Всего игр",
        currentAttempts: "Текущие попытки",
        totalTests: "Всего тестов",
        totalAttempts: "Всего попыток",
        referralButton: "Рефералы",
        achievementButton: "Достижения",
        tabs: {
            stats: "СТАТИСТИКА",
            referrals: "РЕФЕРРАЛЫ",
            history: "ИСТОРИЯ",
            achievements: "ДОСТИЖЕНИЯ",
        },
        levels: {
            rookie: "НОВИЧОК",
            active: "АКТИВНЫЙ",
            skilled: "УМЕЛЫЙ",
            expert: "ЭКСПЕРТ",
            legend: "ЛЕГЕНДА",
        },
        stats: {
            currentAttempts: "ТЕКУЩИЕ ПОПЫТКИ",
            reactionModeStats: "СТАТИСТИКА РЕЖИМА РЕАКЦИИ",
            survivalModeStats: "СТАТИСТИКА РЕЖИМА ВЫЖИВАНИЯ",
            noReactionTests: "НЕТ ТЕСТОВ РЕАКЦИИ",
            testReflexes: "ПРОВЕРЬ СВОИ МОЛНИЕНОСНЫЕ РЕФЛЕКСЫ!",
            noSurvivalAttempts: "НЕТ ПОПЫТОК ВЫЖИВАНИЯ",
            enterSurvival: "ПРИНЯТЬ ВЫЗОВ ВЫЖИВАНИЯ!",
            bestTime: "ЛУЧШЕЕ ВРЕМЯ",
            bestScore: "ЛУЧШИЙ СЧЕТ",
            averageTime: "СРЕДНЕЕ ВРЕМЯ",
            ranking: "РЕЙТИНГ",
            maxLevel: "МАКСИМАЛЬНЫЙ УРОВЕНЬ",
            bestStreak: "ЛУЧШАЯ СЕРИЯ",
        },
        referrals: {
            title: "РЕФЕРРАЛЬНАЯ СИСТЕМА",
            friendsInvited: "ПРИГЛАШЕНО ДРУЗЕЙ",
            attemptsBonus: "БОНУСНЫЕ ПОПЫТКИ",
            yourReferralCode: "ВАШ РЕФЕРРАЛЬНЫЙ КОД",
            referralLink: "РЕФЕРРАЛЬНАЯ ССЫЛКА",
            copyLink: "СКОПИРОВАТЬ ССЫЛКУ",
            share: "ПОДЕЛИТЬСЯ",
            howItWorks: "КАК ЭТО РАБОТАЕТ",
            shareWithFriends: "Поделитесь своей реферальной ссылкой с друзьями",
            theyGetExtra: "Они получают +{bonus} дополнительную попытку при регистрации",
            youGetRecognition: "Вы получаете признание за каждого приглашенного",
            helpGrow: "Помогите развивать сообщество!",
            referredBy: "ПРИГЛАШЕН(А)",
        },
        history: {
            title: "ПОСЛЕДНИЕ ИГРЫ",
            noGamesYet: "ЕЩЁ НЕ БЫЛО ИГР",
        },
        achievements: {
            title: "ДОСТИЖЕНИЯ",
            noAchievements: "ДОСТИЖЕНИЙ ЕЩЁ НЕТ",
            playToUnlock: "ИГРАЙТЕ, ЧТОБЫ ОТКРЫВАТЬ ДОСТИЖЕНИЯ!",
            activePlayer: "АКТИВНЫЙ ИГРОК",
            dedicatedGamer: "ПРЕДАННЫЙ ИГРОК",
            gameMaster: "МАСТЕР ИГРЫ",
            recruiter: "ВЕРБУЮЩИЙ",
            influencer: "ИНФЛУЕНСЕР",
            ambassador: "АМБАССАДОР",
            speedTester: "ИСПЫТАТЕЛЬ СКОРОСТИ",
            quickReflexes: "БЫСТРЫЕ РЕФЛЕКСЫ",
            lightningFast: "МОЛНИЕНОСНЫЙ",
            superhumanSpeed: "СВЕРХЧЕЛОВЕЧЕСКАЯ СКОРОСТЬ",
            speedDemon: "ДЕМОН СКОРОСТИ",
            survivor: "ВЫЖИВШИЙ",
            persistentSurvivor: "УПОРНЫЙ ВЫЖИВШИЙ",
            enduranceMaster: "МАСТЕР ВЫНОСЛИВОСТИ",
            survivalLegend: "ЛЕГЕНДА ВЫЖИВАНИЯ",
            levelClimber: "ПОКОРИТЕЛЬ УРОВНЕЙ",
            eliteSurvivor: "ЭЛИТНЫЙ ВЫЖИВШИЙ",
            streakMaster: "МАСТЕР СЕРИИ",
            survivalElite: "ЭЛИТА ВЫЖИВАНИЯ",
            topPlayer: "ТОП-ИГРОК",
            descriptions: {
                gamesPlayed: "СЫГРАНО ИГР: {count}+",
                invitedFriend: "ПРИГЛАШЕН {count}+ ДРУГ",
                invitedFriends: "ПРИГЛАШЕНО {count}+ ДРУЗЕЙ",
                testedReaction: "ПРОЙДЕН ТЕСТ РЕАКЦИИ",
                reactionTests: "ПРОЙДЕНО ТЕСТОВ РЕАКЦИИ: {count}+",
                subReaction: "РЕАКЦИЯ МЕНЕЕ {time} МС",
                topReaction: "ТОП-10 ВРЕМЯ РЕАКЦИИ",
                enteredSurvival: "ВОШЕЛ В РЕЖИМ ВЫЖИВАНИЯ",
                survivalAttempts: "ПОПЫТОК ВЫЖИВАНИЯ: {count}+",
                secondsSurvival: "ВЫЖИВАНИЕ: {time}+ СЕКУНД",
                minuteSurvival: "ВЫЖИВАНИЕ: {time}+ МИНУТ",
                reachedLevel: "ДОСТИГНУТ УРОВЕНЬ {level}+",
                perfectHits: "{count}+ ИДЕАЛЬНЫХ ПОПАДАНИЙ",
                topSurvivor: "ТОП-{rank} СРЕДИ ВЫЖИВШИХ",
                topOverall: "ТОП-{rank} В ОБЩЕМ ЗАЧЕТЕ",
            },
        },
    },

    // Leaderboard
    leaderboard: {
        title: "ТОП",
        loadingRanking: "ЗАГРУЗКА РЕЙТИНГОВЫХ ДАННЫХ...",
        failedToLoad: "НЕ УДАЛОСЬ ЗАГРУЗИТЬ РЕЙТИНГОВЫЕ ДАННЫЕ",
        overall: "ОБЩИЙ",
        reaction: "РЕАКЦИЯ",
        survival: "ВЫЖИВАНИЕ",
        players: "ИГРОКОВ",
        fastest: "БЫСТРЕЙШИЙ",
        longest: "ДЛИТЕЛЬНЫЙ",
        top: "ТОП",
        you: "ВЫ",
        noSpeedDemons: "ЕЩЁ НЕТ ДЕМОНОВ СКОРОСТИ",
        noSurvivors: "ЕЩЁ НЕТ ВЫЖИВШИХ",
        noPlayers: "ЕЩЁ НЕТ ИГРОКОВ",
        testReflexes: "ПРОВЕРЬТЕ СВОИ РЕФЛЕКСЫ!",
        enterChallenge: "ВОЙДИТЕ В ИСПЫТАНИЕ ВЫЖИВАНИЯ!",
        beFirst: "БУДЬТЕ ПЕРВЫМ КТО СЫГРАЕТ!",
        speedElite: "ЭЛИТА СКОРОСТИ",
        survivalElite: "ЭЛИТА ВЫЖИВАНИЯ",
        topPlayers: "ТОП ИГРОКИ",
        allPlayers: "ВСЕ ИГРОКИ",
    },

    // Shop
    shop: {
        title: "МАГАЗИН",
        subtitle: "Покупка дополнительных игровых попыток",
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
        purchaseSuccessMessage: "{attempts} попыт{plural} добавлено на ваш аккаунт",
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
            }
        },
        attemptNotRecorded: "⚠ Попытка не записана",
        onlySuccessful:
            "Только успешное время реакции сохраняется в таблицу лидеров",
        saveFailed: "✗ Сохранение не удалось после {attempts} попыток",
        recordedLocally: "Ваше время записано локально, но не синхронизировано",
        retrySave: "ПОВТОРИТЬ СОХРАНЕНИЕ",
        badges: {
            test: "Тест",
            popular: "Популярно",
            bestvalue: "Выгодно",
            ultimate: "Максимум",
            instant: "Мгновенно"
        },
        testProduct: {
            title: "Тестовый товар",
            description: "Демонстрация визуальных эффектов",
            button: "Тест эффектов"
        },
        buy: "Купить",
        loading: "Загрузка...",
        notifications: {
            purchaseSuccess: "Покупка Успешна!",
            purchaseSuccessMessage: "{attempts} попыт{plural} добавлено на ваш аккаунт",
            instantResetSuccess: "Попытки Восстановлены!",
            instantResetMessage: "Ваши попытки восстановлены и таймер сброшен",
        },
    },

    // Save status messages
    save: {
        recording: "Запись данных выживания...",
        recordingReaction: "Запись времени реакции...",
        retrying: "Повтор сохранения ({attempt}/{max})...",
        connectionIssue: "Проблема соединения - автоматический повтор",
        savedSuccessfully: "✓ Результат успешно сохранён",
        savedAfterRetries: "Сохранено после {attempts} попыток",
        synchronized: "Данные синхронизированы с таблицей лидеров",
        recordedSuccessfully: "✓ Запись выживания успешно сохранена",
    },

    // Error messages
    errors: {
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
    },

    // Time formatting
    time: {
        seconds: "{time}с",
        minutes: "{minutes}:{seconds}",
        milliseconds: "{time}мс",
    },
} as const;