// ─── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  day: string;
  start_time: string;
  end_time: string;
}

// ─── File Upload ──────────────────────────────────────────────────────────────

export interface UploadedFile {
  name: string;
  size: number;    // bytes
  mimeType: string;
  dataUrl: string; // base64 data URL
}

// ─── Onboarding Data ──────────────────────────────────────────────────────────

export interface TrainerOnboardingData {
  // Step 1 — Profile & Trust
  photoUrl: string | null;
  certificationName: string;
  yearsOfExperience: string;
  bio: string;
  // Step 2 — Expertise & Matching
  specialisations: string[];
  focusAreas: string[];
  sessionTypes: string[];
  sessionIntensity: string;
  coachingStyles: string[];
  languages: string[];
  otherLanguage: string;
  specialCertifications: string[];
  medicalCertified: boolean;
  rehabCertified: boolean;
  city: string;
  // Step 3 — Availability & Capacity
  maxClients: number;
  availabilitySlots: AvailabilitySlot[];
  // Step 1 — Profile & Trust (certification upload, merged from former step 4)
  certificationDocument: UploadedFile | null;
  selfieWithCertificate: UploadedFile | null;
}

// ─── Step Props ───────────────────────────────────────────────────────────────

export interface StepProps {
  data: TrainerOnboardingData;
  updateData: (updates: Partial<TrainerOnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}
