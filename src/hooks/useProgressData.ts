import { useState, useEffect } from 'react';
import { getWeeklyLogs } from '../services/supabaseService';
import type { DailyLog } from '../types';

export interface ProgressData {
    userData: {
        full_name: string;
        id?: string;
        readinessScore: number;
        adherenceScore: number;
        sessionsDone: number;
        weeksActive: number;
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
    weightData: { date: string; weight: number }[];
    isLoading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function deriveRiskStatus(readiness: number): 'green' | 'yellow' | 'red' {
    if (readiness >= 70) return 'green';
    if (readiness >= 40) return 'yellow';
    return 'red';
}

/** Day abbreviation from a YYYY-MM-DD string */
function dayLabel(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en', { weekday: 'short' });
}

// ─── Static fallbacks (shown while loading or when no data exists) ─────────────

const MOCK_WEIGHT_DATA = [
    { date: 'Mar 10', weight: 76.0 },
    { date: 'Mar 17', weight: 75.5 },
    { date: 'Mar 24', weight: 75.2 },
    { date: 'Mar 31', weight: 74.8 },
    { date: 'Apr 07', weight: 74.3 },
    { date: 'Apr 14', weight: 73.8 },
    { date: 'Apr 21', weight: 73.5 },
    { date: 'Today',  weight: 73.2 },
];

const MOCK_USER_DATA: ProgressData['userData'] = {
    full_name: '',
    readinessScore: 0,
    adherenceScore: 92,   // mock — no adherence table yet
    sessionsDone: 0,
    weeksActive: 0,
    riskStatus: 'green',
    readinessHistory: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressData(userId: string | null): ProgressData {
    const [weeklyLogs, setWeeklyLogs]   = useState<DailyLog[]>([]);
    const [isLoading, setIsLoading]     = useState(true);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        getWeeklyLogs(userId)
            .then(setWeeklyLogs)
            .catch(err => console.error('useProgressData:', err))
            .finally(() => setIsLoading(false));
    }, [userId]);

    // ── Derive real values from fetched logs ────────────────────────────────

    const scores = weeklyLogs
        .map(l => l.readiness_score)
        .filter((s): s is number => typeof s === 'number');

    const latestReadiness = scores.length > 0 ? scores[scores.length - 1] : 0;

    // Build readiness history from daily logs (last 7 days as individual bars)
    const readinessHistory: { week: string; score: number }[] = weeklyLogs.map(log => ({
        week: dayLabel(log.log_date),
        score: log.readiness_score ?? 0,
    }));

    const userData: ProgressData['userData'] = {
        ...MOCK_USER_DATA,
        readinessScore: latestReadiness,
        riskStatus: deriveRiskStatus(latestReadiness),
        readinessHistory: readinessHistory.length > 0 ? readinessHistory : MOCK_USER_DATA.readinessHistory,
        // adherenceScore / sessionsDone / weeksActive stay as mock until workout_logs is wired
        adherenceScore: 92,
        sessionsDone: 0,
        weeksActive: Math.ceil(weeklyLogs.length / 7),
    };

    return {
        userData,
        weightData: MOCK_WEIGHT_DATA, // no weight tracking table yet
        isLoading,
    };
}
