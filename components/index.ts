// src/components/index.ts - ОБНОВЛЕННЫЙ общий экспорт

// Profile components
export * from './Profile'

// Leaderboard components  
export * from './Leaderboard'

// Game components (новые)
export * from './Game'

// Legacy game components (существующие)
export { default as GameGrid } from './GameGrid'
export { default as GameResults } from './GameResults'
export { default as GameTimer } from './GameTimer'

// Navigation components
export { default as BottomNav } from './Navigation/BottomNav'
export { default as NavigationWrapper } from './Navigation/NavigationWrapper'