// src/locales/ru/tournaments.ts - Tournament localization (Russian) - ОБНОВЛЕННАЯ ВЕРСИЯ
export const tournaments = {
  title: "TOURNAMENTS",
  subtitle: "Соревнования",

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
    noActiveTournament: "НЕТ АКТИВНОГО ТУРНИРА",
    noUpcomingTournaments: "Нет предстоящих турниров",
    noCompletedTournaments: "Нет завершённых турниров",
  },

  // Tournament details
  details: {
    mode: "РЕЖИМ",
    duration: "Длительность",
    participants: "Участников",
    timeLeft: "ОСТАЛОСЬ",
    startsIn: "Начнётся через",
    endedOn: "Завершился",
    prizes: "ПРИЗЫ",
    joinTournament: "УЧАСТВОВАТЬ",
    viewLeaderboard: "ЛИДЕРБОРД",
    tournamentEnded: "ЗАВЕРШЁН",
  },

  // Game modes for tournaments
  modes: {
    survival: "ВЫЖИВАНИЕ",
    physics: "ФИЗИКА",
    rotation: "ВРАЩЕНИЕ",
  },

  // Leaderboard
  leaderboard: {
    title: "ЛИДЕРБОРД",
    position: "Место",
    player: "Игрок",
    score: "Счёт",
    games: "ИГР",
    time: "Время",
    level: "Уровень",
    streak: "Серия",
    hits: "Попаданий",
    mistakes: "Ошибок",
    yourPosition: "ВАША ПОЗИЦИЯ",
    notParticipating: "Вы не участвуете в турнире",
    participateFirst: "Сыграйте в режим {mode} чтобы попасть в турнир",
    loadingLeaderboard: "Загрузка лидерборда...",
    errorLoadingLeaderboard: "Ошибка загрузки лидерборда",
    retryLoading: "Повторить",
    topPlayers: "ТОП",
    viewFullLeaderboard: "Полный лидерборд",
    backToTournaments: "К турнирам",
    updateInfo: "Лидерборд обновляется каждые 5 минут",
    noParticipants: "УЧАСТНИКОВ ПОКА НЕТ",
  },

  // Tournament participation
  participation: {
    howToParticipate: "Еженедельные турниры с призами",
    playGames: "Играйте в режим {mode} во время турнира",
    bestScore: "Ваш лучший счёт засчитывается в турнире",
    multipleGames: "Играйте сколько хотите - засчитывается лучший результат",
    timeLimit: "Игры засчитываются только во время турнира",
    goodLuck: "Удачи в соревновании!",
    playFirst: "УЧАСТВУЙ В ТУРНИРЕ",
    joinCompetition: "Присоединитесь к соревнованию",
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
    loadingTournaments: "ЗАГРУЗКА ТУРНИРОВ...",
    loadingTournament: "Загрузка турнира...",
  },

  // Prize positions
  prizes: {
    first: "1-Е МЕСТО",
    second: "2-Е МЕСТО",
    third: "3-Е МЕСТО",
    position: "{position}-Е МЕСТО",
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
    noTournaments: "ТУРНИРЫ СЕЙЧАС ОТКЛЮЧЕНЫ",
    checkBackLater: "ЗАХОДИТЕ СКОРО ЗА НОВЫМИ СОРЕВНОВАНИЯМИ",
    firstTournament: "Предстоящие возможности",
  },

  // Additional missing keys found in components
  stats: {
    startDate: "Дата начала",
    endDate: "Дата окончания",
    status: "Статус",
  },
} as const;