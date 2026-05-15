// src/types/index.ts

export interface SessionExercise {
  id: string;
  name: string;
  instructions: string;
  client_completed: boolean;
}

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
  trainer_note?: string;       // optional pre-session note from trainer
  exercises?: SessionExercise[]; // ordered exercise list for the session
}

// ─── Weekly Report (SCR-C10) ─────────────────────────────
export type WeeklyReportStatus = 'no_data' | 'generating' | 'ready';

export interface WeeklyReport {
  client_reflection?: string;
  week_number: number;
  start_date: string;
  end_date: string;
  averages: {
      readiness: number;
      sleep_hours: number;
      water_litres: number;
      mood_score: number;
      energy_level: number;
      pain_score: number;
      mobility_score: number;
      steps: number;
  };
  trends: {
      best_day: string;
      consistent_metric: string;
      sleep: { day_offset: number; value: number }[];
      water: { day_offset: number; value: number }[];
      mood: { day_offset: number; value: number }[];
      energy: { day_offset: number; value: number }[];
      pain: { day_offset: number; value: number }[];
      mobility: { day_offset: number; value: number }[];
      steps: { day_offset: number; value: number }[];
  };
  daily_readiness: { score: number | null }[];
  trainer_week_note?: string;
}

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
export type AssessmentStatus = 'pending' | 'scheduled' | 'completed';

export interface AssessmentBooking {
  preferred_time?: string;
  status?: AssessmentStatus;
}

// ─── Daily Log (daily_metrics table — SCR-C06 / DailyCheckInScreen) ───────────
export interface DailyLog {
  log_date: string;               // YYYY-MM-DD  — daily_metrics.log_date
  sleep_hours: number;            // 4–10        — daily_metrics.sleep_hours
  sleep_quality_score: number;    // 1–5         — daily_metrics.sleep_quality_score
  mood_score: number;             // 1–5         — daily_metrics.mood_score
  energy_score: number;           // 1–5         — daily_metrics.energy_score
  water_glasses: number;          // 0–8         — daily_metrics.water_glasses
  workout_done: boolean;          //             — daily_metrics.workout_done
  pain_score: number | null;      // 0,2,5,7,10  — daily_metrics.pain_score
  mobility_score: number;         // 0–10        — daily_metrics.mobility_score
  readiness_score?: number;       // computed 0–100 — daily_metrics.readiness_score
}

// ─── Macros (meal_logs.macros_json) ─────────────────────────────────────────
export interface MacrosJson {
  protein_g: number;  // grams of protein
  carbs_g: number;    // grams of carbohydrates
  fat_g: number;      // grams of fat
}

// ─── Daily Nutrition Aggregate (Phase 8 — HomeScreen live charts) ─────────────
export interface DailyNutrition {
  calories: number;   // total kcal consumed today
  protein_g: number;  // total protein (g)
  carbs_g: number;    // total carbs (g)
  fat_g: number;      // total fat (g)
  mealsLogged: number; // count of meal entries saved today
}

// ─── Meal Log (meal_logs table — SCR-C07 / MealLogScreen) ────────────────────
export interface MealLog {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // meal_logs.meal_type
  description: string;          // meal_logs.description
  total_calories: number;       // meal_logs.total_calories
  macros_json: MacrosJson;      // meal_logs.macros_json
  logged_at: string;            // ISO datetime  — meal_logs.logged_at
}

// ─── NutritionLogFlow types (SCR-C07 / NutritionLogFlow) ─────────────────────

/** A single food item within a meal */
export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: 'High' | 'Medium' | 'Low';
}

/** Meal type string used in NutritionLogFlow (maps to MealLog.meal_type) */
export type MealType = string;

/** Daily calorie / macro targets */
export interface NutritionLogTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Per-meal entry inside a NutritionLog */
export interface NutritionMealEntry {
  type: MealType;
  time: string;
  items: FoodItem[];
}

/** Top-level daily nutrition log (used internally by NutritionLogFlow) */
export interface NutritionLog {
  date: string;                     // YYYY-MM-DD
  meals: NutritionMealEntry[];      // ordered list of meals
  targets: NutritionLogTargets;     // daily macro targets
}

// ─── Global App State ─────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'success' | string;
  message: string;
  isRead: boolean;
  time: string;
  actionType?: string;
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

  // Screen 5: Dashboard (mocked until backend integration)
  readinessScore?: number;
  currentWeek?: number;
  assessmentStatus?: AssessmentStatus | null;

  // Screen 6: Daily Check-in
  dailyLog?: DailyLog;

  // Screen 7: Meal Logger
  mealLogs?: MealLog[];

  // Phase 8: Daily nutrition aggregate (drives HomeScreen live charts)
  dailyNutrition?: DailyNutrition;

  // Habit Progress
  habitProgress?: { done: number; total: number };

  // Alerts / Notifications
  notifications?: Notification[];

  // Phase 12: Trainers
  trainers?: User[];
  assignedTrainerId?: string | null;
  connections?: TrainerConnection[];

  // Forward-compatibility escape hatch — use unknown to avoid disabling type safety
  [key: string]: unknown;
}

export interface TrainerConnection {
  trainer_id: string;
  status: 'pending' | 'active';
  type?: string;
}

export interface User {
  id: string;
  full_name: string;
  role: 'client' | 'trainer';
  phone_number?: string | null;
  photo_url?: string | null;
  specialties?: string[];
  city?: string;
  rating?: number;
  certifications?: string[];
  available?: boolean;
  sessionCount?: number | string;
  availability?: string[];
  bio?: string;
}

export interface TrainingProgram {
  program_id: string;
  program_name: string;
  duration_weeks: number;
  sessions_per_week: number;
  goals: string[];
  trainer: {
    full_name: string;
    photo_url: string;
    specialisations: string[];
  };
}
