// src/locales/ru/main.ts - Main page elements
export const main = {
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

  // Season Modal
  seasonModal: {
    title: "ИНФОРМАЦИЯ О СЕЗОНЕ",
    loading: "ЗАГРУЖАЕТСЯ...",
    error: "ОШИБКА",
    noActiveSeason: "НЕТ АКТИВНОГО СЕЗОНА",
    noActiveSeasonDesc: "В настоящее время активный сезон не проводится. Следите за обновлениями о предстоящих сезонных соревнованиях.",
    dates: "ДАТЫ ПРОВЕДЕНИЯ",
    prizes: "ПРИЗЫ",
    snapshotInfo: "По окончании сезона будет сделан финальный снепшот таблицы лидеров. Изменения после этого момента не учитываются.",
    fairPlayInfo: "При подозрении в нечестной игре мы можем провести дополнительную проверку пользователя перед выдачей приза.",
    viewDetails: "ПОДРОБНЕЕ",
    upcomingSeason: "СКОРО",
    activeSeason: "АКТИВЕН",
    endedSeason: "ЗАВЕРШЕН",
  },
} as const;