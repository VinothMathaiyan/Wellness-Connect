import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
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
  // Resubmission flow (D4): the pending screen passes resubmit=true + the
  // assessor's review notes so we can show a banner explaining why the form
  // is open again. submitTrainerForApproval flips rejected → pending on submit.
  const isResubmit = location.state?.resubmit === true;
  const reviewNotes = (location.state?.reviewNotes as string | null | undefined) ?? null;
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
      {isResubmit && (
        <div
          className="w-full px-4 py-3 flex items-start gap-2.5 sticky top-0 z-30"
          style={{ backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <p className="text-[13px] leading-snug" style={{ color: '#92400E' }}>
            <span className="font-bold">Your previous submission was rejected.</span>{' '}
            {reviewNotes?.trim()
              ? <>Reviewer notes: <span className="italic">{reviewNotes}</span>. </>
              : null}
            Please update and resubmit.
          </p>
        </div>
      )}
      {step === 1 && <TrainerProfileStep {...stepProps} />}
      {step === 2 && <TrainerExpertiseStep {...stepProps} />}
      {step === 3 && <TrainerAvailabilityStep {...stepProps} />}
    </>
  );
}
