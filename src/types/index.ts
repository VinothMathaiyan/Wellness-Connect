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

// ─── Daily Log (daily_metrics table — SCR-C06 / DailyCheckInScreen) ───────────
export interface DailyLog {
  log_date: string;         // YYYY-MM-DD  — daily_metrics.log_date
  sleep_hours: number;      // 4–10        — daily_metrics.sleep_hours
  mood_score: number;       // 1–5         — daily_metrics.mood_score
  energy_score: number;     // 1–5         — daily_metrics.energy_score
  water_glasses: number;    // 0–8         — daily_metrics.water_glasses
  workout_done: boolean;    //             — daily_metrics.workout_done
  readiness_score?: number; // computed 0–100 — daily_metrics.readiness_score
}

// ─── Macros (meal_logs.macros_json) ─────────────────────────────────────────
export interface MacrosJson {
  protein_g: number;  // grams of protein
  carbs_g: number;    // grams of carbohydrates
  fat_g: number;      // grams of fat
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

  // Screen 6: Daily Check-in
  dailyLog?: DailyLog;

  // Screen 7: Meal Logger
  mealLogs?: MealLog[];

  // Habit Progress
  habitProgress?: { done: number; total: number };

  // Forward-compatibility escape hatch — use unknown to avoid disabling type safety
  [key: string]: unknown;
}
