// src/locales/ru/leagues.ts - Russian localization for leagues system
export const leagues = {
    title: "ЛИГИ",
    level: "Уровень",
    league: "Лига",
    progress: "Прогресс",
    rewards: "Награды",
    leaderboard: "Лидерборд",

    names: {
        bronze: "Бронзовая Лига",
        silver: "Серебряная Лига",
        gold: "Золотая Лига",
        platinum: "Платиновая Лига",
        diamond: "Алмазная Лига"
    },

    progressDisplay: {
        currentLevel: "Текущий Уровень",
        currentLeague: "Текущая Лига",
        gamesPlayed: "Игр Сыграно",
        gamesToNext: "Игр до Следующей Лиги",
        maxLevel: "Максимальный Уровень Достигнут",
        inTopLeague: "Вы в высшей лиге!",
        maxAchieved: "Достигнут максимум"
    },

    rewardsSection: {
        title: "Награды Лиг",
        description: "Первые 5 игроков, достигших каждой лиги, получают особые награды",
        noRewards: "Наград пока нет",
        yourRewards: "Ваши Награды",
        rewardReceived: "Награда Получена",
        position: "Позиция #{position}",
        giftReward: "Особый Подарок",
        attemptsReward: "+{amount} Попыток",
        availableRewards: "Доступные Награды",
        available: "Доступно",
        clamed: "Получено",
        noRewardsConfigured: "Для этой лиги награды не настроены.",
        rewardsLeft: "Осталось наград: {count}",
        allClaimed: "Все награды разобраны",
        specialReward: "Особая Награда"
    },

    leaderboardSection: {
        title: "Лидерборд Лиги",
        topPlayers: "Топ Игроки",
        yourPosition: "Ваша Позиция: #{position}",
        notInLeague: "Не в этой лиге",
        gamesNeeded: "Игр необходимо",
        nextReward: "Следующая награда при {games} играх",
        noMoreRewards: "Наград больше нет",
        playersInLeague: "Игроков в лиге: {count}",
        gamesToCatch: "Игр отстаете от лидера: {games}",
        gamesToNextReward: "Игр до следующей награды: {games}"
    },

    notifications: {
        levelUp: {
            title: "Повышение Уровня!",
            message: "Вы достигли {level} уровня!",
            keep_going: "Продолжайте играть!"
        },
        leaguePromotion: {
            title: "Повышение Лиги!",
            message: "Добро пожаловать в {league}!",
            position: "Вы #{position} достигли этой лиги"
        },
        rewardReceived: {
            title: "Награда Получена!",
            giftMessage: "Вы получили: {reward}",
            attemptsMessage: "Вы получили {amount} бонусных попыток!",
            position: "Позиция #{position} в {league}"
        }
    },

    status: {
        loading: "Загрузка данных лиг...",
        error: "Не удалось загрузить информацию о лигах",
        noData: "Данные о лигах недоступны"
    },

    buttons: {
        viewRewards: "Просмотр Наград",
        viewLeaderboard: "Просмотр Лидерборда",
        close: "Закрыть",
        showDetails: "Показать Детали",
        hideDetails: "Скрыть Детали"
    }
} as const;