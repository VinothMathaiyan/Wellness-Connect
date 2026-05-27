import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import Button from '../../../components/Button';
import { useWellness } from '../../../context/WellnessContext';
import type { AvailabilitySlot } from '../hooks/useTrainerOnboarding';
import { saveTrainerOnboarding } from '../services/trainerOnboardingService';

// Feature flags
const DEV_MODE = true;

interface CompletionState {
  certificationName?: string;
  availabilitySlots?: AvailabilitySlot[];
  specialisations?: string[];
  photoUrl?: string | null;
  city?: string;
  bio?: string;
  yearsOfExperience?: string;
  // Recommendation-engine fields
  focusAreas?: string[];
  sessionTypes?: string[];
  sessionIntensity?: string;
  coachingStyles?: string[];
  languages?: string[];
  otherLanguage?: string;
  specialCertifications?: string[];
  medicalCertified?: boolean;
  rehabCertified?: boolean;
  maxClients?: number;
}

export default function TrainerSetupCompleteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appState, userId } = useWellness();
  const [isSaving, setIsSaving] = useState(true);

  const fullName = (appState?.full_name as string) || 'Trainer';
  const firstName = fullName.split(' ')[0];

  const state = (location.state ?? {}) as CompletionState;

  useEffect(() => {
    if (!userId) {
      setIsSaving(false);
      return;
    }

    saveTrainerOnboarding(userId, {
      photoUrl:          state.photoUrl ?? null,
      certificationName: state.certificationName ?? '',
      specialisations:   state.specialisations ?? [],
      city:              state.city ?? '',
      bio:               state.bio ?? '',
      yearsOfExperience: state.yearsOfExperience ?? '',
      // Recommendation-engine fields forwarded from the onboarding flow
      focusAreas:             state.focusAreas ?? [],
      sessionTypes:           state.sessionTypes ?? [],
      sessionIntensity:       state.sessionIntensity ?? '',
      coachingStyles:         state.coachingStyles ?? [],
      languages:              state.languages ?? [],
      otherLanguage:          state.otherLanguage ?? '',
      specialCertifications:  state.specialCertifications ?? [],
      medicalCertified:       state.medicalCertified ?? false,
      rehabCertified:         state.rehabCertified ?? false,
      maxClients:             state.maxClients ?? 20,
      availabilitySlots:      state.availabilitySlots ?? [],
      certificationDocument:  null,
      selfieWithCertificate:  null,
    }).then(({ error }) => {
      if (error) {
        console.error('Trainer onboarding save failed:', error);
        // Do not block navigation — trainer proceeds regardless
      }
      setIsSaving(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const certNames = (state.certificationName ?? '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  const certDisplay = certNames.length > 0 ? String(certNames.length) : '—';

  const slotCount = state.availabilitySlots?.length ?? 0;
  const availDisplay = slotCount > 0 ? `${slotCount} hrs` : '—';

  const specCount = state.specialisations?.length ?? 0;
  const specDisplay = specCount > 0 ? String(specCount) : '—';

  return (
    <MobileShell>
      {/* Wordmark */}
      <div className="py-6 flex justify-center shrink-0">
        <h1 className="text-primary font-bold text-xl tracking-tight">
          WellnessConnect
        </h1>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pt-[20px] px-[18px] pb-[130px] scrollbar-hide flex flex-col">

        {/* 1. Compact Hero Block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center mb-[18px]"
        >
          <div className="w-[64px] h-[64px] rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Check size={32} strokeWidth={2.5} className="text-primary" />
          </div>
          
          <h2 className="font-serif font-bold text-[26px] leading-[34px] text-text-primary mb-2">
            Profile Submitted
          </h2>
          
          <p className="text-[14px] text-text-secondary leading-relaxed mb-4">
            Thanks, {firstName}. Your profile is with our Assessment Team.
          </p>

          <div className="inline-flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1.5 rounded-full">
            <Clock size={12} strokeWidth={2.5} />
            <span className="text-[11px] font-medium tracking-wide">
              Typically reviewed in 24–48 hours
            </span>
          </div>
        </motion.div>

        {/* 2. Submission summary row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="grid grid-cols-3 gap-2 mb-[18px]"
        >
          <div className="bg-white rounded-[14px] shadow-sm p-4 flex flex-col items-center justify-center text-center">
            <span className="font-serif font-bold text-[20px] text-text-primary mb-1">
              {certDisplay}
            </span>
            <span className="text-[10.5px] font-medium text-text-secondary leading-tight">
              Certifications
            </span>
          </div>
          <div className="bg-white rounded-[14px] shadow-sm p-4 flex flex-col items-center justify-center text-center">
            <span className="font-serif font-bold text-[20px] text-text-primary mb-1">
              {availDisplay}
            </span>
            <span className="text-[10.5px] font-medium text-text-secondary leading-tight">
              Weekly availability
            </span>
          </div>
          <div className="bg-white rounded-[14px] shadow-sm p-4 flex flex-col items-center justify-center text-center">
            <span className="font-serif font-bold text-[20px] text-text-primary mb-1">
              {specDisplay}
            </span>
            <span className="text-[10.5px] font-medium text-text-secondary leading-tight">
              Specializations
            </span>
          </div>
        </motion.div>

        {/* 3. "What happens next" timeline card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white rounded-[16px] shadow-sm p-5 mb-[18px]"
        >
          <p className="uppercase text-[10.5px] font-bold text-text-secondary/70 tracking-wider mb-5">
            What happens next
          </p>

          <div className="relative pl-[3px]">
            {/* Connector rail */}
            <div className="absolute left-[11.5px] top-[14px] bottom-[24px] w-[2px] bg-gray-100" />

            <div className="space-y-6">
              {/* Step A: Profile submitted (Done) */}
              <div className="relative flex items-start gap-4">
                <div className="w-[20px] h-[20px] mt-[2px] rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary leading-tight">
                    Profile submitted
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Just now
                  </p>
                </div>
              </div>

              {/* Step B: Shared with Assessment Team (Done) */}
              <div className="relative flex items-start gap-4">
                <div className="w-[20px] h-[20px] mt-[2px] rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary leading-tight">
                    Shared with Assessment Team
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Auto-routed
                  </p>
                </div>
              </div>

              {/* Step C: Profile under review (Current) */}
              <div className="relative flex items-start gap-4">
                <div className="w-[20px] h-[20px] mt-[2px] rounded-full bg-primary flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_5px_rgba(14,155,146,0.15)]">
                  <div className="w-[6px] h-[6px] bg-white rounded-full" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary leading-tight">
                    Profile under review
                  </p>
                  <p className="text-[12px] font-medium text-primary mt-0.5">
                    In progress
                  </p>
                </div>
              </div>

              {/* Step D: Dashboard activated (Todo) */}
              <div className="relative flex items-start gap-4">
                <div className="w-[20px] h-[20px] mt-[2px] rounded-full border-[1.5px] border-dashed border-[#C9D3D6] bg-white shrink-0 z-10" />
                <div>
                  <p className="text-[14px] font-semibold text-text-secondary leading-tight opacity-70">
                    Dashboard activated
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5 opacity-70">
                    Final step
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. Dev preview banner */}
        {DEV_MODE && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="bg-[#FFF7E8] text-[#8A6312] rounded-[10px] p-3 flex items-center gap-3 mb-[18px]"
          >
            <AlertTriangle size={16} strokeWidth={2.5} className="shrink-0" />
            <p className="text-[12px] font-medium leading-tight">
              Dev preview. Dashboard access is temporarily unlocked.
            </p>
          </motion.div>
        )}

      </div>

      {/* 5. Bottom CTA bar */}
      <div className="absolute bottom-0 w-full p-6 bg-white z-20 border-t border-gray-100 flex flex-col items-center">
        <Button
          onClick={() => navigate('/trainer/dashboard')}
          disabled={isSaving}
          isLoading={isSaving}
        >
          Preview my Trainer Dashboard
        </Button>
        <p className="text-[11px] text-text-secondary mt-3 font-medium text-center">
          You'll get full access after approval.
        </p>
      </div>
    </MobileShell>
  );
}
