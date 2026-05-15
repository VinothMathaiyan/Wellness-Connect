/**
 * Wellness Connect - Global Type Definitions
 * Matches the 4-screen tracking layout (Mood, Sleep, Energy, Water)
 */

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    targetWaterMl: number; // Goal for water intake
    targetSleepHours: number; // Goal for sleep
    joinedDate: string;
}

export interface DailyLog {
    id: string;
    userId: string;
    date: string; // ISO format: YYYY-MM-DD

    // Tracking Metrics
    mood: number;         // 1-10 scale
    sleepHours: number;   // Total hours
    energyLevel: number;  // 1-10 scale
    waterIntakeMl: number; // Amount in milliliters

    notes?: string;
    updatedAt: string;
}

export interface Assessment {
    id: string;
    userId: string;
    category: 'Mental' | 'Physical' | 'Lifestyle';
    score: number;
    results: Record<string, any>; // Flexible JSON for varied questions
    takenAt: string;
}

export interface TrainerAction {
    id: string;
    clientId: string;
    trainerId: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    isRead: boolean;
    createdAt: string;
}