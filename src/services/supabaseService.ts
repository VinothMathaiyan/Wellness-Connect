import { supabase } from '../lib/supabaseClient';
import type { DailyLog, MealLog, TrainingProgram, TrainingSession, User } from '../types';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, specialties, city, rating, certifications')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as User;
}

// ─── Daily Metrics ────────────────────────────────────────────────────────────

export async function getWeeklyLogs(userId: string): Promise<DailyLog[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('log_date, sleep_hours, mood_score, energy_score, water_glasses, workout_done, readiness_score')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyLog[];
}

// ─── Workout Plans ────────────────────────────────────────────────────────────

export async function fetchTrainingProgram(clientId: string): Promise<TrainingProgram> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id,
      workout_templates ( name, duration_weeks, sessions_per_week, goals ),
      trainer:profiles!workout_plans_trainer_id_fkey ( full_name, photo_url, specialties )
    `)
    .eq('client_id', clientId)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('program_not_ready');

  const plan = data as any;
  const template = plan.workout_templates;
  const trainer = plan.trainer;

  return {
    program_id: plan.id,
    program_name: template.name,
    duration_weeks: template.duration_weeks,
    sessions_per_week: template.sessions_per_week,
    goals: template.goals,
    trainer: {
      full_name: trainer.full_name,
      photo_url: trainer.photo_url ?? 'https://via.placeholder.com/150',
      specialisations: trainer.specialties ?? [],
    },
  };
}

export async function submitProgramApproval(
  programId: string,
  status: 'approved' | 'changes_requested',
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .update({ status, client_notes: notes ?? null })
    .eq('id', programId);

  if (error) throw error;
}

// ─── Risk Alerts ──────────────────────────────────────────────────────────────

export interface RiskAlert {
  id: string;
  client_id: string;
  trainer_id: string | null;
  alert_type: 'mood_drop' | 'sleep_drop' | 'missed_workout' | 'hydration' | 'general';
  message: string;
  severity: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at: string;
}

export async function getRiskAlerts(clientId: string): Promise<RiskAlert[]> {
  const { data, error } = await supabase
    .from('risk_alerts')
    .select('id, client_id, trainer_id, alert_type, message, severity, is_read, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RiskAlert[];
}

export const markAlertRead = async (alertId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('risk_alerts')
    .update({ is_read: true })
    .eq('id', alertId);
  if (error) {
    console.error('markAlertRead:', error);
    return false;
  }
  return true;
};

// ─── Trainer Dashboard ────────────────────────────────────────────────────────

export interface TrainerClient {
  status: string;
  type: string | null;
  profile: Pick<User, 'id' | 'full_name' | 'city'> & { email: string };
}

export async function getTrainerClients(trainerId: string): Promise<TrainerClient[]> {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      status,
      type,
      profile:profiles!trainer_client_links_client_id_fkey ( id, full_name, city )
    `)
    .eq('trainer_id', trainerId)
    .eq('status', 'active');

  if (error) throw error;
  return (data ?? []) as unknown as TrainerClient[];
}

export async function addTrainerFeedback(
  trainerId: string,
  clientId: string,
  logDate: string,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from('trainer_feedback')
    .insert({ trainer_id: trainerId, client_id: clientId, log_date: logDate, message });

  if (error) throw error;
}

// ─── Client Detail (Trainer View) ────────────────────────────────────────────

