export interface HealthProfile {
  dob?: string | null;
  gender?: string | null;
  height_value?: number | null;
  height_unit?: 'cm' | 'ft' | 'ft/in' | null;
  weight_value?: number | null;
  weight_unit?: 'kg' | 'lbs' | null;
  city?: string | null;
  goals?: string[];
  conditions?: string[];
  activity_level?: number | null;
  fitness_level?: string | null;
}

export interface AssessmentBooking {
  preferred_time?: string;
  status?: string;
}

export interface WellnessAppState extends HealthProfile, AssessmentBooking {
  // Screen 1: Sign Up
  full_name?: string;
  mobile?: string;
  email?: string;
  privacy_accepted?: boolean;
  medical_disclaimer?: boolean;
  data_consent?: boolean;
  consentTimestamp?: string;
  ipLogged?: boolean;
  
  // Dynamic signature to handle future extensions if needed temporarily
  [key: string]: any;
}
