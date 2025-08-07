// src/locales/ru/tournaments.ts - Tournament localization (Russian)
export const tournaments = {
    title: "ТУРНИРЫ",
    subtitle: "Еженедельные соревнования",

    // Tournament status
    status: {
        active: "АКТИВНЫЙ",
        upcoming: "ПРЕДСТОЯЩИЙ",
        completed: "ЗАВЕРШЁННЫЙ",
        cancelled: "ОТМЕНЁННЫЙ",
    },

    // Tournament sections
    sections: {
        activeTournament: "Текущий турнир",
        upcomingTournaments: "Предстоящие турниры",
        completedTournaments: "Завершённые турниры",
        noActiveTournament: "Нет активных турниров",
        noUpcomingTournaments: "Нет предстоящих турниров",
        noCompletedTournaments: "Нет завершённых турниров",
    },

    // Tournament details
    details: {
        mode: "Режим",
        duration: "Длительность",
        participants: "Участников",
        timeLeft: "Осталось времени",
        startsIn: "Начнётся через",
        endedOn: "Завершился",
        prizes: "Призы",
        joinTournament: "УЧАСТВОВАТЬ",
        viewLeaderboard: "ЛИДЕРБОРД",
        tournamentEnded: "ЗАВЕРШЁН",
    },

    // Game modes for tournaments
    modes: {
        survival: "Выживание",
        physics: "Физика",
        rotation: "Вращение",
    },

    // Leaderboard
    leaderboard: {
        title: "ЛИДЕРБОРД",
        position: "Место",
        player: "Игрок",
        score: "Счёт",
        games: "Игр",
        time: "Время",
        level: "Уровень",
        streak: "Серия",
        hits: "Попаданий",
        mistakes: "Ошибок",
        yourPosition: "Ваша позиция",
        notParticipating: "Вы не участвуете в турнире",
        participateFirst: "Сыграйте в режим {mode} чтобы попасть в турнир",
        loadingLeaderboard: "Загрузка лидерборда...",
        errorLoadingLeaderboard: "Ошибка загрузки лидерборда",
        retryLoading: "Повторить",
        topPlayers: "Топ игроков",
        viewFullLeaderboard: "Полный лидерборд",
        backToTournaments: "К турнирам",
    },

    // Tournament participation
    participation: {
        howToParticipate: "Как участвовать",
        playGames: "Играйте в режим {mode} во время турнира",
        bestScore: "Ваш лучший счёт засчитывается в турнире",
        multipleGames: "Играйте сколько хотите - засчитывается лучший результат",
        timeLimit: "Игры засчитываются только во время турнира",
        goodLuck: "Удачи в соревновании!",
    },

    // Time formatting
    time: {
        daysLeft: "{days}д {hours}ч",
        hoursLeft: "{hours}ч {minutes}м",
        minutesLeft: "{minutes}м {seconds}с",
        secondsLeft: "{seconds}с",
        ended: "Завершён",
        week: "неделя",
        day: "день",
        hour: "час",
        minute: "минута",
        second: "секунда",
        days: "дней",
        hours: "часов",
        minutes: "минут",
        seconds: "секунд",
    },

    // Errors and loading
    errors: {
        failedToLoad: "Не удалось загрузить турниры",
        tournamentNotFound: "Турнир не найден",
        noConnection: "Нет соединения",
        tryAgain: "Попробовать снова",
        loadingTournaments: "Загрузка турниров...",
        loadingTournament: "Загрузка турнира...",
    },

    // Prize positions
    prizes: {
        first: "1-е место",
        second: "2-е место",
        third: "3-е место",
        position: "{position}-е место",
        topTen: "Топ-10",
        winner: "Победитель",
        runner_up: "Призёр",
    },

    // Tournament cards
    cards: {
        participate: "Участвовать",
        viewDetails: "Подробнее",
        ended: "Завершён",
        comingSoon: "Скоро",
        live: "ПРЯМОЙ ЭФИР",
        new: "НОВЫЙ",
    },

    // Navigation
    navigation: {
        tournaments: "Турниры",
        backToGame: "К играм",
        backToMain: "На главную",
    },

    // Tournament results and achievements  
    results: {
        congratulations: "Поздравляем!",
        newPersonalBest: "Новый личный рекорд в турнире!",
        improvedPosition: "Вы поднялись в турнирной таблице!",
        tournamentScore: "Турнирный счёт",
        currentPosition: "Текущая позиция",
        keepPlaying: "Продолжайте играть чтобы улучшить результат!",
        tournamentProgress: "Прогресс турнира",
    },

    // Empty states
    empty: {
        noTournaments: "Турниров пока нет",
        checkBackLater: "Заходите позже",
        firstTournament: "Первый турнир скоро начнётся!",
    },

    // Additional missing keys found in components
    stats: {
        startDate: "Дата начала",
        endDate: "Дата окончания",
        status: "Статус",
    },
} as const;