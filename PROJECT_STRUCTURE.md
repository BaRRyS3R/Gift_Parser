# Полная структура и описание файлов Gift_Parser

## Корень проекта

- `.eslintrc.json` — настройки линтинга.
- `.eslintignore` — игнорируемые для линтинга файлы.
- `.gitattributes` — настройки git-атрибутов.
- `.gitignore` — игнорируемые git-файлы.
- `.npmrc` — настройки npm.
- `.prettierrc` — настройки форматирования.
- `README.md` — описание проекта.
- `database` — SQL-дамп или служебный файл БД.
- `middleware.ts` — глобальный middleware для API и JWT.
- `next-env.d.ts` — типы Next.js.
- `next.config.js` — конфиг Next.js.
- `package.json` — зависимости и скрипты.
- `postcss.config.js` — конфиг PostCSS.
- `tailwind.config.cjs` — конфиг TailwindCSS.
- `tournament database sql` — SQL-дамп турниров.
- `tsconfig.json` — конфиг TypeScript.

## /app

- `globals.css` — глобальные стили.
- `layout.tsx` — основной layout.
- `not-found.tsx` — страница 404.
- `page.tsx` — главная страница.
- `providers.tsx` — провайдеры контекстов.

### /app/api

- `/auth/login/route.ts` — эндпоинт логина.
- `/check-telegram-membership/route.ts` — проверка членства в Telegram.
- `/game/consume-attempt/route.ts` — списание попытки.
- `/game/save-result/route.ts` — сохранение результата игры.
- `/leagues/progress/route.ts` — прогресс по лигам.
- `/profile/achievements/route.ts` — достижения пользователя.
- `/profile/leagues/progress/route.ts` — прогресс пользователя в лигах.
- `/profile/leagues/route.ts` — лиги пользователя.
- `/profile/route.ts` — профиль пользователя.
- `/security/check-status/route.ts` — проверка статуса безопасности.
- `/security/generate-captcha/route.ts` — генерация капчи.
- `/security/update-trust-score/route.ts` — обновление trust score.
- `/security/validate-biometric/route.ts` — валидация биометрии.
- `/security/validate-captcha/route.ts` — валидация капчи.
- `/tournament/save-result/route.ts` — сохранение результата турнира.
- `/user/attempts-status/route.ts` — статус попыток пользователя.
- `/user/profile/route.ts` — профиль пользователя.

### /app/blocked

- `page.tsx` — страница блокировки.

### /app/game

- `page.tsx` — страница выбора режима.
- `/physics/page.tsx` — страница физического режима.
- `/reaction/page.tsx` — страница режима реакции.
- `/rotation/page.tsx` — страница режима вращения.
- `/survival/page.tsx` — страница режима выживания.

### /app/leaderboard

- `page.tsx` — страница лидерборда.

### /app/main

- `page.tsx` — главная страница.

### /app/profile

- `page.tsx` — страница профиля.

### /app/shop

- `page.tsx` — страница магазина.

### /app/tasks

- `page.tsx` — страница заданий.

### /app/tournament

- `page.tsx` — страница турниров.
- `/play/page.tsx` — страница игры в турнире.

## /components

- `/AboutModal/AboutModal.tsx` — модалка "О проекте".
- `/AboutModal/index.ts` — экспорт AboutModal.
- `AttemptsDisplay.tsx` — отображение попыток.
- `GameGrid.tsx` — игровая сетка.
- `/LeagueProgress/CompactLeagueDisplay.tsx` — компактный вид лиги.
- `/LeagueProgress/LeagueProgressModal.tsx` — модалка прогресса лиги.
- `/LeagueProgress/AchievementNotification.tsx` — уведомление о достижении.
- `/LeagueProgress/AchievementNotificationContainer.tsx` — контейнер уведомлений.
- `/LeagueProgress/index.ts` — экспорт LeagueProgress.
- `/LeagueProgress/LeagueNeighborsDisplay.tsx` — соседи по лиге.
- `/LeagueProgress/LeagueProgressDisplay.tsx` — прогресс по лиге.
- `/LeagueProgress/LeaguesModal.tsx` — модалка лиг.
- `/Navigation/AnimatedNavWrapper.tsx` — анимированная обертка навигации.
- `/Navigation/BottomNav.tsx` — нижняя навигация.
- `/Navigation/NavigationWrapper.tsx` — обертка навигации.
- `/Profile/AchievementsModal.tsx` — модалка достижений.
- `/Profile/EnhancedProfileHeader.tsx` — расширенный заголовок профиля.
- `/Profile/index.ts` — экспорт Profile.
- `/Profile/MinimalistActionButtons.tsx` — минималистичные кнопки.
- `/Profile/MinimalistDivider.tsx` — разделитель.
- `/Profile/MinimalistGameStats.tsx` — минималистичная статистика.
- `/Profile/MinimalistProfileHeader.tsx` — минималистичный заголовок.
- `/Profile/ReferralModal.tsx` — модалка рефералов.
- `RotatingCircleGrid.tsx` — анимация.
- `/Security/BiometricModal.tsx` — модалка биометрии.
- `/Security/CaptchaModal.tsx` — модалка капчи.
- `/Settings/index.ts` — экспорт настроек.
- `/Settings/Settings.tsx` — настройки пользователя.
- `/TournamentCard/index.ts` — экспорт карточки турнира.
- `/TournamentCard/TournamentCard.tsx` — карточка турнира.

