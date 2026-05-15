import type { UserProfile, DailyLog, TrainerAction } from '../types/wellness';

// 1. Mock User Profile
export const mockUser: UserProfile = {
    id: 'user-123',
    fullName: 'Vinoth Mathaiyan',
    email: 'vinoth@example.com',
    targetWaterMl: 3000,
    targetSleepHours: 8,
    joinedDate: '2026-01-15',
};

// 2. Mock 7-Day History (For your Weekly Report Screen)
export const mockWeeklyLogs: DailyLog[] = [
    {
        id: 'log-1',
        userId: 'user-123',
        date: '2026-05-03',
        mood: 7,
        sleepHours: 6.5,
        energyLevel: 6,
        waterIntakeMl: 1800,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-2',
        userId: 'user-123',
        date: '2026-05-04',
        mood: 5,
        sleepHours: 5.0,
        energyLevel: 4,
        waterIntakeMl: 1200,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-3',
        userId: 'user-123',
        date: '2026-05-05',
        mood: 8,
        sleepHours: 8.5,
        energyLevel: 9,
        waterIntakeMl: 2500,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-4',
        userId: 'user-123',
        date: '2026-05-06',
        mood: 6,
        sleepHours: 7.0,
        energyLevel: 7,
        waterIntakeMl: 2100,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-5',
        userId: 'user-123',
        date: '2026-05-07',
        mood: 9,
        sleepHours: 8.0,
        energyLevel: 8,
        waterIntakeMl: 3000,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-6',
        userId: 'user-123',
        date: '2026-05-08',
        mood: 4,
        sleepHours: 4.5,
        energyLevel: 3,
        waterIntakeMl: 900,
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'log-7',
        userId: 'user-123', // Today
        date: '2026-05-09',
        mood: 7,
        sleepHours: 7.5,
        energyLevel: 7,
        waterIntakeMl: 2400,
        updatedAt: new Date().toISOString(),
    }
];

// 3. Mock Trainer Actions
export const mockTrainerActions: TrainerAction[] = [
    {
        id: 'act-1',
        clientId: 'user-123',
        trainerId: 'trainer-99',
        message: "I noticed your sleep dropped yesterday. Try a 10-minute wind-down routine tonight.",
        priority: 'medium',
        isRead: false,
        createdAt: '2026-05-08T18:00:00Z',
    }
];