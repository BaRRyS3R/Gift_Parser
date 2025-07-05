// src/locales/ru/index.ts - Russian translations assembly (обновлено с about)

import { common } from './common';
import { navigation } from './navigation';
import { auth } from './auth';
import { main } from './main';
import { game } from './game';
import { attempts } from './attempts';
import { tasks } from './tasks';
import { tournament } from './tournament';
import { profile } from './profile';
import { leaderboard } from './leaderboard';
import { shop } from './shop';
import { save } from './save';
import { errors } from './errors';
import { time } from './time';
import { about } from './about';

export const ru = {
    // Common UI elements
    common,

    // Navigation
    nav: navigation,

    // Tasks
    tasks,

    // Main page
    main,

    // Auth/Registration
    auth,

    // Game modes
    game,

    // Tournament system
    tournament,

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
} as const;