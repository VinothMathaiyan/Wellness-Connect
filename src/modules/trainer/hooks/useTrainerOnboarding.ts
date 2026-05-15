import { useState } from 'react';
import type {
  AvailabilitySlot,
  UploadedFile,
  TrainerOnboardingData,
  StepProps,
} from '../types/trainerOnboarding.types';

// Re-export types so downstream consumers don't need to know about the types file
export type { AvailabilitySlot, UploadedFile, TrainerOnboardingData, StepProps };

// ─── Constants ────────────────────────────────────────────────────────────────

export const BIO_MIN = 50;
export const BIO_MAX = 500;
export const TOTAL_STEPS = 3;

// ─── Initial state ────────────────────────────────────────────────────────────

export const INITIAL_DATA: TrainerOnboardingData = {
  photoUrl: null,
  certificationName: '',
  yearsOfExperience: '',
  bio: '',
  specialisations: [],
  sessionTypes: [],
  languages: [],
  otherLanguage: '',
  city: '',
  availabilitySlots: [],
  certificationDocument: null,
  selfieWithCertificate: null,
};

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateStep1(
  data: TrainerOnboardingData
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!data.photoUrl)
    e.photo = 'A profile photo is required';
  if (!data.certificationName.trim())
    e.certificationName = 'Please enter your primary certification';
  if (data.yearsOfExperience !== '') {
    const yoe = parseInt(data.yearsOfExperience, 10);
    if (isNaN(yoe) || yoe < 0 || yoe > 50)
      e.yearsOfExperience = 'Must be between 0 and 50 years';
  }
  const bioTrimLen = data.bio.trim().length;
  if (bioTrimLen > 0 && bioTrimLen < BIO_MIN)
    e.bio = `${BIO_MIN - bioTrimLen} more characters to complete your bio`;
  else if (data.bio.length > BIO_MAX)
    e.bio = `Maximum ${BIO_MAX} characters`;
  return e;
}

export function validateStep2(
  data: TrainerOnboardingData
): Record<string, string> {
  const e: Record<string, string> = {};
  if (data.specialisations.length === 0)
    e.specialisations = 'Select at least one specialisation';
  if (data.sessionTypes.length === 0)
    e.sessionTypes = 'Select at least one session type';
  if (data.languages.length === 0)
    e.languages = 'Select at least one language';
  if (data.languages.includes('Other') && !data.otherLanguage.trim())
    e.otherLanguage = 'Please specify the language';
  if (!data.city.trim())
    e.city = 'Please select your city or location';
  return e;
}

export function validateStep3(
  data: TrainerOnboardingData
): Record<string, string> {
  const e: Record<string, string> = {};
  if (data.availabilitySlots.length === 0)
    e.slots = 'Add at least one availability slot to continue';
  return e;
}

export function validateStep4(
  _data: TrainerOnboardingData
): Record<string, string> {
  return {};
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainerOnboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TrainerOnboardingData>(INITIAL_DATA);

  const updateData = (updates: Partial<TrainerOnboardingData>) =>
    setData(prev => ({ ...prev, ...updates }));

  const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return { step, data, updateData, nextStep, prevStep };
}
