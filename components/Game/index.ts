// src/components/Game/index.ts

// Game Engine & Logic
export { default as useGameLogic } from './GameLogic/useGameLogic'
export { default as useGameEngine } from './GameEngine/useGameEngine'
export { default as useScoreSystem } from './ScoreSystem/useScoreSystem'
export { default as useGameControls } from './GameControls/useGameControls'
export { default as useGameTimers } from './GameTimers/useGameTimers'
export { default as useGameSave } from './GameSave/useGameSave'

// Game Components
export { default as GameManager } from './GameManager'
export { default as StandardGameHUD } from './GameHUD/StandardGameHUD'
export { default as PrecisionGameHUD } from './GameHUD/PrecisionGameHUD'
export { default as GameContainer } from './GameContainer/GameContainer'

// Difficulty Selector
export { default as DifficultySelector } from './DifficultySelector/DifficultySelector'
export { default as DifficultyCard } from './DifficultySelector/DifficultyCard'
export { default as DifficultyHeader } from './DifficultySelector/DifficultyHeader'

// Utils
export { triggerHapticFeedback } from './utils/hapticFeedback'

// Legacy exports (for backwards compatibility)
export { default as GameGrid } from '../GameGrid'
export { default as GameResults } from '../GameResults'
export { default as GameTimer } from '../GameTimer'