// ─── Training Session (SCR-C05 / HomeScreen) ─────────────────────────────────
export interface TrainingSession {
  session_id: string;
  session_name: string;
  session_type: 'yoga' | 'strength' | 'cardio' | 'recovery' | string;
  trainer_name: string;
  scheduled_at: string;        // ISO 8601 datetime
  duration_minutes: number;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  meeting_url?: string;
}

// ─── Weekly Report Status (SCR-C05 / HomeScreen) ─────────────────────────────
export type WeeklyReportStatus = 'no_data' | 'generating' | 'ready';

// ─── Health Profile (SCR-C02) ─────────────────────────────────────────────────
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

// ─── Assessment Booking (SCR-C03) ─────────────────────────────────────────────
export interface AssessmentBooking {
  preferred_time?: string;
  status?: string;
}

// ─── Global App State ─────────────────────────────────────────────────────────
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

  // Screen 5: Dashboard (mocked until backend integration)
  readinessScore?: number;
  currentWeek?: number;
  assessmentStatus?: 'pending' | 'scheduled' | 'completed' | null;

  // Dynamic signature to handle future extensions if needed temporarily
  [key: string]: any;
}
