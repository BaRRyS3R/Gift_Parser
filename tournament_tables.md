### 🏆 `tournament_leaderboard`

| Поле               | Тип                      | NOT NULL | Значение по умолчанию         |
|--------------------|---------------------------|----------|-------------------------------|
| `id`               | `uuid`                   | ✅        | `gen_random_uuid()`           |
| `tournament_id`    | `uuid`                   | ✅        | —                             |
| `user_id`          | `uuid`                   | ✅        | —                             |
| `telegram_id`      | `bigint`                 | ✅        | —                             |
| `survival_time`    | `bigint`                 | ✅        | —                             |
| `survival_score`   | `integer`                | ✅        | —                             |
| `max_level_reached`| `integer`                | ✅        | —                             |
| `perfect_streak`   | `integer`                | ✅        | —                             |
| `correct_hits`     | `integer`                | ✅        | —                             |
| `death_cause`      | `text`                   | ✅        | —                             |
| `created_at`       | `timestamp with tz`      | ❌        | `now()`                       |
| `games_played`     | `integer`                | ❌        | `1`                           |
| `updated_at`       | `timestamp with tz`      | ❌        | `now()`                       |
| `last_game_score`  | `integer`                | ❌        | `0`                           |

---

### 🗕️ `tournaments`

| Поле                 | Тип                      | NOT NULL | Значение по умолчанию         |
|----------------------|---------------------------|----------|-------------------------------|
| `id`                 | `uuid`                   | ✅        | `gen_random_uuid()`           |
| `name`               | `text`                   | ✅        | —                             |
| `start_date`         | `timestamp with tz`      | ✅        | —                             |
| `end_date`           | `timestamp with tz`      | ✅        | —                             |
| `prizes`             | `text[]`                 | ✅        | `'{}'::text[]`                |
| `created_at`         | `timestamp with tz`      | ❌        | `now()`                       |
| `updated_at`         | `timestamp with tz`      | ❌        | `now()`                       |
| `sponsor_name`       | `text`                   | ❌        | —                             |
| `sponsor_channel_url`| `text`                   | ❌        | —                             |
| `sponsor_image_url`  | `text`                   | ❌        | —                             |

Functions:
get_active_tournament

    SELECT 
        t.id,
        t.name,
        t.start_date,
        t.end_date,
        t.prizes,
        t.created_at,
        t.updated_at
    FROM tournaments t
    WHERE t.start_date <= NOW() 
      AND t.end_date > NOW()
    ORDER BY t.start_date DESC
    LIMIT 1;

get_tournament_leaderboard

    SELECT 
        tl.id,
        tl.tournament_id,
        tl.user_id,
        tl.telegram_id,
        u.first_name,
        u.last_name,
        u.username,
        u.is_premium,
        tl.survival_time,
        tl.survival_score,
        tl.max_level_reached,
        tl.perfect_streak,
        tl.correct_hits,
        tl.death_cause,
        tl.created_at,
        ROW_NUMBER() OVER (ORDER BY tl.survival_time DESC) AS rank
    FROM tournament_leaderboard tl
    JOIN users u ON tl.user_id = u.id
    WHERE tl.tournament_id = tournament_id_param
    ORDER BY tl.survival_time DESC
    LIMIT limit_param;

get_tournament_leaderboard_accumulative

BEGIN
    RETURN QUERY
    SELECT 
        tl.id,
        tl.tournament_id,
        tl.user_id,
        tl.telegram_id,
        u.first_name,
        u.last_name,
        u.username,
        u.is_premium,
        tl.survival_time,
        tl.survival_score,
        COALESCE(tl.last_game_score, 0) as last_game_score,
        tl.max_level_reached,
        tl.perfect_streak,
        tl.correct_hits,
        tl.death_cause,
        COALESCE(tl.games_played, 1) as games_played,
        tl.created_at,
        ROW_NUMBER() OVER (
            ORDER BY tl.survival_score DESC, 
                     tl.survival_time DESC, 
                     tl.created_at ASC
        )::INTEGER as rank
    FROM tournament_leaderboard tl
    INNER JOIN users u ON tl.user_id = u.id
    WHERE tl.tournament_id = tournament_id_param
    ORDER BY tl.survival_score DESC, 
             tl.survival_time DESC, 
             tl.created_at ASC
    LIMIT limit_param;
END;

get_user_tournament_result

    WITH user_result AS (
        SELECT 
            tl.id,
            tl.tournament_id,
            tl.user_id,
            tl.survival_time,
            tl.survival_score,
            tl.max_level_reached,
            tl.perfect_streak,
            tl.correct_hits,
            tl.death_cause,
            tl.created_at
        FROM tournament_leaderboard tl
        WHERE tl.tournament_id = tournament_id_param 
          AND tl.user_id = user_id_param
    ),
    ranked_results AS (
        SELECT 
            tl.*,
            ROW_NUMBER() OVER (ORDER BY tl.survival_time DESC) AS rank
        FROM tournament_leaderboard tl
        WHERE tl.tournament_id = tournament_id_param
    )
    SELECT 
        ur.id,
        ur.tournament_id,
        ur.user_id,
        ur.survival_time,
        ur.survival_score,
        ur.max_level_reached,
        ur.perfect_streak,
        ur.correct_hits,
        ur.death_cause,
        ur.created_at,
        rr.rank
    FROM user_result ur
    JOIN ranked_results rr ON ur.id = rr.id;

