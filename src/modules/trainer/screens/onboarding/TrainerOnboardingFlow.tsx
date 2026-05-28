import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useTrainerOnboarding,
  TOTAL_STEPS,
} from '../../hooks/useTrainerOnboarding';
import { useWellness } from '../../../../context/WellnessContext';
import { isTrainerOnboardingComplete } from '../../../../services/supabaseService';
import TrainerProfileStep from './TrainerProfileStep';
import TrainerExpertiseStep from './TrainerExpertiseStep';
import TrainerAvailabilityStep from './TrainerAvailabilityStep';
// Re-export types so existing step-file imports stay unchanged
export type {
  AvailabilitySlot,
  UploadedFile,
  TrainerOnboardingData,
  StepProps,
} from '../../hooks/useTrainerOnboarding';

export default function TrainerOnboardingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  // "Edit Profile" (from ProfileMenu) passes this intent so a returning trainer
  // can re-open their onboarding form instead of being bounced to the dashboard.
  const isEditMode = location.state?.mode === 'edit';
  const { userId } = useWellness();
  const { step, data, updateData, nextStep, prevStep } = useTrainerOnboarding();

  // Guard: redirect completed trainers who navigate directly to /trainer/onboarding.
  // Skipped in edit mode so Edit Profile can reach the form.
  useEffect(() => {
    if (!userId || isEditMode) return;
    isTrainerOnboardingComplete(userId).then(complete => {
      if (complete) navigate('/trainer/dashboard', { replace: true });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const goBack = () => {
    if (step > 1) prevStep();
    else navigate(-1);
  };

  const stepProps = {
    data,
    updateData,
    onBack: goBack,
    currentStep: step,
    totalSteps: TOTAL_STEPS,
    onNext:
      step < TOTAL_STEPS
        ? nextStep
        : () =>
            navigate('/trainer/setup-complete', {
              state: {
                certificationName: data.certificationName,
                availabilitySlots: data.availabilitySlots,
                specialisations: data.specialisations,
                photoUrl: data.photoUrl,
                city: data.city,
                bio: data.bio,
                yearsOfExperience: data.yearsOfExperience,
                // Recommendation-engine fields
                focusAreas: data.focusAreas,
                sessionTypes: data.sessionTypes,
                sessionIntensity: data.sessionIntensity,
                coachingStyles: data.coachingStyles,
                languages: data.languages,
                otherLanguage: data.otherLanguage,
                specialCertifications: data.specialCertifications,
                medicalCertified: data.medicalCertified,
                rehabCertified: data.rehabCertified,
                maxClients: data.maxClients,
              },
            }),
  };

  return (
    <>
      {step === 1 && <TrainerProfileStep {...stepProps} />}
      {step === 2 && <TrainerExpertiseStep {...stepProps} />}
      {step === 3 && <TrainerAvailabilityStep {...stepProps} />}
    </>
  );
}
