// src/locales/en/index.ts - English translations assembly

import { common } from "./common";
import { navigation } from "./navigation";
import { auth } from "./auth";
import { main } from "./main";
import { game } from "./game";
import { attempts } from "./attempts";
import { tasks } from "./tasks";
import { profile } from "./profile";
import { leaderboard } from "./leaderboard";
import { shop } from "./shop";
import { save } from "./save";
import { errors } from "./errors";
import { time } from "./time";
import { about } from "./about";
import { leagues } from "./leagues";
import { nebula } from "./nebula";
import { seasons } from "./seasons";
import { levels } from "./levels";
import { memes } from "./memes";
import { tournaments } from "./tournaments";
import { debug } from "./debug";

export const en = {

  debug,
  // Common UI elements
  common,

  // Levels
  levels,

  // Tournaments
  tournaments,

  // Memes
  memes,

  // Navigation
  nav: navigation,

  // Tasks
  tasks,

  // Nebula
  nebula,

  // Main page
  main,

  // Seasons
  seasons,

  // Auth/Registration
  auth,

  // Game modes
  game,

  // Attempts system
  attempts,

  // Profile page
  profile,

  // Leaderboard
  leaderboard,

  // Shop
  shop,

  // Save status messages
  save,

  // Error messages
  errors,

  // Time formatting
  time,

  // About modal
  about,

  // Leagues
  leagues,
} as const;
