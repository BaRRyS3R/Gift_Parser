
// src/app/api/profile/leagues/route.ts - Protected leagues endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';
import leagueService from '@/lib/league_service';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        const userData = await userService.findByTelegramId(user.telegramId);
        if (!userData) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Get comprehensive league data
        const [
            allLeagues,
            userLeagueProgress,
            userRewards,
            allLeagueRewards,
            leagueNeighbors
        ] = await Promise.all([
            leagueService.getAllLeagues(),
            leagueService.getUserLeagueProgress(userData.id, userData.total_games),
            leagueService.getUserRewards(userData.id),
            leagueService.getAllLeagueRewards(),
            leagueService.getLeagueNeighbors(userData.id, userData.total_games)
        ]);

        // Get leaderboards for all leagues
        const leaderboardPromises = allLeagues.map(async (league) => {
            const leaderboard = await leagueService.getLeagueLeaderboard(
                league.id,
                userData.id
            );
            return { leagueId: league.id, leaderboard };
        });

        const leaderboardResults = await Promise.all(leaderboardPromises);
        const leaderboards: Record<number, any> = {};

        leaderboardResults.forEach(({ leagueId, leaderboard }) => {
            if (leaderboard) {
                leaderboards[leagueId] = leaderboard;
            }
        });

        return NextResponse.json({
            success: true,
            leagueData: {
                allLeagues,
                userLeagueProgress,
                userRewards,
                allLeagueRewards,
                leagueNeighbors,
                leaderboards
            },
        });
    } catch (error) {
        console.error('Error fetching league data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch league data' },
            { status: 500 }
        );
    }
});