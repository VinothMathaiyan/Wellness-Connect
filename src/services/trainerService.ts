import type { TrainingProgram } from '../types';

export const fetchTrainingProgram = async (_clientId: string): Promise<TrainingProgram> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                program_id: 'prog-1',
                program_name: 'Core Strength & Flexibility',
                duration_weeks: 12,
                sessions_per_week: 3,
                goals: ['Improve Flexibility', 'Build Core Strength', 'Increase Energy'],
                trainer: {
                    full_name: 'Priya Sharma',
                    photo_url: 'https://via.placeholder.com/150',
                    specialisations: ['Yoga', 'Ayurveda']
                }
            });
        }, 800);
    });
};

export const submitProgramApproval = async (_programId: string, _status: string, _notes?: string): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 800));
};