export const getClientDetail = async (clientId: string, trainerId: string) => {
  const [profileRes, metricsRes, alertsRes, planRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, city, specialties, photo_url')
      .eq('id', clientId)
      .single(),
    supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', clientId)
      .order('log_date', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('risk_alerts')
      .select('id, alert_type, message, severity, is_read, created_at')
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('workout_plans')
      .select(`
        id, status, trainer_note, scheduled_at,
        template:workout_templates!workout_plans_template_id_fkey(
          name, duration_weeks, sessions_per_week, goals
        )
      `)
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  return {
    profile: profileRes.data,
    latestMetrics: metricsRes.data,
    activeAlert: alertsRes.data,
    currentPlan: planRes.data,
  }
}

export const getClientCheckins = async (clientId: string, limit = 4) => {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', clientId)
    .order('log_date', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('getClientCheckins:', error)
    return []
  }
  return data ?? []
}

export const updateClientLinkStatus = async (
  trainerId: string,
  clientId: string,
  status: 'active' | 'inactive'
) => {
  const { error } = await supabase
    .from('trainer_client_links')
    .update({ status })
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
  if (error) {
    console.error('updateClientLinkStatus:', error)
    return false
  }
  return true
}

export const getPendingClientRequests = async (trainerId: string) => {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      client_id, status, type, created_at,
      client:profiles!trainer_client_links_client_id_fkey(
        id, full_name, city, specialties, photo_url
      )
    `)
    .eq('trainer_id', trainerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getPendingClientRequests:', error)
    return []
  }
  return data ?? []
}

// ─── Trainer Risk Monitor (full list) ────────────────────────────────────────

export interface TrainerRiskAlert {
  id: string;
  client_id: string;
  trainer_id: string | null;
  alert_type: 'mood_drop' | 'sleep_drop' | 'missed_workout' | 'hydration' | 'general';
  message: string | null;
  severity: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at: string;
  client: { id: string; full_name: string } | null;
}

export const getTrainerAllRiskAlerts = async (trainerId: string): Promise<TrainerRiskAlert[]> => {
  const { data, error } = await supabase
    .from('risk_alerts')
    .select(`
      id, client_id, trainer_id, alert_type, message, severity, is_read, created_at,
      client:profiles!risk_alerts_client_id_fkey(id, full_name)
    `)
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getTrainerAllRiskAlerts:', error);
    return [];
  }
  return (data ?? []) as unknown as TrainerRiskAlert[];
};

// ─── Session Log ──────────────────────────────────────────────────────────────

export interface SessionLogData {
  session_date: string;
  status: string;
  notes: string;
  exercises: string[];
  effort_score: number | null;
}

export const insertSessionLog = async (
  trainerId: string,
  clientId: string,
  sessionData: SessionLogData,
): Promise<boolean> => {
  const { error } = await supabase
    .from('workout_logs')
    .insert({
      trainer_id: trainerId,
      client_id: clientId,
      session_date: sessionData.session_date,
      status: sessionData.status,
      notes: sessionData.notes,
      exercises: sessionData.exercises,
      effort_score: sessionData.effort_score,
    });
  if (error) {
    console.error('insertSessionLog:', error);
    return false;
  }
  return true;
};

// ─── Schedule Session ─────────────────────────────────────────────────────────

export interface ScheduleSessionData {
  /** Full ISO datetime string e.g. "2026-05-20T09:00:00" */
  scheduled_at: string;
  /** Packed note: meeting link, location, or session type info */
  trainer_note: string | null;
}

export const scheduleSession = async (
  trainerId: string,
  clientId: string,
  data: ScheduleSessionData,
): Promise<boolean> => {
  const { error } = await supabase
    .from('workout_plans')
    .insert({
      template_id: null,
      trainer_id: trainerId,
      client_id: clientId,
      scheduled_at: data.scheduled_at,
      status: 'active',
      trainer_note: data.trainer_note,
    });
  if (error) {
    console.error('scheduleSession:', error);
    return false;
  }
  return true;
};

// ─── Workout Program (Trainer → Client) ───────────────────────────────────────

export interface WorkoutProgramData {
  name: string;
  duration_weeks: number;
  /** Trainer instructions visible to the client */
  trainer_note: string | null;
  // Note: goals, focusAreas, sessionsPerWeek are UI-only — no DB columns yet
}

export const createWorkoutProgram = async (
  trainerId: string,
  clientId: string,
  data: WorkoutProgramData,
): Promise<boolean> => {
  // Step 1 — create the template record
  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      trainer_id: trainerId,
      name: data.name,
      duration_weeks: data.duration_weeks,
      session_type: 'strength', // default; full session_type picker is post-MVP
    })
    .select('id')
    .single();

  if (templateError || !template) {
    console.error('createWorkoutProgram (template):', templateError);
    return false;
  }

  // Step 2 — assign plan to client
  const { error: planError } = await supabase
    .from('workout_plans')
    .insert({
      template_id: template.id,
      trainer_id: trainerId,
      client_id: clientId,
      status: 'pending_review',
      trainer_note: data.trainer_note ?? null,
    });

  if (planError) {
    console.error('createWorkoutProgram (plan):', planError);
    return false;
  }

  return true;
};

// ─── Weekly Plan Note ─────────────────────────────────────────────────────────

export const updatePlanTrainerNote = async (
  trainerId: string,
  clientId: string,
  content: string,
): Promise<boolean> => {
  // Resolve the most recent plan for this trainer-client pair
  const { data: plan, error: selectError } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError || !plan) {
    console.error('updatePlanTrainerNote (select):', selectError);
    return false;
  }

  const { error: updateError } = await supabase
    .from('workout_plans')
    .update({ trainer_note: content })
    .eq('id', plan.id);

  if (updateError) {
    console.error('updatePlanTrainerNote (update):', updateError);
    return false;
  }

  return true;
};

// ─── Trainer Dashboard Live Data ──────────────────────────────────────────────

export const getTrainerProfile = async (trainerId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, city, specialties, photo_url')
    .eq('id', trainerId)
    .single()
  if (error) { console.error('getTrainerProfile:', error); return null }
  return data
}

export const getTrainerRiskAlerts = async (trainerId: string) => {
  const { data, error } = await supabase
    .from('risk_alerts')
    .select(`
      id, alert_type, message, severity, is_read, created_at,
      client:profiles!risk_alerts_client_id_fkey(id, full_name)
    `)
    .eq('trainer_id', trainerId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) { console.error('getTrainerRiskAlerts:', error); return [] }
  return data ?? []
}

export const getTrainerTodaySessions = async (trainerId: string) => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id, scheduled_at, status, trainer_note,
      client:profiles!workout_plans_client_id_fkey(
        id, full_name, photo_url
      ),
      template:workout_templates!workout_plans_template_id_fkey(
        name, session_type
      )
    `)
    .eq('trainer_id', trainerId)
    .gte('scheduled_at', `${today}T00:00:00`)
    .lte('scheduled_at', `${today}T23:59:59`)
    .order('scheduled_at', { ascending: true })
  if (error) { console.error('getTrainerTodaySessions:', error); return [] }
  return data ?? []
}

// ─── Client Daily Metrics ─────────────────────────────────────────────────────



/**
 * Upsert a daily check-in log for the client.
 * Uses user_id + log_date as the conflict key.
 */
export const upsertDailyMetrics = async (
  userId: string,
  log: DailyLog,
): Promise<boolean> => {
  const { error } = await supabase
    .from('daily_metrics')
    .upsert(
      {
        user_id: userId,
        log_date: log.log_date,
        sleep_hours: log.sleep_hours,
        sleep_quality_score: log.sleep_quality_score,
        mood_score: log.mood_score,
        energy_score: log.energy_score,
        water_glasses: log.water_glasses,
        workout_done: log.workout_done,
        pain_score: log.pain_score ?? null,
        mobility_score: log.mobility_score,
        readiness_score: log.readiness_score ?? null,
      },
      { onConflict: 'user_id,log_date' },
    );
  if (error) {
    console.error('upsertDailyMetrics:', error);
    return false;
  }
  return true;
};

// ─── Client Meal Log ──────────────────────────────────────────────────────────

/**
 * Insert a single meal log entry for the client.
 */
export const insertMealLog = async (
  userId: string,
  payload: MealLog,
): Promise<boolean> => {
  const { error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      meal_type: payload.meal_type,
      description: payload.description,
      total_calories: payload.total_calories,
      macros_json: payload.macros_json,
      logged_at: payload.logged_at,
    });
  if (error) {
    console.error('insertMealLog:', error);
    return false;
  }
  return true;
};