save_tournament_result

DECLARE
    result_id UUID;
    existing_time BIGINT;
BEGIN
    -- Check if user already has a result for this tournament
    SELECT survival_time INTO existing_time
    FROM tournament_leaderboard
    WHERE tournament_id = tournament_id_param AND user_id = user_id_param;
    
    -- Only insert/update if this is a better result (longer survival time)
    IF existing_time IS NULL OR survival_time_param > existing_time THEN
        INSERT INTO tournament_leaderboard (
            tournament_id,
            user_id,
            telegram_id,
            survival_time,
            survival_score,
            max_level_reached,
            perfect_streak,
            correct_hits,
            death_cause
        ) VALUES (
            tournament_id_param,
            user_id_param,
            telegram_id_param,
            survival_time_param,
            survival_score_param,
            max_level_reached_param,
            perfect_streak_param,
            correct_hits_param,
            death_cause_param
        )
        ON CONFLICT (tournament_id, user_id) 
        DO UPDATE SET
            survival_time = survival_time_param,
            survival_score = survival_score_param,
            max_level_reached = max_level_reached_param,
            perfect_streak = perfect_streak_param,
            correct_hits = correct_hits_param,
            death_cause = death_cause_param,
            created_at = NOW()
        RETURNING id INTO result_id;
    ELSE
        -- Return existing ID if no update was made
        SELECT id INTO result_id
        FROM tournament_leaderboard
        WHERE tournament_id = tournament_id_param AND user_id = user_id_param;
    END IF;
    
    RETURN result_id;
END;

save_tournament_result_accumulative

DECLARE
    result_id UUID;
    current_data RECORD;
    new_total_score INTEGER;
    new_total_hits INTEGER;
    new_games_count INTEGER;
BEGIN
    -- Получение существующих данных пользователя в турнире
    SELECT 
        id, 
        survival_score, 
        correct_hits, 
        games_played,
        survival_time,
        max_level_reached,
        perfect_streak
    INTO current_data
    FROM tournament_leaderboard
    WHERE tournament_id = tournament_id_param 
    AND user_id = user_id_param;

    IF current_data.id IS NOT NULL THEN
        -- Вычисление новых накопленных значений
        new_total_score := COALESCE(current_data.survival_score, 0) + survival_score_param;
        new_total_hits := COALESCE(current_data.correct_hits, 0) + correct_hits_param;
        new_games_count := COALESCE(current_data.games_played, 0) + 1;

        -- Обновление существующей записи с накоплением очков
        UPDATE tournament_leaderboard
        SET 
            survival_score = new_total_score,
            last_game_score = survival_score_param,
            survival_time = GREATEST(COALESCE(current_data.survival_time, 0), survival_time_param),
            max_level_reached = GREATEST(COALESCE(current_data.max_level_reached, 0), max_level_reached_param),
            perfect_streak = GREATEST(COALESCE(current_data.perfect_streak, 0), perfect_streak_param),
            correct_hits = new_total_hits,
            death_cause = death_cause_param,
            games_played = new_games_count,
            updated_at = NOW()
        WHERE id = current_data.id;
        
        result_id := current_data.id;
        
        RAISE NOTICE 'Points accumulated for user %. Previous total: %, Game score: %, New total: %, Games: %', 
            user_id_param, 
            COALESCE(current_data.survival_score, 0), 
            survival_score_param, 
            new_total_score,
            new_games_count;
            
    ELSE
        -- Создание новой записи для первого участия в турнире
        INSERT INTO tournament_leaderboard (
            tournament_id,
            user_id,
            telegram_id,
            survival_time,
            survival_score,
            last_game_score,
            max_level_reached,
            perfect_streak,
            correct_hits,
            death_cause,
            games_played,
            created_at,
            updated_at
        ) VALUES (
            tournament_id_param,
            user_id_param,
            telegram_id_param,
            survival_time_param,
            survival_score_param,
            survival_score_param,
            max_level_reached_param,
            perfect_streak_param,
            correct_hits_param,
            death_cause_param,
            1,
            NOW(),
            NOW()
        )
        RETURNING id INTO result_id;
        
        new_total_score := survival_score_param;
        new_games_count := 1;
        
        RAISE NOTICE 'Created tournament entry for user % with initial score: %', 
            user_id_param, survival_score_param;
    END IF;

    -- Возврат детальной информации о накоплении очков
    RETURN json_build_object(
        'result_id', result_id,
        'total_score', new_total_score,
        'game_score', survival_score_param,
        'games_played', new_games_count,
        'previous_total', COALESCE(current_data.survival_score, 0)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error saving accumulative tournament result: %', SQLERRM;
END;

IDX:
idx_tournament_leaderboard_last_game

idx_tournament_leaderboard_score_ranking

idx_tournament_leaderboard_tournament_time

idx_tournament_leaderboard_tournament_user

idx_tournament_leaderboard_user

idx_tournaments_active

idx_tournaments_with_sponsor

