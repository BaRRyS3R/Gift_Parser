// src/app/api/tournament/all/route.ts - Get all tournaments
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

interface TournamentWithStatus {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    prizes: string[];
    created_at: string;
    updated_at: string;
    sponsor_name?: string;
    sponsor_channel_url?: string;
    sponsor_image_url?: string;
    status: 'upcoming' | 'active' | 'completed';
    participants_count?: number;
    time_until_start?: number;
    time_until_end?: number;
}

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        const telegramId = request.headers.get('x-telegram-id');

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required',
                },
                { status: 401 }
            );
        }

        // Get all tournaments with sponsor fields
        const { data: allTournaments, error } = await supabaseServer
            .from('tournaments')
            .select(`
                id,
                name,
                start_date,
                end_date,
                prizes,
                created_at,
                updated_at,
                sponsor_name,
                sponsor_channel_url,
                sponsor_image_url
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tournaments:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to fetch tournaments',
                },
                { status: 500 }
            );
        }

        const now = new Date();
        const categorized = {
            active: [] as TournamentWithStatus[],
            upcoming: [] as TournamentWithStatus[],
            completed: [] as TournamentWithStatus[],
        };

        // Categorize tournaments by status
        for (const tournament of allTournaments || []) {
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);

            let status: 'upcoming' | 'active' | 'completed';
            let timeUntilStart: number | undefined;
            let timeUntilEnd: number | undefined;

            if (now < startDate) {
                status = 'upcoming';
                timeUntilStart = startDate.getTime() - now.getTime();
            } else if (now >= startDate && now < endDate) {
                status = 'active';
                timeUntilEnd = endDate.getTime() - now.getTime();
            } else {
                status = 'completed';
            }

            const tournamentWithStatus: TournamentWithStatus = {
                ...tournament,
                status,
                time_until_start: timeUntilStart,
                time_until_end: timeUntilEnd,
            };

            // For completed tournaments, get participant count
            if (status === 'completed') {
                try {
                    const { data: leaderboard } = await supabaseServer.rpc(
                        'get_tournament_leaderboard_accumulative',
                        {
                            tournament_id_param: tournament.id,
                            limit_param: 1000,
                        }
                    );

                    tournamentWithStatus.participants_count = leaderboard?.length || 0;
                } catch (error) {
                    console.error(`Error getting participants count for tournament ${tournament.id}:`, error);
                    tournamentWithStatus.participants_count = 0;
                }
            }

            categorized[status].push(tournamentWithStatus);
        }

        // Sort tournaments
        categorized.active.sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        categorized.upcoming.sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        categorized.completed.sort(
            (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        );

        return NextResponse.json({
            success: true,
            tournaments: categorized,
        });

    } catch (error) {
        console.error('All tournaments API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get tournaments',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}