// ─── SessionDetailScreen Live Data ───────────────────────────────────────────

/**
 * Fetch a single workout_plan by ID for the session detail view.
 * Joins workout_templates (left join — template_id can be null) and profiles
 * for trainer name. Applies the same fallback chain used by getClientTodaySession.
 * exercises is always [] — planned_exercises table not yet wired (post-MVP).
 * Returns null if not found or on error.
 */
export const getClientSession = async (sessionId: string): Promise<TrainingSession | null> => {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id, scheduled_at, status, trainer_note, session_name, session_type,
      template:workout_templates!workout_plans_template_id_fkey(
        name, session_type
      ),
      trainer:profiles!workout_plans_trainer_id_fkey(
        full_name
      )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) { console.error('getClientSession:', error); return null; }
  if (!data) return null;

  const plan = data as any;
  const template = plan.template;

  return {
    session_id:       plan.id,
    session_name:     plan.session_name        || template?.name         || 'Session',
    session_type:     plan.session_type        || template?.session_type || 'strength',
    trainer_name:     plan.trainer?.full_name                   ?? 'Your trainer',
    scheduled_at:     plan.scheduled_at,
    duration_minutes: 60,
    status:           plan.status === 'active' ? 'upcoming' : plan.status,
    trainer_note:     plan.trainer_note ?? undefined,
    exercises:        [],  // planned_exercises not yet wired — post-MVP
  };
};