## /contexts

- `LocalizationContext.tsx` — контекст локализации.
- `SettingsContext.tsx` — контекст настроек.

## /DATABASES

- `overall_leaderboard` — данные общего лидерборда.
- `purchases` — покупки пользователей.
- `purchases_summary` — сводка покупок.
- `reaction_leaderboard` — лидерборд реакции.
- `refund_analytics` — аналитика возвратов.
- `survival_leaderboard` — лидерборд выживания.
- `tasks` — задания.
- `tournaments` — турниры.
- `tournament_leaderboard` — лидерборд турниров.
- `users` — пользователи.
- `user_purchase_stats` — статистика покупок.
- `user_task_completition` — выполнение заданий.

## /game-modes

- `/physics/PhysicsGameCanvas.tsx` — канвас физического режима.
- `/physics/PhysicsGameLogic.ts` — логика физического режима.
- `/physics/PhysicsGameManager.tsx` — менеджер физического режима.
- `/reaction/ReactionGameLogic.ts` — логика реакции.
- `/reaction/ReactionGameManager.tsx` — менеджер реакции.
- `/rotation/RotationGameLogic.ts` — логика вращения.
- `/rotation/RotationGameManager.tsx` — менеджер вращения.
- `/survival/SurvivalGameLogic.ts` — логика выживания.
- `/survival/SurvivalGameManager.tsx` — менеджер выживания.
- `/tournament/index.ts` — экспорт логики турнира.
- `/tournament/TournamentGameLogic.ts` — логика турнира.
- `/tournament/TournamentGameManager.tsx` — менеджер турнира.

## /hooks

- `useUser.ts` — пользовательский хук.
- `useSecurity.ts` — хук безопасности.

## /lib

- `achievementService.ts` — сервис достижений.
- `authMiddleware.ts` — middleware аутентификации.
- `authService.ts` — сервис аутентификации.
- `jwt.ts` — работа с JWT.
- `league_service.ts` — сервис лиг.
- `profileService.ts` — сервис профиля.
- `purchaseService.ts` — сервис покупок.
- `supabase-server.ts` — серверный supabase.
- `supabase.ts` — supabase клиент.
- `supabase_tasks.ts` — supabase задачи.
- `supabase_tournament_extension.ts` — supabase турниры.

## /locales

- `index.ts` — экспорт локалей.
- `types.ts` — типы локализации.
- `/en/about.ts` — описание (en).
- `/en/achievements.ts` — достижения (en).
- `/en/game.ts` — игра (en).
- `/en/tournament.ts` — турнир (en).
- `/en/attempts.ts`, `/en/auth.ts`, `/en/common.ts`, `/en/errors.ts`, `/en/leaderboard.ts`, `/en/leagues.ts`, `/en/main.ts`, `/en/navigation.ts`, `/en/profile.ts`, `/en/save.ts`, `/en/shop.ts`, `/en/tasks.ts`, `/en/time.ts` — остальные разделы (en).
- `/ru/about.ts` — описание (ru).
- `/ru/achievements.ts` — достижения (ru).
- `/ru/game.ts` — игра (ru).
- `/ru/tournament.ts` — турнир (ru).
- `/ru/attempts.ts`, `/ru/auth.ts`, `/ru/common.ts`, `/ru/errors.ts`, `/ru/leaderboard.ts`, `/ru/leagues.ts`, `/ru/main.ts`, `/ru/navigation.ts`, `/ru/profile.ts`, `/ru/save.ts`, `/ru/shop.ts`, `/ru/tasks.ts`, `/ru/time.ts` — остальные разделы (ru).

## /public

- `/videos/intro.mp4` — вступительное видео.
- `/videos/mainbg.mp4` — фоновое видео.
- `/fonts/bpdots-diamond.otf` — шрифт.
- `/captions/empty-ru.vtt`, `/captions/empty.vtt` — пустые субтитры.
- `manifest.json` — PWA манифест.
- `sw.js` — сервис-воркер.

## /types

- `achievements.ts` — типы достижений.
- `/game-modes/common.ts` — общие типы игровых режимов.
- `/game-modes/index.ts` — экспорт типов игровых режимов.
- `/game-modes/physics.ts` — типы физического режима.
- `/game-modes/reaction.ts` — типы реакции.
- `/game-modes/rotation.ts` — типы вращения.
- `/game-modes/survival.ts` — типы выживания.
- `localization.ts` — типы локализации.
- `purchases.ts` — типы покупок.
- `tasks.ts` — типы заданий.
- `telegram.d.ts` — типы Telegram.
- `tournaments.ts` — типы турниров.

## /utils

- `leagueUtils.ts` — утилиты лиг.
- `timeFormatter.ts` — форматирование времени.

---

> Для подробного описания конкретного файла или папки — уточните запрос.
