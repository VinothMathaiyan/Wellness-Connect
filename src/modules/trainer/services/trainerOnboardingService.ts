import { supabase } from '../../../lib/supabaseClient';
import type { TrainerOnboardingData } from '../types/trainerOnboarding.types';

export const saveTrainerOnboarding = async (
  userId: string,
  data: TrainerOnboardingData
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        city: data.city ?? '',
        specialties: data.specialisations ?? [],
        certifications: data.certificationName
          ? [data.certificationName]
          : [],
        photo_url: data.photoUrl ?? null,
      })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to save trainer profile';
    console.error('saveTrainerOnboarding:', message);
    return { error: message };
  }
};

export const getTrainerProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getTrainerProfile:', error);
    return null;
  }
  return data;
};