// ─── TrainersScreen Live Data ────────────────────────────────────────────────

/**
 * Fetch all trainer profiles from the profiles table.
 * Returns [] on error — screen handles empty state.
 */
export const getTrainerProfiles = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, specialties, city, rating, photo_url')
    .eq('role', 'trainer')
    .order('full_name', { ascending: true });

  if (error) { console.error('getTrainerProfiles:', error); return []; }
  return (data ?? []) as User[];
};

/**
 * Fetch the trainer_ids of all active trainer_client_links for a client.
 * Used to split the trainer list into "My Trainer" vs "Discover".
 * Returns [] on error.
 */
export const getClientActiveTrainerIds = async (clientId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select('trainer_id')
    .eq('client_id', clientId)
    .eq('status', 'active');

  if (error) { console.error('getClientActiveTrainerIds:', error); return []; }
  return (data ?? []).map((row: { trainer_id: string }) => row.trainer_id);
};

// ─── HomeScreen Live Data ─────────────────────────────────────────────────────

/**
 * Fetch the most recent readiness_score for a client from daily_metrics.
 * Returns null if no row exists yet or the field is null (client has not
 * completed a check-in).
 */
export const getClientReadiness = async (userId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('readiness_score')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('getClientReadiness:', error); return null; }
  return data?.readiness_score ?? null;
};

/**
 * Fetch today's scheduled session for a client.
 * Left-joins workout_templates (template_id can be null for quick sessions).
 * Applies a fallback chain so session_name and session_type are never null.
 * Returns null if nothing is scheduled today.
 */
export const getClientTodaySession = async (userId: string): Promise<TrainingSession | null> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id, scheduled_at, status, trainer_note, session_name, session_type,
      template:workout_templates!workout_plans_template_id_fkey(
        name, session_type
      ),
      trainer:profiles!workout_plans_trainer_id_fkey(
        full_name
      )
    `)
    .eq('client_id', userId)
    .gte('scheduled_at', `${today}T00:00:00`)
    .lte('scheduled_at', `${today}T23:59:59`)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('getClientTodaySession:', error); return null; }
  if (!data) return null;

  const plan = data as any;
  const template = plan.template;

  return {
    session_id:       plan.id,
    session_name:     plan.session_name        || template?.name         || 'Session',
    session_type:     plan.session_type        || template?.session_type || 'strength',
    trainer_name:     plan.trainer?.full_name                   ?? 'Your trainer',
    scheduled_at:     plan.scheduled_at,
    duration_minutes: 60,
    status:           plan.status === 'active' ? 'upcoming' : plan.status,
    trainer_note:     plan.trainer_note ?? undefined,
  };
};

// ─── Client Profile (Health Profile Screen) ───────────────────────────────────

export interface ClientProfileData {
  dob:                string | null;
  gender:             string | null;
  height_cm:          number | null;
  weight_kg:          number | null;
  medical_conditions: string[];
  activity_level:     number | null;
  fitness_level:      string | null;
  goals:              string[];
}

/**
 * Upsert all fields collected on HealthProfileScreen into client_profiles.
 * Uses user_id as the conflict key so re-submitting the form updates in place.
 * Also keeps profiles.city in sync.
 */
export const upsertClientProfile = async (
  userId: string,
  data: ClientProfileData,
  city: string | null,
): Promise<boolean> => {
  // 1. Upsert into client_profiles
  const { error: cpError } = await supabase
    .from('client_profiles')
    .upsert(
      {
        user_id:            userId,
        dob:                data.dob || null,
        gender:             data.gender || null,
        height_cm:          data.height_cm,
        weight_kg:          data.weight_kg,
        medical_conditions: data.medical_conditions,
        activity_level:     data.activity_level,
        fitness_level:      data.fitness_level || null,
        goals:              data.goals,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (cpError) {
    console.error('upsertClientProfile (client_profiles):', cpError);
    return false;
  }

  // 2. Keep profiles.city in sync (city lives in the main profiles table)
  if (city !== null) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ city })
      .eq('id', userId);

    if (profileError) {
      console.error('upsertClientProfile (profiles.city):', profileError);
      // Non-fatal — client_profiles already saved
    }
  }

  return true;
};
