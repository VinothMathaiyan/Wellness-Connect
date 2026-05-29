import { useState, useEffect } from 'react';
import { getClientProgress } from '../services/supabaseService';
import type { ClientProgressRow } from '../services/supabaseService';
import { todayISO, toISODate } from '@/utils/date';

export interface ProgressData {
    userData: {
        full_name: string;
        id?: string;
        readinessScore: number;
        readinessDelta: string | null; // e.g. "+6" or null when no prior-week data
        adherenceScore: number;
        adherenceDelta: string | null;
        sessionsDone: number;
        weeksActive: number;
        streak: number;
        progressBreakdown?: {
            mobility: number;
            sleepRecovery: number;
            sessionAttendance: number;
            habitCompletion: number;
        };
        riskStatus: 'green' | 'yellow' | 'red';
        riskReason?: string | null;
        riskLastChecked?: string;
        readinessHistory: { week: string; score: number }[];
        trainerName?: string;
    };

    isLoading: boolean;
    fetchError: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveRiskStatus(readiness: number): 'green' | 'yellow' | 'red' {
    if (readiness >= 70) return 'green';
    if (readiness >= 40) return 'yellow';
    return 'red';
}

/** Day abbreviation from a YYYY-MM-DD string */
function dayLabel(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en', { weekday: 'short' });
}

/** Today as YYYY-MM-DD */
function todayStr(): string {
    return todayISO();
}

/**
 * Compute the streak: count of consecutive days ending today where a log exists.
 * Rows must be sorted by log_date ASC.
 */
function computeStreak(rows: ClientProgressRow[]): number {
    if (rows.length === 0) return 0;

    const logDates = new Set(rows.map(r => r.log_date));
    const today = new Date(todayStr());
    let streak = 0;
    const cursor = new Date(today);

    while (true) {
        const key = toISODate(cursor);
        if (logDates.has(key)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

/**
 * Compute a signed delta string ("+6", "-3") between current-week and
 * prior-week average readiness. Returns null when the prior-week window
 * has zero entries.
 */
function computeWeeklyDelta(
    rows: ClientProgressRow[],
    field: 'readiness_score',
): string | null {
    const today = new Date(todayStr());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const currentWeek: number[] = [];
    const priorWeek: number[] = [];

    for (const r of rows) {
        const d = new Date(r.log_date);
        const val = r[field];
        if (val == null) continue;

        if (d >= sevenDaysAgo && d <= today) {
            currentWeek.push(val);
        } else if (d >= fourteenDaysAgo && d < sevenDaysAgo) {
            priorWeek.push(val);
        }
    }

    if (priorWeek.length === 0) return null;
    if (currentWeek.length === 0) return null;

    const avgCurrent = Math.round(currentWeek.reduce((a, b) => a + b, 0) / currentWeek.length);
    const avgPrior = Math.round(priorWeek.reduce((a, b) => a + b, 0) / priorWeek.length);
    const diff = avgCurrent - avgPrior;

    if (diff >= 0) return `+${diff}`;
    return `${diff}`;
}

// ─── Static fallbacks (shown while loading or when no data exists) ─────────────

const EMPTY_USER_DATA: ProgressData['userData'] = {
    full_name: '',
    readinessScore: 0,
    readinessDelta: null,
    adherenceScore: 0,
    adherenceDelta: null,
    sessionsDone: 0,
    weeksActive: 0,
    streak: 0,
    riskStatus: 'green',
    readinessHistory: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressData(userId: string | null): ProgressData {
    const [rows, setRows]               = useState<ClientProgressRow[]>([]);
    const [isLoading, setIsLoading]     = useState(true);
    const [fetchError, setFetchError]   = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setFetchError(null);

        getClientProgress(userId, 30)
            .then(result => {
                if (result.error) {
                    setFetchError(result.error);
                } else {
                    setRows(result.data);
                }
            })
            .catch(err => {
                console.error('useProgressData:', err);
                setFetchError(err instanceof Error ? err.message : 'Unknown error');
            })
            .finally(() => setIsLoading(false));
    }, [userId]);

    // ── Derive real values from fetched rows ────────────────────────────────

    const scores = rows
        .map(r => r.readiness_score)
        .filter((s): s is number => typeof s === 'number');

    const latestReadiness = scores.length > 0 ? scores[scores.length - 1] : 0;

    // Readiness delta (current week avg vs prior week avg)
    const readinessDelta = computeWeeklyDelta(rows, 'readiness_score');

    // Readiness history — show last 7 entries as individual day bars
    const recentRows = rows.slice(-7);
    const readinessHistory: { week: string; score: number }[] = recentRows.map(row => ({
        week: dayLabel(row.log_date),
        score: row.readiness_score ?? 0,
    }));

    // Adherence: % of logged days where workout_done === true
    const workoutDays = rows.filter(r => r.workout_done).length;
    const adherenceScore = rows.length > 0 ? Math.round((workoutDays / rows.length) * 100) : 0;

    // Sessions done = total workouts completed in the window
    const sessionsDone = workoutDays;

    // Streak: consecutive days ending today with a log
    const streak = computeStreak(rows);

    // Weeks active = number of distinct ISO weeks with at least one log
    const weekSet = new Set(rows.map(r => {
        const d = new Date(r.log_date);
        // ISO week number calculation
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000) + 1;
        return `${d.getFullYear()}-W${Math.ceil(dayOfYear / 7)}`;
    }));
    const weeksActive = weekSet.size;

    const userData: ProgressData['userData'] = {
        ...EMPTY_USER_DATA,
        readinessScore: latestReadiness,
        readinessDelta,
        adherenceScore,
        adherenceDelta: null, // no separate adherence history to compare against yet
        sessionsDone,
        weeksActive,
        streak,
        riskStatus: deriveRiskStatus(latestReadiness),
        readinessHistory,
    };

    return {
        userData,
        isLoading,
        fetchError,
    };
}
