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
}

export function useProgressData(): ProgressData {
    // In a real app, this hook would fetch data from an API (e.g., using SWR or React Query)
    // For now, it returns the static local data arrays to isolate data layer from UI layer.
    
    const userData = {
        full_name: "Vinoth Mathaiyan",
        readinessScore: 84,
        adherenceScore: 92,
        sessionsDone: 12,
        weeksActive: 3,
        riskStatus: 'green' as const,
        readinessHistory: [
            { week: "W1", score: 72 },
            { week: "W2", score: 78 },
            { week: "W3", score: 82 },
            { week: "W4", score: 84 },
            { week: "W5", score: 80 },
            { week: "W6", score: 86 }
        ],
    };

    const weightData = [
        { date: "Mar 10", weight: 76.0 },
        { date: "Mar 17", weight: 75.5 },
        { date: "Mar 24", weight: 75.2 },
        { date: "Mar 31", weight: 74.8 },
        { date: "Apr 07", weight: 74.3 },
        { date: "Apr 14", weight: 73.8 },
        { date: "Apr 21", weight: 73.5 },
        { date: "Today", weight: 73.2 },
    ];

    return { userData, weightData };
}
