import { supabase } from '../lib/supabaseClient';
import { normalisePhone } from '../utils/otpUtils';
import type {
  ClientNotification,
  ClientSession,
  ClientProgramDetail,
  DailyLog,
  MealLog,
  SessionExercise,
  TrainerClientSession,
  TrainerNotification,
  TrainerProfile,
  TrainingProgram,
  TrainingSession,
  User,
} from '../types';

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function normalizeTrainingStatus(status: string): TrainingSession['status'] {
  if (status === 'completed' || status === 'cancelled' || status === 'live' || status === 'upcoming') {
    return status;
  }
  return 'upcoming';
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, specialties, city, rating, certifications')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found');
  return data as User;
}

// ─── Daily Metrics ────────────────────────────────────────────────────────────

export async function getWeeklyLogs(userId: string): Promise<DailyLog[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('log_date, sleep_hours, sleep_quality_score, mood_score, energy_score, water_glasses, workout_done, readiness_score, pain_score, mobility_score')
    .eq('user_id', userId)
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyLog[];
}

// ─── Client Progress (ProgressScreen — configurable window) ──────────────────

export interface ClientProgressRow {
  log_date: string;
  readiness_score: number | null;
  sleep_hours: number | null;
  sleep_quality_score: number | null;
  energy_score: number | null;
  mood_score: number | null;
  pain_score: number | null;
  workout_done: boolean;
}

export async function getClientProgress(
  userId: string,
  days: number = 30,
): Promise<{ data: ClientProgressRow[]; error?: string }> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('daily_metrics')
    .select(
      'log_date, readiness_score, sleep_hours, sleep_quality_score, energy_score, mood_score, pain_score, workout_done',
    )
    .eq('user_id', userId)
    .gte('log_date', since.toISOString().split('T')[0])
    .order('log_date', { ascending: true });

  if (error) {
    console.error('getClientProgress:', error);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as ClientProgressRow[] };
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

  type TrainingProgramRow = {
    id: string;
    workout_templates: {
      name: string;
      duration_weeks: number;
      sessions_per_week: number;
      goals: string[];
    } | Array<{
      name: string;
      duration_weeks: number;
      sessions_per_week: number;
      goals: string[];
    }> | null;
    trainer: {
      full_name: string;
      photo_url: string | null;
      specialties: string[] | null;
    } | Array<{
      full_name: string;
      photo_url: string | null;
      specialties: string[] | null;
    }> | null;
  };

  const plan = data as unknown as TrainingProgramRow;
  const template = firstRelation(plan.workout_templates);
  const trainer = firstRelation(plan.trainer);
  if (!template || !trainer) throw new Error('program_not_ready');

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

/**
 * Persist trainer action notes against a risk_alerts row.
 * Used by RiskAlertScreen to keep an audit trail of trainer responses.
 */
export const saveAlertNotes = async (
  alertId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('risk_alerts')
    .update({ trainer_notes: notes })
    .eq('id', alertId);
  if (error) {
    console.error('saveAlertNotes:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// ─── Trainer Dashboard ────────────────────────────────────────────────────────

export interface TrainerClient {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  status: string;
  linked_at: string;
  latest_readiness: number | null;
  last_active: string | null;
  has_pending_checkin: boolean;
}

export async function getTrainerClients(trainerId: string): Promise<TrainerClient[]> {
  // Fetch accepted links with client profile
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      status,
      created_at,
      client:profiles!trainer_client_links_client_id_fkey ( id, full_name, city, avatar_url, photo_url )
    `)
    .eq('trainer_id', trainerId)
    .eq('status', 'active');

  if (error) throw error;

  const links = (data ?? []) as unknown as Array<{
    status: string;
    created_at: string;
    client: {
      id: string;
      full_name: string;
      city: string | null;
      avatar_url: string | null;
      photo_url: string | null;
    } | null;
  }>;

  // Assessment gate: a trainer only sees a linked client once the assessment
  // team has cleared them (clearance_status 'cleared' or 'conditional').
  const clientIds = links.map(l => l.client?.id).filter((id): id is string => !!id);
  const clearedClientIds = new Set<string>();
  if (clientIds.length > 0) {
    const { data: clearedRows } = await supabase
      .from('assessments')
      .select('client_id, clearance_status')
      .in('client_id', clientIds)
      .in('clearance_status', ['cleared', 'conditional']);
    for (const row of (clearedRows ?? []) as Array<{ client_id: string }>) {
      clearedClientIds.add(row.client_id);
    }
  }

  const clearedLinks = links.filter(
    link => link.client != null && clearedClientIds.has(link.client.id),
  );

  // Today's date string (YYYY-MM-DD) for pending check-in calculation
  const today = new Date().toISOString().split('T')[0];

  // For each cleared client, fetch their latest daily_metrics row
  const results: TrainerClient[] = await Promise.all(
    clearedLinks.map(async (link) => {
      const client = link.client;
      if (!client) {
        return {
          id: '',
          full_name: 'Unknown',
          avatar_url: null,
          city: null,
          status: link.status,
          linked_at: link.created_at,
          latest_readiness: null,
          last_active: null,
          has_pending_checkin: false,
        };
      }

      const { data: metricRow } = await supabase
        .from('daily_metrics')
        .select('readiness_score, log_date')
        .eq('user_id', client.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActive = metricRow?.log_date ?? null;
      // Pending only when a check-in exists but the latest one is before today
      const hasPendingCheckin = !!lastActive && lastActive < today;

      return {
        id: client.id,
        full_name: client.full_name,
        avatar_url: client.avatar_url ?? client.photo_url ?? null,
        city: client.city ?? null,
        status: link.status,
        linked_at: link.created_at,
        latest_readiness: metricRow?.readiness_score ?? null,
        last_active: lastActive,
        has_pending_checkin: hasPendingCheckin,
      };
    })
  );

  // Sort by last_active descending (most recent first), nulls last
  results.sort((a, b) => {
    if (!a.last_active && !b.last_active) return 0;
    if (!a.last_active) return 1;
    if (!b.last_active) return -1;
    return b.last_active.localeCompare(a.last_active);
  });

  return results;
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

export async function getPendingCheckinsCount(trainerId: string): Promise<number> {
  const { data: links, error: linkError } = await supabase
    .from('trainer_client_links')
    .select('client_id')
    .eq('trainer_id', trainerId)
    .eq('status', 'active');

  if (linkError || !links || links.length === 0) return 0;

  const clientIds = links.map(l => l.client_id);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: metrics, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('user_id')
    .in('user_id', clientIds)
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0]);

  if (metricsError || !metrics) return 0;

  const distinctClients = new Set(metrics.map(m => m.user_id));
  return distinctClients.size;
}

// ─── Client Detail (Trainer View) ────────────────────────────────────────────

export const getClientDetail = async (clientId: string, trainerId: string) => {
  const [profileRes, metricsRes, alertsRes, planRes, clientProfileRes, adherenceResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, city, specialties, photo_url')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', clientId)
      .order('log_date', { ascending: false })
      .limit(2),
    supabase
      .from('risk_alerts')
      .select('id, alert_type, message, severity, is_read, created_at')
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workout_plans')
      .select(`
        id, status, trainer_note, scheduled_at, created_at,
        template:workout_templates!workout_plans_template_id_fkey(
          id, name, duration_weeks, sessions_per_week, goals, focus_areas
        )
      `)
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId)
      .not('status', 'in', '("cancelled","completed")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('client_profiles')
      .select('goals')
      .eq('user_id', clientId)
      .maybeSingle(),
    getClientAdherence(clientId, trainerId),
  ])

  const metricsRows = metricsRes.data ?? [];
  const dbMetrics = metricsRows[0] ?? null;
  const previousMetrics = metricsRows[1] ?? null;

  return {
    profile:          profileRes.data,
    latestMetrics:    dbMetrics,
    previousMetrics:  previousMetrics,
    activeAlert:      alertsRes.data,
    currentPlan:      planRes.data,
    clientGoals:      (clientProfileRes.data as { goals?: string[] } | null)?.goals ?? [],
    adherence:        adherenceResult,
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

/**
 * Fetch the data needed by CheckinReviewScreen for a single client.
 * Returns null only when the underlying profile lookup fails entirely
 * (e.g. network error). When no check-in exists, the row-level fields
 * are returned as null so the screen can render its empty state.
 *
 * Notes:
 * - trainerId is accepted for future authorisation checks; it is not
 *   currently used in the query because daily_metrics has no trainer FK.
 * - readinessDelta is computed from the two most recent rows; if there
 *   is only one row, delta is null.
 */
export const getCheckinReview = async (
  clientId: string,
  _trainerId: string,
): Promise<import('../types').CheckinReviewData | null> => {
  void _trainerId;

  const [profileRes, metricsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('log_date, readiness_score, mobility_score, pain_score, energy_score')
      .eq('user_id', clientId)
      .order('log_date', { ascending: false })
      .limit(2),
  ]);

  if (profileRes.error) {
    console.error('getCheckinReview:profile:', profileRes.error);
    return null;
  }
  if (metricsRes.error) {
    console.error('getCheckinReview:metrics:', metricsRes.error);
    return null;
  }

  const rows = metricsRes.data ?? [];
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;

  const readinessDelta: number | null = (
    latest?.readiness_score != null &&
    previous?.readiness_score != null
  )
    ? latest.readiness_score - previous.readiness_score
    : null;

  return {
    clientName:     (profileRes.data as { full_name: string } | null)?.full_name ?? null,
    logDate:        latest?.log_date ?? null,
    readinessScore: latest?.readiness_score ?? null,
    readinessDelta,
    mobilityScore:  latest?.mobility_score ?? null,
    painScore:      latest?.pain_score ?? null,
    energyScore:    latest?.energy_score ?? null,
  };
};

export const updateClientLinkStatus = async (
  trainerId: string,
  clientId: string,
  status: 'active' | 'inactive' | 'declined'
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

/**
 * Lightweight count of active clients for a trainer.
 * Used by AcceptDeclineScreen to show real client load without
 * fetching full client profiles.
 */
export const getActiveClientCount = async (trainerId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('trainer_client_links')
    .select('client_id', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('status', 'active');
  if (error) {
    console.error('getActiveClientCount:', error);
    return 0;
  }
  return count ?? 0;
};

export const getPendingClientRequests = async (trainerId: string) => {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      client_id, status, type, created_at,
      client:profiles!trainer_client_links_client_id_fkey(
        id, full_name, city, specialties, photo_url, phone_number
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

/**
 * Client-initiated trainer connection request.
 *
 * Inserts a `pending` trainer_client_links row so the trainer sees the client
 * in their Pending Requests list. Called when a client requests a callback or
 * sends a first message from the trainer profile. Idempotent: if a link already
 * exists (any status) it is left untouched and reported via `alreadyExists`,
 * so a client can request multiple trainers without hitting errors on retry.
 */
export async function requestTrainerLink(
  clientId: string,
  trainerId: string
): Promise<{ success: boolean; alreadyExists?: boolean; error?: string }> {
  // Check if link already exists (any status)
  const { data: existing } = await supabase
    .from('trainer_client_links')
    .select('id, status')
    .eq('client_id', clientId)
    .eq('trainer_id', trainerId)
    .maybeSingle()

  if (existing) {
    return { success: true, alreadyExists: true }
    // Don't error — silently skip if already exists
  }

  const { error } = await supabase
    .from('trainer_client_links')
    .insert({
      client_id: clientId,
      trainer_id: trainerId,
      status: 'pending'
    })

  if (error) return { success: false, error: error.message }
  return { success: true, alreadyExists: false }
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
  trainer_notes: string | null;
  client: { id: string; full_name: string } | null;
}

export const getTrainerAllRiskAlerts = async (trainerId: string): Promise<TrainerRiskAlert[]> => {
  const { data, error } = await supabase
    .from('risk_alerts')
    .select(`
      id, client_id, trainer_id, alert_type, message, severity, is_read, created_at, trainer_notes,
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

export interface ScheduleSessionOptions {
  scheduledAt: string;               // ISO datetime string
  sessionType: string;               // 'video' | 'in-person' | 'phone'
  durationMinutes: number;
  meetingUrl?: string | null;
  location?: string | null;          // physical address for in-person sessions
  trainerNote?: string | null;
  isRecurring: boolean;
  recurrenceFrequency?: string | null; // 'daily' | 'weekly' | 'twice_a_week'
  sessionCount?: number;             // required when isRecurring = true
}

/**
 * Build ISO datetime strings for recurring sessions.
 * Advances a mutable cursor by the correct interval after each session.
 */
function calculateRecurringDates(
  startIso: string,
  frequency: string,
  count: number,
): string[] {
  const dates: string[] = [];
  const cursor = new Date(startIso);
  for (let i = 0; i < count; i++) {
    dates.push(cursor.toISOString());
    if (frequency === 'daily') {
      cursor.setDate(cursor.getDate() + 1);
    } else if (frequency === 'weekly') {
      cursor.setDate(cursor.getDate() + 7);
    } else if (frequency === 'twice_a_week') {
      // Alternate +2 and +5 days → Mon/Wed or similar pattern
      cursor.setDate(cursor.getDate() + (i % 2 === 0 ? 2 : 5));
    }
  }
  return dates;
}

export const scheduleSession = async (
  trainerId: string,
  clientId: string,
  options: ScheduleSessionOptions,
): Promise<void> => {
  const baseRow = {
    trainer_id:           trainerId,
    client_id:            clientId,
    session_type:         options.sessionType,
    duration_minutes:     options.durationMinutes,
    meeting_url:          options.meetingUrl ?? null,
    location:             options.location ?? null,
    trainer_note:         options.trainerNote ?? null,
    is_recurring:         options.isRecurring,
    recurrence_frequency: options.isRecurring ? (options.recurrenceFrequency ?? null) : null,
    status:               'scheduled',
  };

  if (!options.isRecurring) {
    // Single session — one row
    const { error } = await supabase
      .from('sessions')
      .insert({ ...baseRow, scheduled_at: options.scheduledAt });
    if (error) {
      console.error('scheduleSession (single):', error);
      throw error;
    }
  } else {
    // Recurring — batch insert one row per calculated date
    const dates = calculateRecurringDates(
      options.scheduledAt,
      options.recurrenceFrequency!,
      options.sessionCount!,
    );
    const rows = dates.map(date => ({ ...baseRow, scheduled_at: date }));
    const { error } = await supabase.from('sessions').insert(rows);
    if (error) {
      console.error('scheduleSession (recurring):', error);
      throw error;
    }
  }

  // Insert notification for client — non-fatal if it fails
  try {
    const startLabel = new Date(options.scheduledAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    const message = options.isRecurring
      ? `Your trainer has scheduled ${options.sessionCount} sessions starting ${startLabel}`
      : `Your trainer has scheduled a session on ${startLabel}`;
    await supabase.from('notifications').insert({
      type:         'session_scheduled',
      from_user_id: trainerId,
      to_user_id:   clientId,
      message,
      is_read:      false,
    });
  } catch (notifErr) {
    console.warn('scheduleSession: notification insert failed (non-fatal):', notifErr);
  }
};

// ─── Workout Program (Trainer → Client) ───────────────────────────────────────

export interface WorkoutProgramData {
  name: string;
  duration_weeks: number;
  sessions_per_week: number;
  /** Trainer instructions visible to the client */
  trainer_note: string | null;
  /** Program goals — string[] persisted to workout_templates.goals (ARRAY) */
  goals: string[];
  /** Focus areas — string[] persisted to workout_templates.focus_areas (ARRAY) */
  focus_areas: string[];
}

async function sendProgramAssignedNotification(
  trainerId: string,
  clientId: string,
  programName: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      type: 'program_assigned',
      from_user_id: trainerId,
      to_user_id: clientId,
      message: `Your trainer has assigned a new program: ${programName}. Please review and approve it.`,
      is_read: false,
    });

    if (error) throw error;
  } catch (notificationError) {
    console.warn('createWorkoutProgram: notification insert failed (non-fatal):', notificationError);
  }
}

/**
 * Cancel all non-terminal plans for a trainer+client pair except the
 * current active plan. Wrapped externally in try/catch — non-fatal.
 */
async function cancelOtherPlans(
  trainerId: string,
  clientId: string,
  keepPlanId: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('trainer_id', trainerId)
    .neq('id', keepPlanId)
    .not('status', 'in', '("completed","cancelled")');

  if (error) {
    console.warn('createWorkoutProgram (cancelOtherPlans):', error);
  }
}

export const createWorkoutProgram = async (
  trainerId: string,
  clientId: string,
  data: WorkoutProgramData,
): Promise<{ success: boolean; templateId: string | null }> => {
  // ── Look up the most recent non-terminal plan for this trainer+client ────────
  // 'changes_requested' is included so a trainer re-opening Program Builder
  // after a client requests changes goes through UPDATE, never INSERT.
  // Terminal statuses ('completed', 'cancelled') correctly fall through to INSERT.
  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('workout_plans')
    .select('id, template_id')
    .eq('client_id', clientId)
    .eq('trainer_id', trainerId)
    .in('status', ['active', 'pending_review', 'approved', 'changes_requested'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlanError) {
    console.error('createWorkoutProgram (existing plan):', existingPlanError);
    return { success: false, templateId: null };
  }

  // ── UPDATE path — a non-terminal plan already exists ─────────────────────────
  if (existingPlan?.template_id) {
    console.log('createWorkoutProgram: UPDATE path — existing plan:', existingPlan.id);

    const { data: updatedTemplate, error: templateUpdateError } = await supabase
      .from('workout_templates')
      .update({
        name: data.name,
        duration_weeks: data.duration_weeks,
        goals: data.goals ?? [],
        focus_areas: data.focus_areas ?? [],
        sessions_per_week: data.sessions_per_week ?? 3,
      })
      .eq('id', existingPlan.template_id)
      .select('id')
      .maybeSingle();

    if (templateUpdateError || !updatedTemplate) {
      console.error('createWorkoutProgram (template update):', templateUpdateError);
      return { success: false, templateId: null };
    }

    const { data: updatedPlan, error: planUpdateError } = await supabase
      .from('workout_plans')
      .update({
        status: 'pending_review',
        trainer_note: data.trainer_note ?? null,
      })
      .eq('id', existingPlan.id)
      .select('id')
      .maybeSingle();

    if (planUpdateError || !updatedPlan) {
      console.error('createWorkoutProgram (plan update):', planUpdateError);
      return { success: false, templateId: null };
    }

    // Cancel any stale sibling plans — non-fatal
    try {
      await cancelOtherPlans(trainerId, clientId, existingPlan.id);
    } catch (cleanupErr) {
      console.warn('createWorkoutProgram (cleanup, UPDATE):', cleanupErr);
    }

    await sendProgramAssignedNotification(trainerId, clientId, data.name);
    return { success: true, templateId: existingPlan.template_id };
  }

  // ── INSERT path — no non-terminal plan exists (first save, or after cancel/complete) ──
  console.log('createWorkoutProgram: INSERT path — no existing plan found');

  // Step 1 — create the template record
  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      trainer_id: trainerId,
      name: data.name,
      duration_weeks: data.duration_weeks,
      session_type: 'strength', // default; full session_type picker is post-MVP
      goals: data.goals ?? [],
      focus_areas: data.focus_areas ?? [],
      sessions_per_week: data.sessions_per_week ?? 3,
    })
    .select('id')
    .maybeSingle();

  if (templateError || !template) {
    console.error('createWorkoutProgram (template):', templateError);
    return { success: false, templateId: null };
  }

  // Step 2 — assign plan to client; select id so cleanup can reference it
  const { data: newPlan, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      template_id: template.id,
      trainer_id: trainerId,
      client_id: clientId,
      status: 'pending_review',
      trainer_note: data.trainer_note ?? null,
    })
    .select('id')
    .maybeSingle();

  if (planError || !newPlan) {
    console.error('createWorkoutProgram (plan):', planError);
    return { success: false, templateId: null };
  }

  // Cancel any stale sibling plans — non-fatal
  try {
    await cancelOtherPlans(trainerId, clientId, newPlan.id);
  } catch (cleanupErr) {
    console.warn('createWorkoutProgram (cleanup, INSERT):', cleanupErr);
  }

  await sendProgramAssignedNotification(trainerId, clientId, data.name);
  return { success: true, templateId: template.id };
};

// ─── Workout Program Exercises (Trainer → Client) ───────────────────────────

export const saveExercisesToTemplate = async (
  templateId: string,
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    rest_seconds: number | null;
    instructions: string;
  }>
): Promise<void> => {
  // Step A — Delete existing exercises for this template
  const { error: deleteError } = await supabase
    .from('planned_exercises')
    .delete()
    .eq('template_id', templateId);

  if (deleteError) {
    console.error('saveExercisesToTemplate (delete):', deleteError);
    throw deleteError;
  }

  // Step B — Insert new exercises
  if (exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      template_id: templateId,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      instructions: ex.instructions,
      order_index: index + 1,
    }));

    const { error: insertError } = await supabase
      .from('planned_exercises')
      .insert(rows);

    if (insertError) {
      console.error('saveExercisesToTemplate (insert):', insertError);
      throw insertError;
    }
  }
};

export async function getClientNotifications(
  clientId: string,
): Promise<ClientNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      message,
      is_read,
      created_at,
      from_user_id,
      sender:profiles!notifications_from_user_id_fkey (
        full_name
      )
    `)
    .eq('to_user_id', clientId)
    .in('type', ['program_assigned', 'session_cancelled', 'session_scheduled', 'profile_updated', 'assessment_complete'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  type ClientNotificationRow = {
    id: string;
    type: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
    from_user_id: string;
    sender: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  };

  return ((data ?? []) as unknown as ClientNotificationRow[]).map((row): ClientNotification => {
    const sender = firstRelation(row.sender);

    return {
      id: row.id,
      type: row.type,
      message: row.message,
      is_read: row.is_read,
      created_at: row.created_at,
      from_user_id: row.from_user_id,
      from_name: sender?.full_name ?? 'Your trainer',
    };
  });
}

export async function markClientNotificationRead(
  notificationId: string,
  clientId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('to_user_id', clientId);

  if (error) throw error;
}

export async function getLatestPendingPlan(
  clientId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('client_id', clientId)
    .in('status', ['active', 'pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getLatestPendingPlan:', error);
    return null;
  }
  return data?.id ?? null;
}

export async function getClientProgramDetail(
  planId: string,
  clientId: string,
): Promise<ClientProgramDetail | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id,
      status,
      trainer_note,
      template:workout_templates!workout_plans_template_id_fkey (
        name,
        duration_weeks,
        sessions_per_week,
        goals,
        focus_areas
      ),
      trainer:profiles!workout_plans_trainer_id_fkey (
        full_name
      )
    `)
    .eq('id', planId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type ClientProgramDetailRow = {
    id: string;
    status: string;
    trainer_note: string | null;
    template: {
      name: string;
      duration_weeks: number | null;
      sessions_per_week: number | null;
      goals: string[] | null;
      focus_areas: string[] | null;
    } | Array<{
      name: string;
      duration_weeks: number | null;
      sessions_per_week: number | null;
      goals: string[] | null;
      focus_areas: string[] | null;
    }> | null;
    trainer: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  };

  const row = data as unknown as ClientProgramDetailRow;
  const template = firstRelation(row.template);
  const trainer = firstRelation(row.trainer);
  if (!template) return null;

  return {
    plan_id: row.id,
    status: row.status,
    trainer_note: row.trainer_note,
    name: template.name,
    duration_weeks: template.duration_weeks,
    sessions_per_week: template.sessions_per_week,
    goals: template.goals,
    focus_areas: template.focus_areas,
    trainer_name: trainer?.full_name ?? 'Your trainer',
  };
}

export async function getExercisesForPlan(
  planId: string,
  clientId: string,
): Promise<SessionExercise[]> {
  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('template_id')
    .eq('id', planId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (planError) throw planError;
  if (!plan?.template_id) return [];

  const { data: exercises, error: exercisesError } = await supabase
    .from('planned_exercises')
    .select('id, name, sets, reps, rest_seconds, instructions, order_index')
    .eq('template_id', plan.template_id)
    .order('order_index', { ascending: true });

  if (exercisesError) throw exercisesError;

  return (exercises ?? []).map((row: {
    id: string;
    name: string;
    sets: number | null;
    reps: number | null;
    rest_seconds: number | null;
    instructions: string | null;
    order_index: number;
  }): SessionExercise => ({
    id: row.id,
    name: row.name,
    sets: row.sets ?? 0,
    reps: row.reps ?? 0,
    rest_seconds: row.rest_seconds,
    instructions: row.instructions,
    order_index: row.order_index,
  }));
}

export async function approveProgram(
  planId: string,
  clientId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('workout_plans')
    .update({ status: 'active' })
    .eq('id', planId)
    .eq('client_id', clientId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Program not found or unauthorized');
  }

  const { error: inactiveError } = await supabase
    .from('workout_plans')
    .update({ status: 'inactive' })
    .eq('client_id', clientId)
    .neq('id', planId)
    .in('status', ['active', 'approved']);

  if (inactiveError) throw inactiveError;
}

export async function requestProgramChanges(
  planId: string,
  clientId: string,
  feedback: string,
): Promise<void> {
  const trimmedFeedback = feedback.trim();
  if (!trimmedFeedback) {
    throw new Error('Feedback is required');
  }

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('id, trainer_id')
    .eq('id', planId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (planError) throw planError;
  if (!plan) throw new Error('Program not found or unauthorized');

  const { data: updatedPlan, error: updateError } = await supabase
    .from('workout_plans')
    .update({
      status: 'changes_requested',
      client_notes: trimmedFeedback,
    })
    .eq('id', planId)
    .eq('client_id', clientId)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updatedPlan) throw new Error('Program not found or unauthorized');

  try {
    const { error: notificationError } = await supabase.from('notifications').insert({
      type: 'program_changes_requested',
      from_user_id: clientId,
      to_user_id: plan.trainer_id,
      message: trimmedFeedback,
      is_read: false,
    });

    if (notificationError) throw notificationError;
  } catch (notificationError) {
    console.warn('requestProgramChanges: notification insert failed (non-fatal):', notificationError);
  }
}

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

// ─── Trainer Onboarding Gate ──────────────────────────────────────────────────

/**
 * Returns true when the trainer has already completed onboarding
 * (full_name, city, and at least one speciality are all present).
 *
 * Returns false on any DB error — safe default prevents accidental
 * dashboard access for incomplete profiles.
 */
export const isTrainerOnboardingComplete = async (
  userId: string,
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, specialties, city')
      .eq('id', userId)
      .eq('role', 'trainer')
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;

    return (
      !!data.full_name &&
      !!data.city &&
      Array.isArray(data.specialties) &&
      (data.specialties as string[]).length > 0
    );
  } catch {
    return false;
  }
};

// ─── Trainer Dashboard Live Data ──────────────────────────────────────────────

export const getTrainerProfile = async (trainerId: string): Promise<TrainerProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, city, specialties, certifications,
      bio, availability, experience_years, session_count,
      rating, avatar_url, photo_url
    `)
    .eq('id', trainerId)
    .eq('role', 'trainer')
    .limit(1)
    .maybeSingle();

  if (error) { console.error('getTrainerProfile:', error); return null; }
  if (!data) return null;

  return {
    id:               data.id,
    full_name:        data.full_name,
    city:             data.city ?? null,
    specialties:      data.specialties ?? null,
    certifications:   data.certifications ?? null,
    bio:              data.bio ?? null,
    availability:     data.availability ?? null,
    experience_years: data.experience_years ?? null,
    session_count:    data.session_count ?? null,
    rating:           data.rating ?? null,
    avatar_url:       data.avatar_url ?? null,
    photo_url:        data.photo_url ?? null,
  };
};

// ─── Trainer Alert Summary (Dashboard triage banner) ─────────────────────────

/**
 * Returns the count of unread high-severity risk alerts raised by this trainer.
 * Used by the dashboard banner to show trainer-facing triage copy.
 */
export const getTrainerAlertSummary = async (
  trainerId: string,
): Promise<{ urgentCount: number }> => {
  const { count, error } = await supabase
    .from('risk_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('severity', 'high')
    .eq('is_read', false);

  if (error) {
    console.error('getTrainerAlertSummary:', error);
    return { urgentCount: 0 };
  }
  return { urgentCount: count ?? 0 };
};

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
  // Normalise optional fields so unfilled values do not violate the
  // daily_metrics CHECK constraints. mood_score / energy_score must be 1–5
  // (or NULL) — a 0 from an unanswered question would be rejected — and
  // water_glasses must be 0–8. Only user_id, log_date and readiness_score
  // are effectively required; everything else defaults to NULL when blank.
  const moodScore = log.mood_score >= 1 ? log.mood_score : null;
  const energyScore = log.energy_score >= 1 ? log.energy_score : null;
  const sleepQualityScore = log.sleep_quality_score >= 1 ? log.sleep_quality_score : null;
  const waterGlasses = Math.min(Math.max(log.water_glasses ?? 0, 0), 8);

  const { error } = await supabase
    .from('daily_metrics')
    .upsert(
      {
        user_id: userId,
        log_date: log.log_date,
        sleep_hours: log.sleep_hours ?? null,
        sleep_quality_score: sleepQualityScore,
        mood_score: moodScore,
        energy_score: energyScore,
        water_glasses: waterGlasses,
        workout_done: log.workout_done,
        pain_score: log.pain_score ?? null,
        mobility_score: log.mobility_score ?? null,
        readiness_score: log.readiness_score ?? null,
      },
      { onConflict: 'user_id,log_date' },
    );
  if (error) {
    // Surface the real Supabase error (message/details/hint/code) rather than
    // a bare object, so check-in save failures are diagnosable.
    console.error(
      'upsertDailyMetrics:',
      error.message,
      error.details,
      error.hint,
      error.code,
    );
    return false;
  }
  return true;
};

// ─── Client Meal Log ──────────────────────────────────────────────────────────

/**
 * Insert a single meal log entry for the client.
 * Persists the AI meal_name and per-food breakdown (foods_json) when provided.
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
      meal_name: payload.meal_name ?? null,
      foods_json: payload.foods ?? null,
      notes: payload.notes ?? null,
    });
  if (error) {
    console.error('insertMealLog:', error);
    return false;
  }
  return true;
};

// ─── Meal Image Analysis (Claude Vision via Edge Function) ─────────────────────

/** Shape returned by the analyse-meal-image Edge Function */
export interface MealAnalysisResult {
  meal_name: string;
  foods: {
    name: string;
    portion: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

/**
 * Send a base64 meal image to the analyse-meal-image Edge Function, which calls
 * Claude Vision and returns structured nutrition data. The image is never stored.
 * Returns null on any failure so the caller can show a retry state.
 */
export const analyseMealImage = async (
  imageBase64: string,
  mediaType: string = 'image/jpeg',
): Promise<MealAnalysisResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyse-meal-image', {
      body: { imageBase64, mediaType },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? 'Analysis failed');
    return data.meal as MealAnalysisResult;
  } catch (err) {
    console.error('analyseMealImage error:', err);
    return null;
  }
};

/**
 * Dev-only mock meal analysis. Used by NutritionLogFlow when VITE_USE_DEV_OTP=true
 * so the scan flow works without Anthropic API credits. Never used in production.
 */
export function getMockMealAnalysis(mealType: string): MealAnalysisResult {
  const mockMeals: Record<string, MealAnalysisResult> = {
    breakfast: {
      meal_name: 'South Indian Breakfast',
      foods: [
        { name: 'Idli', portion: '3 pieces', calories: 150, protein_g: 6, carbs_g: 30, fat_g: 1 },
        { name: 'Sambar', portion: '1 cup (200ml)', calories: 80, protein_g: 4, carbs_g: 12, fat_g: 2 },
        { name: 'Coconut Chutney', portion: '2 tbsp', calories: 60, protein_g: 1, carbs_g: 3, fat_g: 5 },
      ],
      totals: { calories: 290, protein_g: 11, carbs_g: 45, fat_g: 8 },
      confidence: 'high',
      notes: 'AI meal scanning coming soon',
    },
    lunch: {
      meal_name: 'Rice Meal',
      foods: [
        { name: 'Steamed Rice', portion: '1 cup (200g)', calories: 260, protein_g: 5, carbs_g: 57, fat_g: 1 },
        { name: 'Dal', portion: '1 cup (200ml)', calories: 120, protein_g: 8, carbs_g: 18, fat_g: 2 },
        { name: 'Mixed Vegetables', portion: '1/2 cup', calories: 50, protein_g: 2, carbs_g: 8, fat_g: 1 },
        { name: 'Papad', portion: '1 piece', calories: 35, protein_g: 2, carbs_g: 5, fat_g: 1 },
      ],
      totals: { calories: 465, protein_g: 17, carbs_g: 88, fat_g: 5 },
      confidence: 'high',
      notes: 'AI meal scanning coming soon',
    },
    dinner: {
      meal_name: 'Roti with Sabzi',
      foods: [
        { name: 'Whole Wheat Roti', portion: '3 rotis', calories: 240, protein_g: 9, carbs_g: 45, fat_g: 4 },
        { name: 'Paneer Sabzi', portion: '1 cup', calories: 180, protein_g: 10, carbs_g: 8, fat_g: 12 },
        { name: 'Raita', portion: '1/2 cup', calories: 60, protein_g: 3, carbs_g: 6, fat_g: 2 },
      ],
      totals: { calories: 480, protein_g: 22, carbs_g: 59, fat_g: 18 },
      confidence: 'high',
      notes: 'AI meal scanning coming soon',
    },
    snack: {
      meal_name: 'Evening Snack',
      foods: [
        { name: 'Banana', portion: '1 medium', calories: 90, protein_g: 1, carbs_g: 23, fat_g: 0 },
        { name: 'Mixed Nuts', portion: '1 handful (30g)', calories: 180, protein_g: 5, carbs_g: 6, fat_g: 16 },
      ],
      totals: { calories: 270, protein_g: 6, carbs_g: 29, fat_g: 16 },
      confidence: 'high',
      notes: 'AI meal scanning coming soon',
    },
  };
  return mockMeals[mealType] || mockMeals.snack;
}

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

  type SessionPlanRow = {
    id: string;
    scheduled_at: string;
    status: string;
    trainer_note: string | null;
    session_name: string | null;
    session_type: string | null;
    template: { name: string | null; session_type: string | null } | Array<{ name: string | null; session_type: string | null }> | null;
    trainer: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  };

  const plan = data as unknown as SessionPlanRow;
  const template = firstRelation(plan.template);
  const trainer = firstRelation(plan.trainer);

  return {
    session_id:       plan.id,
    session_name:     plan.session_name        || template?.name         || 'Session',
    session_type:     plan.session_type        || template?.session_type || 'strength',
    trainer_name:     trainer?.full_name                   ?? 'Your trainer',
    scheduled_at:     plan.scheduled_at,
    duration_minutes: 60,
    status:           normalizeTrainingStatus(plan.status),
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

  type TodaySessionPlanRow = {
    id: string;
    scheduled_at: string;
    status: string;
    trainer_note: string | null;
    session_name: string | null;
    session_type: string | null;
    template: { name: string | null; session_type: string | null } | Array<{ name: string | null; session_type: string | null }> | null;
    trainer: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  };

  const plan = data as unknown as TodaySessionPlanRow;
  const template = firstRelation(plan.template);
  const trainer = firstRelation(plan.trainer);

  return {
    session_id:       plan.id,
    session_name:     plan.session_name        || template?.name         || 'Session',
    session_type:     plan.session_type        || template?.session_type || 'strength',
    trainer_name:     trainer?.full_name                   ?? 'Your trainer',
    scheduled_at:     plan.scheduled_at,
    duration_minutes: 60,
    status:           normalizeTrainingStatus(plan.status),
    trainer_note:     plan.trainer_note ?? undefined,
  };
};

// ─── Sessions Table Queries ───────────────────────────────────────────────────

/**
 * Fetch today's scheduled session for a client from the sessions table.
 * Joins profiles to get trainer_name.
 * Returns null if no session is scheduled today or on error.
 */
export const getTodaySession = async (clientId: string): Promise<ClientSession | null> => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      scheduled_at,
      session_type,
      duration_minutes,
      meeting_url,
      location,
      status,
      trainer_note,
      trainer:profiles!sessions_trainer_id_fkey ( full_name )
    `)
    .eq('client_id', clientId)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', `${today}T23:59:59`)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('getTodaySession:', error); return null; }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    scheduled_at: string;
    session_type: string;
    duration_minutes: number;
    meeting_url: string | null;
    location: string | null;
    status: string;
    trainer_note: string | null;
    trainer: { full_name: string } | null;
  };

  return {
    id:               row.id,
    scheduled_at:     row.scheduled_at,
    session_type:     row.session_type,
    duration_minutes: row.duration_minutes,
    meeting_url:      row.meeting_url ?? null,
    location:         row.location ?? null,
    status:           row.status,
    trainer_note:     row.trainer_note ?? null,
    trainer_name:     row.trainer?.full_name ?? 'Your trainer',
  };
};

/**
 * Fetch a single session by ID from the sessions table.
 * Joins profiles to get trainer_name.
 * Returns null if not found or on error.
 */
export const getSessionDetail = async (sessionId: string): Promise<ClientSession | null> => {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      scheduled_at,
      session_type,
      duration_minutes,
      meeting_url,
      location,
      status,
      trainer_note,
      trainer:profiles!sessions_trainer_id_fkey ( full_name )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) { console.error('getSessionDetail:', error); return null; }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    scheduled_at: string;
    session_type: string;
    duration_minutes: number;
    meeting_url: string | null;
    location: string | null;
    status: string;
    trainer_note: string | null;
    trainer: { full_name: string } | null;
  };

  return {
    id:               row.id,
    scheduled_at:     row.scheduled_at,
    session_type:     row.session_type,
    duration_minutes: row.duration_minutes,
    meeting_url:      row.meeting_url ?? null,
    location:         row.location ?? null,
    status:           row.status,
    trainer_note:     row.trainer_note ?? null,
    trainer_name:     row.trainer?.full_name ?? 'Your trainer',
  };
};

/**
 * Fetch all upcoming sessions (scheduled + cancelled) for a client.
 * Returns sessions from now onwards, ordered by scheduled_at ASC, capped at 10.
 * Returns [] if none found or on error.
 */
export const getUpcomingSessions = async (clientId: string): Promise<ClientSession[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      scheduled_at,
      session_type,
      duration_minutes,
      meeting_url,
      location,
      status,
      trainer_note,
      trainer:profiles!sessions_trainer_id_fkey ( full_name )
    `)
    .eq('client_id', clientId)
    .gte('scheduled_at', now)
    .in('status', ['scheduled', 'cancelled'])
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) { console.error('getUpcomingSessions:', error); return []; }
  if (!data) return [];

  type RawRow = {
    id: string;
    scheduled_at: string;
    session_type: string;
    duration_minutes: number;
    meeting_url: string | null;
    location: string | null;
    status: string;
    trainer_note: string | null;
    trainer: { full_name: string } | null;
  };

  return (data as unknown as RawRow[]).map(row => ({
    id:               row.id,
    scheduled_at:     row.scheduled_at,
    session_type:     row.session_type,
    duration_minutes: row.duration_minutes,
    meeting_url:      row.meeting_url ?? null,
    location:         row.location ?? null,
    status:           row.status,
    trainer_note:     row.trainer_note ?? null,
    trainer_name:     row.trainer?.full_name ?? 'Your trainer',
  }));
};

/**
 * Soft-cancel a session owned by the given trainer.
 * Sets status = 'cancelled' — never hard-deletes the row.
 * Throws if the session is not found or the trainer does not own it.
 * Also inserts a non-fatal client notification.
 */
export const cancelSession = async (
  sessionId: string,
  trainerId: string,
  clientId: string,
): Promise<void> => {
  // Step A — update status; .select() lets us detect a 0-row match
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)
    .eq('trainer_id', trainerId)
    .select();

  if (error) { console.error('cancelSession:', error); throw error; }
  if (!data || data.length === 0) {
    throw new Error('Session not found or unauthorized');
  }

  // Step B — notify client (non-fatal)
  try {
    await supabase.from('notifications').insert({
      type:         'session_cancelled',
      from_user_id: trainerId,
      to_user_id:   clientId,
      message:      'Your session has been cancelled by your trainer',
      is_read:      false,
    });
  } catch {
    console.warn('cancelSession: notification insert failed — non-fatal');
  }
};


// ─── Client Adherence (last 30 days vs prior 30 days) ────────────────────────

/**
 * Compute a 0–100 adherence score from a set of session rows.
 *
 * Definitions:
 *   planned   = sessions in window with status in (completed, cancelled, scheduled)
 *               whose date has already passed.
 *   completed = sessions in window with status = 'completed'.
 *   score     = round(completed / planned * 100), capped at 100.
 *
 * Returns null when planned === 0 — i.e. no sessions were expected in the
 * window, so adherence is undefined rather than "0%". Never fakes a number.
 */
const ADHERENCE_PLANNED_STATUSES = ['completed', 'cancelled', 'scheduled'] as const;

function calculateAdherenceScore(rows: { status: string }[]): number | null {
  const planned = rows.filter(r =>
    (ADHERENCE_PLANNED_STATUSES as readonly string[]).includes(r.status),
  ).length;
  if (planned === 0) return null;
  const completed = rows.filter(r => r.status === 'completed').length;
  return Math.min(100, Math.round((completed / planned) * 100));
}

export interface ClientAdherenceResult {
  currentScore: number | null;
  previousScore: number | null;
  delta: number | null;
}

/**
 * Calculate client adherence % for the last 30 days and the prior 30 days.
 *
 * Window definitions (NOW() = the current moment at request time):
 *   current  = [NOW() - 30d,  NOW()]
 *   previous = [NOW() - 60d,  NOW() - 30d)
 *
 * Both queries are scoped by trainer_id so a trainer can never read another
 * trainer's session counts for the same client (cross-tenant guard).
 *
 * Returns all-null on any DB error — never throws, never returns a mock 0.
 */
export const getClientAdherence = async (
  clientId: string,
  trainerId: string,
): Promise<ClientAdherenceResult> => {
  try {
    const now           = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso        = now.toISOString();

    const [currentRes, previousRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('status')
        .eq('client_id', clientId)
        .eq('trainer_id', trainerId)
        .gte('scheduled_at', thirtyDaysAgo)
        .lte('scheduled_at', nowIso),
      supabase
        .from('sessions')
        .select('status')
        .eq('client_id', clientId)
        .eq('trainer_id', trainerId)
        .gte('scheduled_at', sixtyDaysAgo)
        .lt('scheduled_at', thirtyDaysAgo),
    ]);

    if (currentRes.error)  { console.error('getClientAdherence (current):',  currentRes.error);  return { currentScore: null, previousScore: null, delta: null }; }
    if (previousRes.error) { console.error('getClientAdherence (previous):', previousRes.error); return { currentScore: null, previousScore: null, delta: null }; }

    const currentRows  = (currentRes.data  ?? []) as { status: string }[];
    const previousRows = (previousRes.data ?? []) as { status: string }[];

    const currentScore  = calculateAdherenceScore(currentRows);
    const previousScore = calculateAdherenceScore(previousRows);
    const delta = (currentScore !== null && previousScore !== null)
      ? currentScore - previousScore
      : null;

    return { currentScore, previousScore, delta };
  } catch (err) {
    console.error('getClientAdherence:', err);
    return { currentScore: null, previousScore: null, delta: null };
  }
};

/**
 * Fetch a trainer's sessions for a specific client, most recent first.
 * Covers all statuses — caller can filter by status if needed.
 */
export const getClientSessions = async (
  clientId: string,
  trainerId: string,
): Promise<TrainerClientSession[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, duration_minutes, status, meeting_url, location, trainer_note')
    .eq('client_id', clientId)
    .eq('trainer_id', trainerId)
    .gte('scheduled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) { console.error('getClientSessions:', error); return []; }
  if (!data)  return [];

  return (data as TrainerClientSession[]).map(row => ({
    id:               row.id,
    scheduled_at:     row.scheduled_at,
    session_type:     row.session_type,
    duration_minutes: row.duration_minutes,
    status:           row.status,
    meeting_url:      row.meeting_url ?? null,
    location:         row.location ?? null,
    trainer_note:     row.trainer_note ?? null,
  }));
};

/**
 * Update (or clear) the trainer's note on a single session.
 * Trainer ownership is enforced via the trainer_id predicate.
 * Throws if Supabase returns an error or no row was updated.
 */
export const updateSessionNote = async (
  sessionId: string,
  trainerId: string,
  note: string | null,
): Promise<void> => {
  const { data, error } = await supabase
    .from('sessions')
    .update({ trainer_note: note })
    .eq('id', sessionId)
    .eq('trainer_id', trainerId)
    .select();

  if (error) { console.error('updateSessionNote:', error); throw error; }
  if (!data || data.length === 0) {
    throw new Error('Session not found or unauthorized');
  }
};

// ─── Client Profile (Health Profile Screen) ───────────────────────────────────

export interface ClientProfileData {
  // Every field is optional: callers (client onboarding vs assessor form)
  // supply only the fields they own. Fields left `undefined` are NOT written,
  // so one screen never wipes values owned by the other. `bmi` is a generated
  // column and is never written here.
  dob?:                 string | null;
  gender?:              string | null;
  height_cm?:           number | null;
  weight_kg?:           number | null;
  medical_conditions?:  string[];
  activity_level?:      number | null;
  fitness_level?:       string | null;
  goals?:               string[];
  training_preferences?: import('../types').TrainingPreferences | null;
  // Assessment-team structured fields (Sections C–H)
  injuries?:                    string[];
  rehab_required?:              boolean;
  medical_certified_required?:  boolean;
  doctor_clearance?:            boolean;
  trainer_gender_pref?:         string | null;
  trainer_languages?:           string[];
  trainer_experience_pref?:     string | null;
  coaching_style_pref?:         string | null;
  session_intensity_pref?:      string | null;
  weekly_frequency?:            string | null;
  preferred_days?:              string[];
  preferred_times?:             string[];
  equipment_available?:         string[];
  sleep_quality?:               string | null;
  stress_level?:                string | null;
  motivation_level?:            string | null;
  assessment_notes?:            string | null;
}

/**
 * Upsert client_profiles fields. Uses user_id as the conflict key so
 * re-submitting updates in place. Only the keys present on `data` are written
 * (undefined keys are skipped), letting the client and assessor screens each
 * own their slice of the row. Also keeps profiles.city in sync.
 */
export const upsertClientProfile = async (
  userId: string,
  data: ClientProfileData,
  city: string | null,
): Promise<{ ok: boolean; errorMessage?: string }> => {
  // 1. Check if a row already exists for this user
  const { data: existing, error: fetchError } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('upsertClientProfile (fetch):', fetchError);
    return { ok: false, errorMessage: `Fetch error: ${fetchError.message}` };
  }

  // Build the payload from only the fields the caller supplied.
  const payload: Record<string, unknown> = {
    user_id:    userId,
    updated_at: new Date().toISOString(),
  };
  const assign = <K extends keyof ClientProfileData>(key: K, col: string) => {
    if (data[key] !== undefined) payload[col] = data[key];
  };
  assign('dob', 'dob');
  assign('gender', 'gender');
  assign('height_cm', 'height_cm');
  assign('weight_kg', 'weight_kg');
  assign('medical_conditions', 'medical_conditions');
  assign('activity_level', 'activity_level');
  assign('fitness_level', 'fitness_level');
  assign('goals', 'goals');
  assign('training_preferences', 'training_preferences');
  assign('injuries', 'injuries');
  assign('rehab_required', 'rehab_required');
  assign('medical_certified_required', 'medical_certified_required');
  assign('doctor_clearance', 'doctor_clearance');
  assign('trainer_gender_pref', 'trainer_gender_pref');
  assign('trainer_languages', 'trainer_languages');
  assign('trainer_experience_pref', 'trainer_experience_pref');
  assign('coaching_style_pref', 'coaching_style_pref');
  assign('session_intensity_pref', 'session_intensity_pref');
  assign('weekly_frequency', 'weekly_frequency');
  assign('preferred_days', 'preferred_days');
  assign('preferred_times', 'preferred_times');
  assign('equipment_available', 'equipment_available');
  assign('sleep_quality', 'sleep_quality');
  assign('stress_level', 'stress_level');
  assign('motivation_level', 'motivation_level');
  assign('assessment_notes', 'assessment_notes');

  // 2. Insert or update depending on whether a row exists
  const { error: cpError } = existing
    ? await supabase.from('client_profiles').update(payload).eq('user_id', userId)
    : await supabase.from('client_profiles').insert(payload);

  if (cpError) {
    console.error('upsertClientProfile error code:', cpError.code, 'message:', cpError.message);
    return { ok: false, errorMessage: `Save error [${cpError.code}]: ${cpError.message}` };
  }

  // 3. Keep profiles.city in sync (city lives in the main profiles table)
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

  return { ok: true };
};

// ─── Trainer Recommendations (TrainersScreen — My Trainer tab) ────────────────

/** Maps client goal labels to trainer specialty labels */
const GOAL_TO_SPECIALTY: Record<string, string> = {
  'General fitness':  'Functional Fitness',
  'Fat loss':         'Cardio',
  'Muscle gain':      'Strength Training',
  'Strength':         'Strength Training',
  'Flexibility':      'Yoga',
  'Stress relief':    'Yoga',
  'Rehabilitation':   'Rehabilitation',
  'Weight Loss':      'Cardio',
};

/**
 * Returns recommended trainers for a client based on their city and goals.
 * Matching is done in JavaScript to avoid Supabase array-overlap reliability issues.
 * Excludes trainers already linked to the client.
 */
export const getRecommendedTrainers = async (clientId: string): Promise<TrainerProfile[]> => {
  // 1. Fetch client city from profiles
  const { data: profileRow, error: profileErr } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', clientId)
    .maybeSingle();

  if (profileErr) {
    console.error('getRecommendedTrainers (client city):', profileErr);
    return [];
  }

  const clientCity: string | null = profileRow?.city ?? null;

  // 2. Fetch client goals from client_profiles (NOT profiles.specialties)
  const { data: cpRow, error: cpErr } = await supabase
    .from('client_profiles')
    .select('goals')
    .eq('user_id', clientId)
    .maybeSingle();

  if (cpErr) {
    console.error('getRecommendedTrainers (client goals):', cpErr);
    return [];
  }

  const rawGoals: string[] = cpRow?.goals ?? [];

  // 3. Map client goals → trainer specialty labels
  const mappedGoals: string[] = rawGoals.map(g => GOAL_TO_SPECIALTY[g] ?? g);

  // 4. If neither city nor goals exist, return empty
  if (!clientCity && mappedGoals.length === 0) return [];

  // 5. Fetch all trainer profiles
  const { data: trainers, error: trainersErr } = await supabase
    .from('profiles')
    .select('id, full_name, city, specialties, rating, photo_url')
    .eq('role', 'trainer');

  if (trainersErr) {
    console.error('getRecommendedTrainers (trainers):', trainersErr);
    return [];
  }

  // 6. Fetch already-linked trainer IDs for this client
  const { data: links, error: linksErr } = await supabase
    .from('trainer_client_links')
    .select('trainer_id')
    .eq('client_id', clientId);

  if (linksErr) {
    console.error('getRecommendedTrainers (links):', linksErr);
    return [];
  }

  const linkedIds = new Set((links ?? []).map((l: { trainer_id: string }) => l.trainer_id));

  // 7. Filter in JavaScript: city match is required when client has a city.
  //    Specialty overlap refines within the city — it never pulls in trainers
  //    from a different city. If the client has no city, fall back to
  //    specialty-only matching.
  const results = (trainers ?? []).filter((t: { id: string; city: string | null; specialties: string[] | null }) => {
    if (linkedIds.has(t.id)) return false;

    if (clientCity) {
      // Client has a city → trainer must be in the same city
      if (t.city !== clientCity) return false;
      // Within that city: show all local trainers, or refine by specialty if
      // the client has goals (specialty match is a bonus, not a gate)
      if (mappedGoals.length === 0) return true;
      return (t.specialties ?? []).some((s: string) => mappedGoals.includes(s));
    } else {
      // Client has no city → fall back to specialty-only match
      return (
        mappedGoals.length > 0 &&
        (t.specialties ?? []).some((s: string) => mappedGoals.includes(s))
      );
    }
  });

  // 8. Return typed TrainerProfile[]
  return results.map((t: {
    id: string;
    full_name: string;
    city: string | null;
    specialties: string[] | null;
    rating: number | null;
    photo_url: string | null;
  }): TrainerProfile => ({
    id:               t.id,
    full_name:        t.full_name,
    city:             t.city ?? null,
    specialties:      t.specialties ?? null,
    certifications:   null,
    bio:              null,
    availability:     null,
    experience_years: null,
    session_count:    null,
    rating:           t.rating ?? null,
    avatar_url:       null,
    photo_url:        t.photo_url ?? null,
  }));
};

// ─── Trainer Profile Completeness Check ──────────────────────────────────────

/**
 * Returns true when the trainer's matching-relevant data is incomplete.
 * The matching engine scores trainers using workout_templates.goals and
 * workout_templates.focus_areas.  If a trainer has NO templates, or every
 * template has empty goals AND empty focus_areas, we consider the profile
 * incomplete and surface a banner prompting them to fill it in.
 */
export const isTrainerProfileIncomplete = async (
  trainerId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('goals, focus_areas')
    .eq('trainer_id', trainerId);

  if (error) {
    console.error('isTrainerProfileIncomplete:', error);
    // Default to "not incomplete" so we don't nag on transient errors
    return false;
  }

  // No templates at all → incomplete
  if (!data || data.length === 0) return true;

  // Every template has empty goals AND empty focus_areas → incomplete
  const allEmpty = data.every(
    (t) =>
      (!t.goals || t.goals.length === 0) &&
      (!t.focus_areas || t.focus_areas.length === 0),
  );
  return allEmpty;
};

// ─── Assessment-driven Trainer Matching (Assessment App) ─────────────────────

/**
 * Score every active trainer against a client's closed-ended training
 * preferences (client_profiles.training_preferences). Used by the Assessment
 * App to surface auto-suggestions to the assessor. Returns only trainers with
 * a positive score, highest first, each with a short human-readable reason.
 *
 * Note: kept distinct from getRecommendedTrainers (city/goal matcher used by
 * the client My Trainer tab) so neither flow affects the other.
 */
export const getScoredTrainerRecommendations = async (
  clientId: string,
): Promise<{ trainer: TrainerProfile; score: number; reason: string }[]> => {
  // Client preferences
  const { data: cp } = await supabase
    .from('client_profiles')
    .select('training_preferences, fitness_level, medical_conditions')
    .eq('user_id', clientId)
    .maybeSingle();

  const prefs = (cp?.training_preferences ?? null) as import('../types').TrainingPreferences | null;
  if (!prefs) return [];

  // All active trainers with their templates
  const { data: trainers, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, bio, rating, certifications, availability,
      specialties, city,
      workout_templates(goals, focus_areas, session_type)
    `)
    .eq('role', 'trainer')
    .eq('is_active', true);

  if (error) {
    console.error('getScoredTrainerRecommendations (trainers):', error);
    return [];
  }
  if (!trainers) return [];

  type TrainerRow = {
    id: string;
    full_name: string;
    bio: string | null;
    rating: number | null;
    certifications: string[] | null;
    availability: TrainerProfile['availability'];
    specialties: string[] | null;
    city: string | null;
    workout_templates: { goals: string[] | null; focus_areas: string[] | null; session_type: string | null }[] | null;
  };

  const scored = (trainers as unknown as TrainerRow[]).map((t) => {
    let score = 0;
    const reasons: string[] = [];
    const templates = t.workout_templates ?? [];

    const trainerGoals = templates.flatMap(tpl => tpl.goals ?? []);
    const trainerFocus = [
      ...templates.flatMap(tpl => tpl.focus_areas ?? []),
      ...(t.specialties ?? []),
    ];
    const sessionTypes = templates.map(tpl => tpl.session_type).filter(Boolean) as string[];

    // Training styles (+3 focus match, +2 goal match)
    if (prefs.training_styles) {
      prefs.training_styles.forEach(style => {
        const styleLC = style.toLowerCase();
        if (trainerFocus.some(f => f.toLowerCase().includes(styleLC) || styleLC.includes(f.toLowerCase()))) {
          score += 3;
          reasons.push(`Specializes in ${style}`);
        }
        if (trainerGoals.some(g => g.toLowerCase().includes(styleLC))) score += 2;
      });
    }

    // Session preference (+2 exact, +1 flexible)
    if (prefs.session_preference) {
      if (prefs.session_preference === 'Online (Video)' && sessionTypes.includes('video')) {
        score += 2;
        reasons.push('Offers online sessions');
      }
      if (prefs.session_preference === 'In-Person' && sessionTypes.includes('in-person')) {
        score += 2;
        reasons.push('Offers in-person sessions');
      }
      if (prefs.session_preference === 'Either works') score += 1;
    }

    // Injury — specialist match (+4)
    if (prefs.injury_level === 'Significant - needs specialist') {
      if (trainerFocus.some(f => f.toLowerCase().includes('rehab') || f.toLowerCase().includes('recovery'))) {
        score += 4;
        reasons.push('Rehab / recovery specialist');
      }
    }

    // Rating bonus (+1 per star above 4.0)
    if (t.rating && Number(t.rating) > 4.0) {
      score += Math.floor(Number(t.rating) - 4.0);
      if (reasons.length === 0) reasons.push(`Highly rated (${Number(t.rating).toFixed(1)}★)`);
    }

    const trainer: TrainerProfile = {
      id:               t.id,
      full_name:        t.full_name,
      city:             t.city ?? null,
      specialties:      t.specialties ?? null,
      certifications:   t.certifications ?? null,
      bio:              t.bio ?? null,
      availability:     t.availability ?? null,
      experience_years: null,
      session_count:    null,
      rating:           t.rating ?? null,
      avatar_url:       null,
      photo_url:        null,
    };

    return { trainer, score, reason: reasons[0] ?? 'Matches client preferences' };
  });

  return scored
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);
};

/**
 * Returns the trainer IDs recommended by the assessment team for a client,
 * ordered by display_order. Joins through assessments to scope by client.
 */
export async function getAssessmentRecommendations(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('assessment_trainer_recommendations')
    .select('trainer_id, display_order, assessments!inner(client_id)')
    .eq('assessments.client_id', clientId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('getAssessmentRecommendations:', error);
    return [];
  }
  return (data ?? []).map((r: { trainer_id: string }) => r.trainer_id);
}

/**
 * Replace the assessment team's trainer recommendations for an assessment.
 * Deletes existing rows then inserts the new ordered selection (max handled
 * by the caller). Returns false on insert error.
 */
export async function saveAssessmentRecommendations(
  assessmentId: string,
  trainerIds: string[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from('assessment_trainer_recommendations')
    .delete()
    .eq('assessment_id', assessmentId);

  if (deleteError) {
    console.error('saveAssessmentRecommendations (delete):', deleteError);
    return false;
  }

  if (trainerIds.length === 0) return true;

  const { error } = await supabase
    .from('assessment_trainer_recommendations')
    .insert(trainerIds.map((id, i) => ({
      assessment_id: assessmentId,
      trainer_id:    id,
      display_order: i + 1,
    })));

  if (error) {
    console.error('saveAssessmentRecommendations (insert):', error);
    return false;
  }
  return true;
}

// ─── Weighted Recommendation Engine ──────────────────────────────────────────

/**
 * Production-grade weighted scoring engine that evaluates every active trainer
 * against a client's full assessment profile. Applies hard filters first
 * (rehab/medical certification, session mode, language, capacity), then scores
 * across 8 weighted dimensions (100 pts max). Results are persisted to the
 * trainer_recommendations table for the client Discover tab.
 */
export async function runRecommendationEngine(
  clientId: string,
): Promise<boolean> {
  // 1. Fetch client data
  const { data: cp } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', clientId)
    .maybeSingle();

  const prefs = ((cp as Record<string, unknown>)?.training_preferences ?? {}) as Record<string, unknown>;

  // 2. Fetch all active trainers with their templates
  const { data: trainers } = await supabase
    .from('profiles')
    .select(`
      *, workout_templates(goals, focus_areas, session_type)
    `)
    .eq('role', 'trainer')
    .eq('is_active', true);

  if (!trainers || !cp) return false;

  const results: {
    trainerId: string;
    score: number;
    breakdown: Record<string, number>;
    reasons: string[];
    passed: boolean;
  }[] = [];

  for (const trainer of trainers as Record<string, unknown>[]) {
    const breakdown: Record<string, number> = {};
    const reasons: string[] = [];
    let passed = true;

    // ── HARD FILTERS ──────────────────────────────────

    // Filter: rehab requirement
    if ((cp as Record<string, unknown>).rehab_required && !(trainer as Record<string, unknown>).rehab_certified) {
      passed = false;
    }

    // Filter: medical certified requirement
    if ((cp as Record<string, unknown>).medical_certified_required && !(trainer as Record<string, unknown>).medical_certified) {
      passed = false;
    }

    // Filter: session mode
    const sessionMode = prefs.session_mode as string | undefined;
    const trainerSessionTypes = (trainer.session_types as string[] | null) ?? [];
    if (sessionMode && sessionMode !== 'Either' && trainerSessionTypes.length > 0) {
      const modeMap: Record<string, string> = {
        'Online': 'video', 'Offline': 'in-person', 'Hybrid': 'hybrid',
      };
      const required = modeMap[sessionMode];
      if (required && !trainerSessionTypes.includes(required) &&
          !trainerSessionTypes.includes('hybrid')) {
        passed = false;
      }
    }

    // Filter: language preference
    const clientLangs = ((cp as Record<string, unknown>).trainer_languages as string[] | null) ?? [];
    const trainerLangs = (trainer.languages as string[] | null) ?? [];
    if (clientLangs.length > 0 && trainerLangs.length > 0) {
      const hasLanguage = clientLangs.some((l: string) => trainerLangs.includes(l));
      if (!hasLanguage) passed = false;
    }

    // Filter: capacity check
    const currentClients = (trainer.session_count as number | null) ?? 0;
    const maxClients = (trainer.max_clients as number | null) ?? 20;
    if (currentClients >= maxClients) passed = false;

    if (!passed) {
      results.push({ trainerId: trainer.id as string, score: 0, breakdown: {}, reasons: [], passed: false });
      continue;
    }

    // ── WEIGHTED SCORING ──────────────────────────────

    const templates = (trainer.workout_templates as { goals: string[] | null; focus_areas: string[] | null; session_type: string | null }[] | null) ?? [];
    const trainerGoals = templates.flatMap(t => t.goals ?? []).map(g => g.toLowerCase());
    const trainerFocus = [
      ...((trainer.focus_areas as string[] | null) ?? []),
      ...templates.flatMap(t => t.focus_areas ?? []),
    ].map(f => f.toLowerCase());

    // 1. Fitness Goal Match — 25 points
    let goalScore = 0;
    const clientGoals = ((cp as Record<string, unknown>).goals as string[] | null) ?? [];
    clientGoals.forEach((goal: string) => {
      const g = goal.toLowerCase();
      if (trainerGoals.some(tg => tg.includes(g) || g.includes(tg))) goalScore += 8;
      if (trainerFocus.some(tf => tf.includes(g) || g.includes(tf))) goalScore += 5;
    });
    goalScore = Math.min(goalScore, 25);
    breakdown['goal_match'] = goalScore;
    if (goalScore >= 15) reasons.push('Strong goal alignment');

    // 2. Workout Style Match — 20 points
    let styleScore = 0;
    const styles = (prefs.training_styles as string[] | null) ?? [];
    const trainerSpecialties = (trainer.specialties as string[] | null) ?? [];
    styles.forEach((style: string) => {
      const s = style.toLowerCase();
      if (trainerSpecialties.some(sp => sp.toLowerCase().includes(s) || s.includes(sp.toLowerCase()))) styleScore += 7;
      if (trainerFocus.some(tf => tf.includes(s))) styleScore += 5;
    });
    styleScore = Math.min(styleScore, 20);
    breakdown['style_match'] = styleScore;
    if (styleScore >= 12) reasons.push(`Specialises in ${styles.slice(0, 2).join(', ')}`);

    // 3. Medical/Rehab Expertise — 20 points
    let medScore = 0;
    if ((cp as Record<string, unknown>).rehab_required && trainer.rehab_certified) {
      medScore += 20;
      reasons.push('Rehabilitation certified');
    }
    if ((cp as Record<string, unknown>).medical_certified_required && trainer.medical_certified) {
      medScore += 15;
      reasons.push('Medical fitness certified');
    }
    const clientConditions = ((cp as Record<string, unknown>).medical_conditions as string[] | null) ?? [];
    if (clientConditions.length > 0) {
      if (trainer.medical_certified) medScore += 10;
      if (trainerFocus.some(tf => tf.includes('medical') || tf.includes('condition'))) medScore += 5;
    }
    medScore = Math.min(medScore, 20);
    breakdown['medical_match'] = medScore;

    // 4. Fitness Level Match — 10 points
    let levelScore = 0;
    const clientLevel = ((cp as Record<string, unknown>).fitness_level as string | null)?.toLowerCase();
    if (clientLevel === 'beginner' && trainerFocus.some(tf => tf.includes('beginner'))) {
      levelScore = 10;
      reasons.push('Great for beginners');
    } else if (clientLevel === 'advanced' && ((trainer.experience_years as number | null) ?? 0) >= 5) {
      levelScore = 10;
    } else {
      levelScore = 5;
    }
    breakdown['level_match'] = levelScore;

    // 5. Availability Match — 10 points
    let availScore = 0;
    const clientTimes = ((cp as Record<string, unknown>).preferred_times as string[] | null) ??
                        (prefs.preferred_times as string[] | null) ?? [];
    const trainerAvail = (trainer.availability as Record<string, unknown> | null) ?? {};
    if (clientTimes.length > 0 && Object.keys(trainerAvail).length > 0) {
      const timeMap: Record<string, string[]> = {
        'Early Morning': ['5am', '6am', '7am'],
        'Morning': ['8am', '9am', '10am', '11am'],
        'Afternoon': ['12pm', '1pm', '2pm', '3pm'],
        'Evening': ['4pm', '5pm', '6pm', '7pm'],
        'Night': ['8pm', '9pm', '10pm'],
      };
      const hasOverlap = clientTimes.some((t: string) => {
        return Object.values(trainerAvail).some((slots: unknown) =>
          Array.isArray(slots) && (timeMap[t] ?? []).some(tm =>
            (slots as string[]).some((s: string) => s.toLowerCase().includes(tm))));
      });
      availScore = hasOverlap ? 10 : 3;
      if (hasOverlap) reasons.push('Availability matches your schedule');
    } else {
      availScore = 5;
    }
    breakdown['availability_match'] = availScore;

    // 6. Trainer Rating — 5 points
    const ratingScore = Math.min(Math.round((((trainer.rating as number | null) ?? 3) / 5) * 5), 5);
    breakdown['rating'] = ratingScore;
    if (((trainer.rating as number | null) ?? 0) >= 4.5) reasons.push('Highly rated trainer');

    // 7. Session Intensity Match — 5 points
    let intensityScore = 0;
    const clientIntensity = ((cp as Record<string, unknown>).session_intensity_pref as string | null) ??
                            (prefs.preferred_intensity as string | null);
    const trainerIntensity = trainer.session_intensity as string | null;
    if (clientIntensity && trainerIntensity) {
      intensityScore = clientIntensity.toLowerCase() === trainerIntensity.toLowerCase() ? 5 : 2;
    } else {
      intensityScore = 3;
    }
    breakdown['intensity_match'] = intensityScore;

    // 8. Coaching Style Match — 5 points
    let coachingScore = 0;
    const clientStyle = ((cp as Record<string, unknown>).coaching_style_pref as string | null) ??
                        (prefs.preferred_coaching_style as string | null);
    const trainerStyles = (trainer.coaching_styles as string[] | null) ?? [];
    if (clientStyle && trainerStyles.length > 0) {
      coachingScore = trainerStyles.some((cs: string) =>
        cs.toLowerCase().includes(clientStyle.toLowerCase())) ? 5 : 1;
    } else {
      coachingScore = 3;
    }
    breakdown['coaching_match'] = coachingScore;

    const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

    results.push({
      trainerId: trainer.id as string,
      score: Math.round(totalScore),
      breakdown,
      reasons: reasons.slice(0, 3),
      passed: true,
    });
  }

  // Sort by score, apply minimum threshold with progressive fallback
  let qualified = results
    .filter(r => r.passed && r.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (qualified.length === 0) {
    qualified = results
      .filter(r => r.passed && r.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  if (qualified.length === 0) {
    qualified = results
      .filter(r => r.passed)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // Save to trainer_recommendations (engine type) — replace old results
  await supabase.from('trainer_recommendations')
    .delete()
    .eq('client_id', clientId)
    .eq('recommendation_type', 'engine');

  if (qualified.length > 0) {
    await supabase.from('trainer_recommendations').insert(
      qualified.map((r, i) => ({
        client_id: clientId,
        trainer_id: r.trainerId,
        recommendation_type: 'engine',
        score: r.score,
        score_breakdown: r.breakdown,
        recommendation_reasons: r.reasons,
        display_order: i + 1,
        is_active: true,
      })),
    );
  }

  return true;
}

/**
 * Trigger the recommendation engine after assessment clearance.
 * Called from the assessment form after a 'cleared' or 'conditional' decision.
 */
export async function triggerRecommendationsAfterAssessment(
  clientId: string,
): Promise<void> {
  await runRecommendationEngine(clientId);
}

/** Return type for client-facing Discover tab recommendation data. */
export interface ClientRecommendation {
  trainer_id: string;
  score: number;
  reasons: string[];
  trainer: TrainerProfile;
}

/**
 * Fetch engine + manual recommendations for the client Discover tab.
 * Engine recs come from trainer_recommendations; manual recs from
 * assessment_trainer_recommendations.
 */
export async function getClientRecommendations(clientId: string): Promise<{
  engineRecs: ClientRecommendation[];
  manualRecs: { trainer_id: string; trainer: TrainerProfile }[];
}> {
  // Engine recommendations
  const { data: engineData } = await supabase
    .from('trainer_recommendations')
    .select(`
      trainer_id, score, recommendation_reasons,
      trainer:profiles!trainer_recommendations_trainer_id_fkey(
        id, full_name, bio, rating, specialties, city, photo_url,
        certifications, experience_years
      )
    `)
    .eq('client_id', clientId)
    .eq('recommendation_type', 'engine')
    .eq('is_active', true)
    .order('display_order');

  // Manual (assessment team) recommendations — join through assessments
  const { data: manualData } = await supabase
    .from('assessment_trainer_recommendations')
    .select(`
      trainer_id, display_order,
      assessments!inner(client_id),
      trainer:profiles!assessment_trainer_recommendations_trainer_id_fkey(
        id, full_name, bio, rating, specialties, city, photo_url,
        certifications, experience_years
      )
    `)
    .eq('assessments.client_id', clientId)
    .order('display_order');

  const toProfile = (row: Record<string, unknown>): TrainerProfile => {
    const t = (Array.isArray(row) ? row[0] : row) as Record<string, unknown> | null;
    return {
      id:               (t?.id as string) ?? '',
      full_name:        (t?.full_name as string) ?? '',
      city:             (t?.city as string) ?? null,
      specialties:      (t?.specialties as string[]) ?? null,
      certifications:   (t?.certifications as string[]) ?? null,
      bio:              (t?.bio as string) ?? null,
      availability:     null,
      experience_years: (t?.experience_years as number) ?? null,
      session_count:    null,
      rating:           (t?.rating as number) ?? null,
      avatar_url:       null,
      photo_url:        (t?.photo_url as string) ?? null,
    };
  };

  return {
    engineRecs: (engineData ?? []).map((r: Record<string, unknown>) => ({
      trainer_id: r.trainer_id as string,
      score:   r.score as number,
      reasons: (r.recommendation_reasons as string[] | null) ?? [],
      trainer: toProfile(r.trainer as Record<string, unknown>),
    })),
    manualRecs: (manualData ?? []).map((r: Record<string, unknown>) => ({
      trainer_id: r.trainer_id as string,
      trainer:    toProfile(r.trainer as Record<string, unknown>),
    })),
  };
}

/**
 * Fetch pending trainer connection requests for a client.
 * Used by the "Requested" tab on the Trainers screen.
 */
export async function getClientPendingTrainerLinks(clientId: string): Promise<{
  trainer_id: string;
  trainer_name: string;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      trainer_id, created_at,
      trainer:profiles!trainer_client_links_trainer_id_fkey(full_name)
    `)
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getClientPendingTrainerLinks:', error);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => {
    const trainerRow = (Array.isArray(r.trainer) ? r.trainer[0] : r.trainer) as { full_name: string } | null;
    return {
      trainer_id:   r.trainer_id as string,
      trainer_name: trainerRow?.full_name ?? 'Trainer',
      created_at:   r.created_at as string,
    };
  });
}

// ─── Notifications & Messages (MVP) ──────────────────────────────────────────

/**
 * Check if the client has already sent an info_request to this trainer
 * within the last 24 hours.
 */
export const hasInfoRequestToday = async (
  clientId: string,
  trainerId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('from_user_id', clientId)
    .eq('to_user_id', trainerId)
    .eq('type', 'info_request')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('hasInfoRequestToday:', error);
    return false;
  }
  return data !== null;
};

/**
 * Send an info request from client to trainer.
 * Silently deduplicates within 24 hours.
 */
export const sendInfoRequest = async (
  clientId: string,
  trainerId: string,
): Promise<void> => {
  const alreadySent = await hasInfoRequestToday(clientId, trainerId);
  if (alreadySent) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      type: 'info_request',
      from_user_id: clientId,
      to_user_id: trainerId,
      message: null,
    });

  if (error) throw error;
};

export async function requestCallback(
  clientId: string,
  trainerId: string
): Promise<{ success: boolean; error?: string }> {
  // Get client profile to fetch name and phone
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone_number')
    .eq('id', clientId)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  const { data: requestData, error } = await supabase
    .from('callback_requests')
    .insert({
      client_id: clientId,
      trainer_id: trainerId,
      client_name: profile.full_name,
      client_phone: profile.phone_number,
      status: 'pending'
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  // Also create a notification for the trainer
  await supabase
    .from('notifications')
    .insert({
      to_user_id: trainerId,
      from_user_id: clientId,
      type: 'callback_request',
      message: JSON.stringify({ 
        request_id: requestData.id,
        phone: profile.phone_number 
      }),
      is_read: false
    });

  return { success: true };
}

export async function getCallbackRequests(
  trainerId: string
): Promise<{
  id: string;
  client_name: string;
  client_phone: string;
  status: string;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('callback_requests')
    .select('id, client_name, client_phone, status, created_at')
    .eq('trainer_id', trainerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateCallbackStatus(
  requestId: string,
  status: 'contacted' | 'resolved'
): Promise<boolean> {
  const { error } = await supabase
    .from('callback_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  return !error;
}

/**
 * Send a message from client to trainer.
 * Inserts into both messages and notifications tables atomically.
 */
export const sendMessage = async (
  clientId: string,
  trainerId: string,
  body: string,
): Promise<void> => {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 300) {
    throw new Error('Message must be 1–300 characters.');
  }

  const [msgResult, notifResult] = await Promise.all([
    supabase.from('messages').insert({
      from_user_id: clientId,
      to_user_id: trainerId,
      body: trimmed,
    }),
    supabase.from('notifications').insert({
      type: 'message',
      from_user_id: clientId,
      to_user_id: trainerId,
      message: trimmed.substring(0, 100),
    }),
  ]);

  if (msgResult.error) throw msgResult.error;
  if (notifResult.error) throw notifResult.error;
};

/**
 * Fetch all notifications addressed to this trainer, newest first.
 * Joins the sender's profile for display name, city, and avatar.
 */
export const getTrainerNotifications = async (
  trainerId: string,
): Promise<TrainerNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      message,
      is_read,
      created_at,
      sender:profiles!notifications_from_user_id_fkey (
        full_name,
        city,
        avatar_url
      )
    `)
    .eq('to_user_id', trainerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as {
      id: string;
      type: string;
      message: string | null;
      is_read: boolean;
      created_at: string;
      sender: { full_name: string; city: string | null; avatar_url: string | null } | null;
    };
    return {
      id: r.id,
      type: r.type,
      message: r.message,
      is_read: r.is_read,
      created_at: r.created_at,
      from_name: r.sender?.full_name ?? 'Unknown',
      from_city: r.sender?.city ?? null,
      from_avatar: r.sender?.avatar_url ?? null,
    };
  });
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (
  notificationId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

/**
 * Return the count of unread notifications for a trainer.
 * Used by TrainerDashboard bell badge.
 */
export const getUnreadNotificationCount = async (
  trainerId: string,
): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('to_user_id', trainerId)
    .eq('is_read', false);

  if (error) {
    console.error('getUnreadNotificationCount:', error);
    return 0;
  }
  return count ?? 0;
};

/**
 * Return the combined unread count for the client bell badge.
 * Counts unread risk_alerts + unread program/session notifications in parallel.
 * Returns 0 on any error — never throws.
 */
export const getClientUnreadCount = async (
  clientId: string,
): Promise<number> => {
  try {
    const [alertsRes, notifsRes] = await Promise.all([
      supabase
        .from('risk_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_read', false),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', clientId)
        .eq('is_read', false)
        .in('type', ['program_assigned', 'session_cancelled', 'session_scheduled', 'profile_updated', 'assessment_complete']),
    ]);

    if (alertsRes.error) console.error('getClientUnreadCount (alerts):', alertsRes.error);
    if (notifsRes.error) console.error('getClientUnreadCount (notifs):', notifsRes.error);

    const alertCount = alertsRes.count ?? 0;
    const notifCount = notifsRes.count ?? 0;
    return alertCount + notifCount;
  } catch (err) {
    console.error('getClientUnreadCount:', err);
    return 0;
  }
};

/**
 * Fetch a map of trainer_id → link status for a given client.
 * Used by the Discover tab to show connection status on cards.
 * Single query — not one per card.
 */
export const getClientLinkStatusMap = async (
  clientId: string,
): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select('trainer_id, status')
    .eq('client_id', clientId);

  if (error) {
    console.error('getClientLinkStatusMap:', error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { trainer_id: string; status: string }[]) {
    map[row.trainer_id] = row.status;
  }
  return map;
};

/** Returns a hardcoded expert-picked trainer list.
 *  TODO: Replace with assessment team API when available. */
export const getExpertPickedTrainers = async (): Promise<TrainerProfile[]> => {
  const mockExpertPicks: TrainerProfile[] = [
    {
      id:               'expert-mock-1',
      full_name:        'Dr. Priya Nair',
      city:             'Chennai',
      specialties:      ['Rehabilitation', 'Yoga'],
      certifications:   null,
      bio:              'Recommended by our assessment team for post-injury recovery.',
      availability:     null,
      experience_years: 12,
      session_count:    null,
      rating:           4.9,
      avatar_url:       null,
      photo_url:        null,
    },
    {
      id:               'expert-mock-2',
      full_name:        'Arjun Mehta',
      city:             'Bangalore',
      specialties:      ['Strength Training', 'Functional Fitness'],
      certifications:   null,
      bio:              'Expert pick for structured strength and conditioning programs.',
      availability:     null,
      experience_years: 9,
      session_count:    null,
      rating:           4.7,
      avatar_url:       null,
      photo_url:        null,
    },
  ];
  return Promise.resolve(mockExpertPicks);
};

// ─── Session Exercises + Mark Complete (Phase 4A) ─────────────────────────────


/**
 * Get exercises from the client's active workout plan.
 * Finds the most recent active/approved workout_plan, then fetches
 * planned_exercises from its template.
 * Returns [] if no plan found or on error.
 */
export async function getSessionExercises(
  clientId: string
): Promise<SessionExercise[]> {
  try {
    // Step A — find active workout plan for client.
    // pending_review is included until the Phase 4B client approval flow
    // exists — until then, a trainer-assigned program should be usable
    // immediately (exercises visible, sessions completable).
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select('id, template_id')
      .eq('client_id', clientId)
      .in('status', ['active', 'approved', 'pending_review'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error('getSessionExercises (plan):', planError);
      return [];
    }
    if (!plan || !plan.template_id) return [];

    // Step B — get exercises from template
    const { data: exercises, error: exError } = await supabase
      .from('planned_exercises')
      .select('id, name, sets, reps, rest_seconds, instructions, order_index')
      .eq('template_id', plan.template_id)
      .order('order_index', { ascending: true });

    if (exError) {
      console.error('getSessionExercises (exercises):', exError);
      return [];
    }

    return (exercises ?? []).map((row: {
      id: string;
      name: string;
      sets: number | null;
      reps: number | null;
      rest_seconds: number | null;
      instructions: string | null;
      order_index: number;
    }): SessionExercise => ({
      id: row.id,
      name: row.name,
      sets: row.sets ?? 0,
      reps: row.reps ?? 0,
      rest_seconds: row.rest_seconds,
      instructions: row.instructions,
      order_index: row.order_index,
    }));
  } catch (err) {
    console.error('getSessionExercises:', err);
    return [];
  }
}

/**
 * Get the active workout plan ID for a client.
 * Returns plan.id or null if none found or on error.
 */
export async function getActiveWorkoutPlanId(
  clientId: string
): Promise<string | null> {
  try {
    // pending_review included for parity with getSessionExercises — so
    // markSessionComplete can resolve plan_id before client approval flow
    // (Phase 4B) exists.
    const { data, error } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('client_id', clientId)
      .in('status', ['active', 'approved', 'pending_review'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getActiveWorkoutPlanId:', error);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error('getActiveWorkoutPlanId:', err);
    return null;
  }
}

/**
 * Returns true only if the client has a workout_plan with status = 'active'.
 * Used by the client HomeScreen to decide whether to show plan-progress UI —
 * brand-new clients with no assigned plan must not see another user's data.
 */
export async function hasActiveWorkoutPlan(
  clientId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('hasActiveWorkoutPlan:', error);
    return false;
  }
  return !!data;
}

// ─── HomeScreen Live Data: Meals, Check-in, Current Week ─────────────────────

/**
 * Count how many meal_logs the client has for today (UTC date boundary).
 * Also returns aggregated macros so the NutritionCard can show live data.
 * Returns { count: 0, nutrition: null } if no rows or on error.
 */
export const getClientTodayMealCount = async (
  userId: string,
): Promise<{
  count: number;
  nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
}> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('meal_logs')
    .select('total_calories, macros_json')
    .eq('user_id', userId)
    .gte('logged_at', `${today}T00:00:00`)
    .lte('logged_at', `${today}T23:59:59`);

  if (error) {
    console.error('getClientTodayMealCount:', error);
    return { count: 0, nutrition: null };
  }
  if (!data || data.length === 0) return { count: 0, nutrition: null };

  const nutrition = data.reduce(
    (acc, row) => {
      const macros = row.macros_json as { protein_g?: number; carbs_g?: number; fat_g?: number } | null;
      return {
        calories:  acc.calories  + (row.total_calories ?? 0),
        protein_g: acc.protein_g + (macros?.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + (macros?.carbs_g ?? 0),
        fat_g:     acc.fat_g     + (macros?.fat_g ?? 0),
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return { count: data.length, nutrition };
};

/**
 * Fetch today's daily_metrics row for a client.
 * Returns the number of tracked fields (non-null) and total trackable fields
 * so the HomeScreen can show "X of Y tracked".
 * Also returns whether a check-in exists at all (hasCheckin).
 */
export const getClientTodayCheckinStatus = async (
  userId: string,
): Promise<{
  hasCheckin: boolean;
  done: number;
  total: number;
}> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('sleep_hours, sleep_quality_score, mood_score, energy_score, water_glasses, workout_done, pain_score')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  if (error) {
    console.error('getClientTodayCheckinStatus:', error);
    return { hasCheckin: false, done: 0, total: 7 };
  }
  if (!data) return { hasCheckin: false, done: 0, total: 7 };

  // Count non-null / non-default tracked fields
  const fields = [
    data.sleep_hours,
    data.sleep_quality_score,
    data.mood_score,
    data.energy_score,
    data.water_glasses,
    data.workout_done !== null && data.workout_done !== undefined ? 1 : null,
    data.pain_score,
  ];
  const done = fields.filter(f => f !== null && f !== undefined).length;

  return { hasCheckin: true, done, total: 7 };
};

/**
 * Compute the current week number for a client's active workout plan.
 * Returns 1-indexed week based on plan start date vs today.
 * Returns null if no active plan exists.
 */
export const getClientCurrentWeek = async (
  clientId: string,
): Promise<number | null> => {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('created_at')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getClientCurrentWeek:', error);
    return null;
  }
  if (!data) return null;

  const startDate = new Date(data.created_at);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
};

export const getClientPlanInfo = async (
  clientId: string,
): Promise<{ currentWeek: number; totalWeeks: number } | null> => {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      created_at,
      workout_templates ( duration_weeks )
    `)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getClientPlanInfo:', error);
    return null;
  }
  if (!data) return null;

  const template = Array.isArray(data.workout_templates)
    ? data.workout_templates[0]
    : data.workout_templates;
  const totalWeeks = template?.duration_weeks ?? 12;

  const startDate = new Date(data.created_at);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
  if (currentWeek > totalWeeks) currentWeek = totalWeeks;

  return { currentWeek, totalWeeks };
};

/**
 * Mark a session as completed:
 * 1. Insert a workout_log record
 * 2. Update session status to 'completed'
 *
 * Both scoped by client_id — client can only complete their own sessions.
 * Throws on error so caller can handle.
 */
export async function markSessionComplete(
  sessionId: string,
  clientId: string,
  planId: string,
  clientNotes: string,
  completedBy: 'client' | 'trainer' = 'client'
): Promise<void> {
  try {
    // Step A — insert workout_log
    const { error: logError } = await supabase
      .from('workout_logs')
      .insert({
        plan_id: planId,
        client_id: clientId,
        completed_at: new Date().toISOString(),
        client_notes: clientNotes.trim() || null,
      });

    if (logError) {
      console.error('markSessionComplete (log):', logError);
      throw new Error(`Failed to create workout log: ${logError.message}`);
    }

    // Step B — update session status
    const { data, error: sessionError } = await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: completedBy,
        completion_notes: clientNotes.trim() || null
      })
      .eq('id', sessionId)
      .eq('client_id', clientId)
      .select();

    if (sessionError) {
      console.error('markSessionComplete (session):', sessionError);
      throw new Error(`Failed to update session: ${sessionError.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Session not found or unauthorized');
    }

    // Send notification to the other party
    const session = data[0];
    const trainerId = session.trainer_id;
    const isClient = completedBy === 'client';
    
    // Get sender info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', isClient ? clientId : trainerId)
      .maybeSingle();
      
    const senderName = profile?.full_name ?? 'Someone';

    try {
      await supabase.from('notifications').insert({
        type: 'session_completed',
        from_user_id: isClient ? clientId : trainerId,
        to_user_id: isClient ? trainerId : clientId,
        message: isClient 
          ? `${senderName} has marked today's session as complete.`
          : `${senderName} has marked your session as complete. Hope it was a great session! 💪`,
        is_read: false,
      });
    } catch (notifErr) {
      console.warn('markSessionComplete: notification insert failed (non-fatal):', notifErr);
    }
    
  } catch (err) {
    console.error('markSessionComplete:', err);
    throw err;
  }
}

// ─── Client Current Program (Trainer View) ────────────────────────────────────

export interface ClientCurrentProgram {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  duration_weeks: number | null;
  sessions_per_week: number | null;
}

/**
 * Fetch the most recent non-terminal workout plan for a client.
 * Used by ClientProgressView (trainer's view of a specific client).
 * Accepts any clientId — not restricted to the logged-in user.
 */
export async function getClientCurrentProgram(
  clientId: string,
): Promise<ClientCurrentProgram | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id,
      status,
      created_at,
      workout_templates ( name, duration_weeks, sessions_per_week )
    `)
    .eq('client_id', clientId)
    .in('status', ['active', 'approved', 'pending_review', 'changes_requested'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getClientCurrentProgram:', error);
    return null;
  }
  if (!data) return null;

  type PlanRow = {
    id: string;
    status: string;
    created_at: string;
    workout_templates:
      | { name: string; duration_weeks: number; sessions_per_week: number }
      | Array<{ name: string; duration_weeks: number; sessions_per_week: number }>
      | null;
  };

  const plan = data as unknown as PlanRow;
  const template = Array.isArray(plan.workout_templates)
    ? (plan.workout_templates[0] ?? null)
    : (plan.workout_templates ?? null);

  return {
    id: plan.id,
    name: template?.name ?? null,
    status: plan.status,
    created_at: plan.created_at,
    duration_weeks: template?.duration_weeks ?? null,
    sessions_per_week: template?.sessions_per_week ?? null,
  };
}

// ─── Weekly Check-in Summary (Trainer Dashboard strip) ────────────────────────

export interface WeeklyCheckinRow {
  log_date: string;
  client_id: string;
  client_name: string;
  readiness_score: number | null;
  workout_done: boolean;
}

/**
 * Fetch all check-ins logged by the trainer's active clients
 * from Monday of the current week onwards.
 * Returns [] (no error thrown) on failure so the dashboard strip degrades
 * gracefully to an empty state.
 */
export async function getWeeklyCheckinSummary(
  trainerId: string,
): Promise<{ data: WeeklyCheckinRow[]; error?: string }> {
  try {
    // Monday of current week (ISO date string)
    const now = new Date();
    const daysFromMonday = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];

    // Step 1 — active client IDs + names for this trainer
    const { data: links, error: linksError } = await supabase
      .from('trainer_client_links')
      .select(`
        client_id,
        client:profiles!trainer_client_links_client_id_fkey ( full_name )
      `)
      .eq('trainer_id', trainerId)
      .eq('status', 'active');

    if (linksError) {
      console.error('getWeeklyCheckinSummary (links):', linksError);
      return { data: [], error: linksError.message };
    }

    const linkRows = (links ?? []) as unknown as Array<{
      client_id: string;
      client: { full_name: string } | Array<{ full_name: string }> | null;
    }>;

    if (linkRows.length === 0) return { data: [] };

    const clientIds = linkRows.map(l => l.client_id);
    const nameMap: Record<string, string> = {};
    for (const link of linkRows) {
      const name = Array.isArray(link.client)
        ? (link.client[0]?.full_name ?? 'Unknown')
        : (link.client?.full_name ?? 'Unknown');
      nameMap[link.client_id] = name;
    }

    // Step 2 — check-ins from Monday of this week
    const { data: metrics, error: metricsError } = await supabase
      .from('daily_metrics')
      .select('log_date, user_id, readiness_score, workout_done')
      .in('user_id', clientIds)
      .gte('log_date', mondayStr)
      .order('log_date', { ascending: true })
      .order('user_id', { ascending: true });

    if (metricsError) {
      console.error('getWeeklyCheckinSummary (metrics):', metricsError);
      return { data: [], error: metricsError.message };
    }

    const data: WeeklyCheckinRow[] = ((metrics ?? []) as Array<{
      log_date: string;
      user_id: string;
      readiness_score: number | null;
      workout_done: boolean;
    }>).map(row => ({
      log_date:        row.log_date,
      client_id:       row.user_id,
      client_name:     nameMap[row.user_id] ?? 'Unknown',
      readiness_score: row.readiness_score,
      workout_done:    row.workout_done,
    }));

    return { data };
  } catch (err) {
    console.error('getWeeklyCheckinSummary:', err);
    return { data: [], error: String(err) };
  }
}

// ─── Daily Check-in Detail (DailyCheckinSummaryScreen) ────────────────────────

export interface DailyCheckinDetailRow {
  client_id: string;
  client_name: string;
  readiness_score: number | null;
  sleep_hours: number | null;
  energy_score: number | null;
  mood_score: number | null;
  workout_done: boolean;
}

/**
 * Fetch all check-ins logged by the trainer's active clients on a specific date.
 * Used by DailyCheckinSummaryScreen.
 */
export async function getDailyCheckinDetail(
  trainerId: string,
  date: string, // 'YYYY-MM-DD'
): Promise<{ data: DailyCheckinDetailRow[]; error?: string }> {
  try {
    // Active clients for this trainer
    const { data: links, error: linksError } = await supabase
      .from('trainer_client_links')
      .select(`
        client_id,
        client:profiles!trainer_client_links_client_id_fkey ( full_name )
      `)
      .eq('trainer_id', trainerId)
      .eq('status', 'active');

    if (linksError) {
      console.error('getDailyCheckinDetail (links):', linksError);
      return { data: [], error: linksError.message };
    }

    const linkRows = (links ?? []) as unknown as Array<{
      client_id: string;
      client: { full_name: string } | Array<{ full_name: string }> | null;
    }>;

    if (linkRows.length === 0) return { data: [] };

    const clientIds = linkRows.map(l => l.client_id);
    const nameMap: Record<string, string> = {};
    for (const link of linkRows) {
      const name = Array.isArray(link.client)
        ? (link.client[0]?.full_name ?? 'Unknown')
        : (link.client?.full_name ?? 'Unknown');
      nameMap[link.client_id] = name;
    }

    // Check-ins on the requested date
    const { data: metrics, error: metricsError } = await supabase
      .from('daily_metrics')
      .select('user_id, readiness_score, sleep_hours, energy_score, mood_score, workout_done')
      .in('user_id', clientIds)
      .eq('log_date', date)
      .order('user_id', { ascending: true });

    if (metricsError) {
      console.error('getDailyCheckinDetail (metrics):', metricsError);
      return { data: [], error: metricsError.message };
    }

    const data: DailyCheckinDetailRow[] = ((metrics ?? []) as Array<{
      user_id: string;
      readiness_score: number | null;
      sleep_hours: number | null;
      energy_score: number | null;
      mood_score: number | null;
      workout_done: boolean;
    }>).map(row => ({
      client_id:       row.user_id,
      client_name:     nameMap[row.user_id] ?? 'Unknown',
      readiness_score: row.readiness_score,
      sleep_hours:     row.sleep_hours,
      energy_score:    row.energy_score,
      mood_score:      row.mood_score,
      workout_done:    row.workout_done,
    }));

    return { data };
  } catch (err) {
    console.error('getDailyCheckinDetail:', err);
    return { data: [], error: String(err) };
  }
}

// ─── ASSESSMENT APP FUNCTIONS ─────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface Assessment {
  id: string;
  client_id: string;
  assessor_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'flagged';
  assessment_date: string | null;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  health_notes: string | null;
  trainer_recommendation: string | null;
  recommended_trainer_id: string | null;
  clearance_status: 'cleared' | 'conditional' | 'hold' | null;
  created_at: string;
  client_name?: string;
}

export interface TrainerApproval {
  id: string;
  trainer_id: string;
  trainer_name: string;
  assessor_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Escalation {
  id: string;
  client_id: string;
  client_name: string;
  raised_by: 'trainer' | 'client';
  source_alert_id: string | null;
  status: 'open' | 'reviewing' | 'resolved';
  assessor_id: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface AssessmentMessage {
  id: string;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  client_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface MonthlyReview {
  id: string;
  client_id: string;
  client_name: string;
  trainer_name: string | null;
  assessor_id: string;
  review_month: string;
  goal_alignment_score: number | null;
  notes: string | null;
  action_taken: 'message' | 'call' | 'none' | null;
  reviewed_at: string;
}

export interface AssessorNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

// ── Assessments ───────────────────────────────────────────────────────────────

export async function getNewClientQueue(
  _assessorId: string,
): Promise<{ data: Assessment[]; error?: string }> {
  // Shared queue: assessments are auto-created (unassigned) when a client saves
  // their health profile, so we show every pending / in-progress assessment to
  // the assessment team rather than filtering by a single assessor_id.
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id, client_id, assessor_id, status, assessment_date,
      fitness_level, health_notes, trainer_recommendation,
      recommended_trainer_id, clearance_status, created_at,
      client:profiles!assessments_client_id_fkey ( full_name )
    `)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getNewClientQueue:', error);
    return { data: [], error: error.message };
  }

  type AssessmentRow = Omit<Assessment, 'client_name'> & {
    client: { full_name: string } | Array<{ full_name: string }> | null;
  };

  const rows = (data ?? []) as unknown as AssessmentRow[];
  return {
    data: rows.map(row => ({
      ...row,
      client_name: Array.isArray(row.client)
        ? (row.client[0]?.full_name ?? 'Unknown')
        : (row.client?.full_name ?? 'Unknown'),
    })),
  };
}

export async function getClientAssessmentHistory(
  clientId: string,
): Promise<{ data: Assessment[]; error?: string }> {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id, client_id, assessor_id, status, assessment_date,
      fitness_level, health_notes, trainer_recommendation,
      recommended_trainer_id, clearance_status, created_at
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getClientAssessmentHistory:', error);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as Assessment[] };
}

export async function submitAssessment(
  assessorId: string,
  clientId: string,
  data: {
    fitness_level: 'beginner' | 'intermediate' | 'advanced';
    health_notes: string;
    trainer_recommendation: string;
    recommended_trainer_id?: string;
    clearance_status: 'cleared' | 'conditional' | 'hold';
  },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('assessments')
    .upsert(
      {
        assessor_id: assessorId,
        client_id: clientId,
        fitness_level: data.fitness_level,
        health_notes: data.health_notes,
        trainer_recommendation: data.trainer_recommendation,
        recommended_trainer_id: data.recommended_trainer_id ?? null,
        clearance_status: data.clearance_status,
        status: 'completed',
        assessment_date: new Date().toISOString().split('T')[0],
      },
      { onConflict: 'client_id,assessor_id' },
    );

  if (error) {
    console.error('submitAssessment:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Auto-create an assessment record when a client saves their health profile.
 * Called silently from HealthProfileScreen. The record is created unassigned
 * (assessor_id null, status 'pending') so it surfaces in the shared assessment
 * queue. Skips creation if one already exists for this client.
 */
export async function createAssessmentRequest(
  clientId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('assessments')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) return true; // Don't duplicate

  const { error } = await supabase
    .from('assessments')
    .insert({ client_id: clientId, status: 'pending' });

  if (error) console.error('createAssessmentRequest:', error);
  return !error;
}

/**
 * Notify a client that the assessment team edited their health profile.
 * Non-fatal — logs and returns on failure so profile saves are never blocked.
 */
export async function notifyClientProfileUpdated(
  clientId: string,
  assessorId: string,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    to_user_id:   clientId,
    from_user_id: assessorId,
    type:         'profile_updated',
    message:
      'The assessment team has updated your health profile. Please review your details.',
    is_read:      false,
  });
  if (error) console.warn('notifyClientProfileUpdated: insert failed (non-fatal):', error);
}

/**
 * Complete an assessment for a client (assessment gate, Stage 2 → Stage 3).
 *
 * Updates the client's existing assessment row (created on health-profile save)
 * with the clearance decision, then fans out notifications:
 *  - cleared / conditional → tells the client they are cleared AND notifies all
 *    active trainers that the client is looking for a trainer.
 *  - hold → tells the client their assessment needs further review.
 *
 * Notification failures are non-fatal so the clearance still saves.
 */
export async function completeAssessment(
  assessorId: string,
  clientId: string,
  data: {
    fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
    health_notes: string;
    trainer_recommendation: string;
    clearance_status: 'cleared' | 'conditional' | 'hold';
  },
): Promise<{ success: boolean; error?: string }> {
  const payload = {
    assessor_id:            assessorId,
    fitness_level:          data.fitness_level,
    health_notes:           data.health_notes,
    trainer_recommendation: data.trainer_recommendation,
    clearance_status:       data.clearance_status,
    status:                 'completed' as const,
    assessment_date:        new Date().toISOString().split('T')[0],
  };

  // Update the existing assessment row for this client.
  const { data: updated, error } = await supabase
    .from('assessments')
    .update(payload)
    .eq('client_id', clientId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('completeAssessment (update):', error);
    return { success: false, error: error.message };
  }

  // Safety net: if no row existed yet, create the completed record directly.
  if (!updated) {
    const { error: insertErr } = await supabase
      .from('assessments')
      .insert({ client_id: clientId, ...payload });
    if (insertErr) {
      console.error('completeAssessment (insert):', insertErr);
      return { success: false, error: insertErr.message };
    }
  }

  // Fan out notifications (non-fatal).
  try {
    const cleared =
      data.clearance_status === 'cleared' || data.clearance_status === 'conditional';

    if (cleared) {
      await supabase.from('notifications').insert({
        to_user_id:   clientId,
        from_user_id: assessorId,
        type:         'assessment_complete',
        message:      'Your assessment is complete. You are now cleared for training!',
        is_read:      false,
      });

      // Resolve client name for the trainer-facing message.
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', clientId)
        .maybeSingle();
      const clientName = clientProfile?.full_name ?? 'A new client';

      // Notify every active trainer.
      const { data: trainers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'trainer')
        .eq('is_active', true);

      if (trainers && trainers.length > 0) {
        const rows = (trainers as Array<{ id: string }>).map(t => ({
          to_user_id:   t.id,
          from_user_id: assessorId,
          type:         'client_cleared',
          message: `New client ${clientName} has been cleared for training and is looking for a trainer.`,
          is_read:      false,
        }));
        await supabase.from('notifications').insert(rows);
      }
    } else {
      await supabase.from('notifications').insert({
        to_user_id:   clientId,
        from_user_id: assessorId,
        type:         'assessment_complete',
        message:
          'Your assessment requires further review. The team will be in touch shortly.',
        is_read:      false,
      });
    }
  } catch (notifErr) {
    console.warn('completeAssessment: notification insert failed (non-fatal):', notifErr);
  }

  return { success: true };
}

export async function updateAssessmentStatus(
  assessmentId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'flagged',
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('assessments')
    .update({ status })
    .eq('id', assessmentId);

  if (error) {
    console.error('updateAssessmentStatus:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Trainer Approvals ─────────────────────────────────────────────────────────

export type TrainerApprovalStatus = 'pending' | 'approved' | 'rejected';

// Reads the current trainer's approval row (null status = no row yet, i.e.
// mid-onboarding). Used by the pending gate and the route guard.
export async function getTrainerApprovalStatus(trainerId: string): Promise<{
  status: TrainerApprovalStatus | null;
  reviewNotes: string | null;
}> {
  const { data, error } = await supabase
    .from('trainer_approvals')
    .select('status, review_notes')
    .eq('trainer_id', trainerId)
    .maybeSingle();

  if (error) {
    console.error('getTrainerApprovalStatus:', error);
    return { status: null, reviewNotes: null };
  }

  return {
    status: (data?.status as TrainerApprovalStatus | undefined) ?? null,
    reviewNotes: data?.review_notes ?? null,
  };
}

export async function getPendingTrainerApprovals(): Promise<{
  data: TrainerApproval[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('trainer_approvals')
    .select(`
      id, trainer_id, assessor_id, status, review_notes, reviewed_at, created_at,
      trainer:profiles!trainer_approvals_trainer_id_fkey ( full_name )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getPendingTrainerApprovals:', error);
    return { data: [], error: error.message };
  }

  type ApprovalRow = Omit<TrainerApproval, 'trainer_name'> & {
    trainer: { full_name: string } | Array<{ full_name: string }> | null;
  };

  const rows = (data ?? []) as unknown as ApprovalRow[];
  return {
    data: rows.map(row => ({
      ...row,
      trainer_name: Array.isArray(row.trainer)
        ? (row.trainer[0]?.full_name ?? 'Unknown')
        : (row.trainer?.full_name ?? 'Unknown'),
    })),
  };
}

// Called on FINAL trainer onboarding submission (D2). Creates the approval row
// and gates the account until the assessment team signs off.
//   - no row yet            → insert a fresh 'pending' row
//   - existing 'rejected'   → flip back to 'pending' (resubmission, D4)
//   - existing 'pending'    → leave as-is (still queued)
//   - existing 'approved'   → do nothing, stay active (D5)
// The resulting status is returned so the caller can route correctly.
export async function submitTrainerForApproval(
  trainerId: string,
): Promise<{ status: 'pending' | 'approved'; error?: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from('trainer_approvals')
    .select('id, status')
    .eq('trainer_id', trainerId)
    .maybeSingle();

  if (fetchError) {
    console.error('submitTrainerForApproval (fetch):', fetchError);
    return { status: 'pending', error: fetchError.message };
  }

  // D5: editing an already-approved profile does NOT re-trigger approval.
  if (existing?.status === 'approved') {
    return { status: 'approved' };
  }

  if (existing) {
    // D4: resubmission flips a rejected (or still-pending) row back to pending.
    const { error } = await supabase
      .from('trainer_approvals')
      .update({ status: 'pending', assessor_id: null, reviewed_at: null })
      .eq('id', existing.id);
    if (error) {
      console.error('submitTrainerForApproval (update):', error);
      return { status: 'pending', error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('trainer_approvals')
      .insert({ trainer_id: trainerId, status: 'pending' });
    if (error) {
      console.error('submitTrainerForApproval (insert):', error);
      return { status: 'pending', error: error.message };
    }
  }

  // Not approved → deactivate until the assessment team approves.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', trainerId);
  if (profileError) {
    console.error('submitTrainerForApproval (profile):', profileError);
    return { status: 'pending', error: profileError.message };
  }

  return { status: 'pending' };
}

export async function submitTrainerApproval(
  assessorId: string,
  trainerId: string,
  status: 'approved' | 'rejected',
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('trainer_approvals')
    .update({
      status,
      review_notes: notes,
      assessor_id: assessorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('trainer_id', trainerId)
    .eq('status', 'pending');

  if (error) {
    console.error('submitTrainerApproval:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Escalations ───────────────────────────────────────────────────────────────

export async function getOpenEscalations(
  _assessorId: string,
): Promise<{ data: Escalation[]; error?: string }> {
  const { data, error } = await supabase
    .from('escalations')
    .select(`
      id, client_id, raised_by, source_alert_id, status,
      assessor_id, resolution_notes, created_at,
      client:profiles!escalations_client_id_fkey ( full_name )
    `)
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getOpenEscalations:', error);
    return { data: [], error: error.message };
  }

  type EscalationRow = Omit<Escalation, 'client_name'> & {
    client: { full_name: string } | Array<{ full_name: string }> | null;
  };

  const rows = (data ?? []) as unknown as EscalationRow[];
  return {
    data: rows.map(row => ({
      ...row,
      client_name: Array.isArray(row.client)
        ? (row.client[0]?.full_name ?? 'Unknown')
        : (row.client?.full_name ?? 'Unknown'),
    })),
  };
}

export async function createEscalation(
  clientId: string,
  raisedBy: 'trainer' | 'client',
  sourceAlertId?: string,
): Promise<{ success: boolean; escalationId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('escalations')
    .insert({
      client_id: clientId,
      raised_by: raisedBy,
      source_alert_id: sourceAlertId ?? null,
      status: 'open',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('createEscalation:', error);
    return { success: false, error: error.message };
  }
  return { success: true, escalationId: data?.id };
}

/** Returns the id of the first assessor profile, or null if none exists. */
export async function getAssessorId(): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'assessor')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function resolveEscalation(
  escalationId: string,
  resolutionNotes: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('escalations')
    .update({ status: 'resolved', resolution_notes: resolutionNotes })
    .eq('id', escalationId);

  if (error) {
    console.error('resolveEscalation:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateEscalationStatus(
  escalationId: string,
  status: 'reviewing' | 'resolved',
  resolutionNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const payload: { status: string; resolution_notes?: string } = { status };
  if (resolutionNotes !== undefined) {
    payload.resolution_notes = resolutionNotes;
  }

  const { error } = await supabase
    .from('escalations')
    .update(payload)
    .eq('id', escalationId);

  if (error) {
    console.error('updateEscalationStatus:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessageThreads(assessorId: string): Promise<{
  data: Array<{
    other_user_id: string;
    other_user_name: string;
    client_id: string | null;
    last_message: string;
    last_message_at: string;
    unread_count: number;
  }>;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('assessment_messages')
    .select(`
      id, from_user_id, to_user_id, client_id, message, is_read, created_at,
      sender:profiles!assessment_messages_from_user_id_fkey ( full_name ),
      recipient:profiles!assessment_messages_to_user_id_fkey ( full_name )
    `)
    .or(`from_user_id.eq.${assessorId},to_user_id.eq.${assessorId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMessageThreads:', error);
    return { data: [], error: error.message };
  }

  type MsgRow = {
    id: string;
    from_user_id: string;
    to_user_id: string;
    client_id: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
    sender: { full_name: string } | null;
    recipient: { full_name: string } | null;
  };

  const rows = (data ?? []) as unknown as MsgRow[];
  const threadMap = new Map<string, {
    other_user_id: string;
    other_user_name: string;
    client_id: string | null;
    last_message: string;
    last_message_at: string;
    unread_count: number;
  }>();

  for (const row of rows) {
    const isFromMe = row.from_user_id === assessorId;
    const otherId = isFromMe ? row.to_user_id : row.from_user_id;
    const otherName = isFromMe
      ? (row.recipient?.full_name ?? 'Unknown')
      : (row.sender?.full_name ?? 'Unknown');

    if (!threadMap.has(otherId)) {
      threadMap.set(otherId, {
        other_user_id: otherId,
        other_user_name: otherName,
        client_id: row.client_id,
        last_message: row.message,
        last_message_at: row.created_at,
        unread_count: !isFromMe && !row.is_read ? 1 : 0,
      });
    } else if (!isFromMe && !row.is_read) {
      threadMap.get(otherId)!.unread_count += 1;
    }
  }

  return { data: Array.from(threadMap.values()) };
}

export async function getMessageThread(
  assessorId: string,
  otherUserId: string,
): Promise<{ data: AssessmentMessage[]; error?: string }> {
  const { data, error } = await supabase
    .from('assessment_messages')
    .select(`
      id, from_user_id, to_user_id, client_id, message, is_read, created_at,
      sender:profiles!assessment_messages_from_user_id_fkey ( full_name )
    `)
    .or(
      `and(from_user_id.eq.${assessorId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${assessorId})`,
    )
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getMessageThread:', error);
    return { data: [], error: error.message };
  }

  type MsgRow = {
    id: string;
    from_user_id: string;
    to_user_id: string;
    client_id: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
    sender: { full_name: string } | null;
  };

  const rows = (data ?? []) as unknown as MsgRow[];
  return {
    data: rows.map(row => ({
      id: row.id,
      from_user_id: row.from_user_id,
      from_name: row.sender?.full_name ?? 'Unknown',
      to_user_id: row.to_user_id,
      client_id: row.client_id,
      message: row.message,
      is_read: row.is_read,
      created_at: row.created_at,
    })),
  };
}

export async function sendAssessmentMessage(
  fromUserId: string,
  toUserId: string,
  message: string,
  clientId?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('assessment_messages')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      client_id: clientId ?? null,
    });

  if (error) {
    console.error('sendAssessmentMessage:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function markMessagesRead(
  toUserId: string,
  fromUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('assessment_messages')
    .update({ is_read: true })
    .eq('to_user_id', toUserId)
    .eq('from_user_id', fromUserId)
    .eq('is_read', false);

  if (error) {
    console.error('markMessagesRead:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Monthly Reviews ───────────────────────────────────────────────────────────

export async function getMonthlyReviewQueue(
  assessorId: string,
): Promise<{ data: MonthlyReview[]; error?: string }> {
  // First month of current month (for "already reviewed" check)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Get all active clients
  const { data: links, error: linksError } = await supabase
    .from('trainer_client_links')
    .select(`
      client_id,
      trainer_id,
      client:profiles!trainer_client_links_client_id_fkey ( full_name ),
      trainer:profiles!trainer_client_links_trainer_id_fkey ( full_name )
    `)
    .eq('status', 'active');

  if (linksError) {
    console.error('getMonthlyReviewQueue (links):', linksError);
    return { data: [], error: linksError.message };
  }

  // Get clients already reviewed this month
  const { data: reviewed, error: reviewedError } = await supabase
    .from('monthly_reviews')
    .select('client_id')
    .eq('assessor_id', assessorId)
    .gte('review_month', currentMonthStart);

  if (reviewedError) {
    console.error('getMonthlyReviewQueue (reviewed):', reviewedError);
    return { data: [], error: reviewedError.message };
  }

  const reviewedIds = new Set((reviewed ?? []).map(r => r.client_id));

  type LinkRow = {
    client_id: string;
    trainer_id: string;
    client: { full_name: string } | Array<{ full_name: string }> | null;
    trainer: { full_name: string } | Array<{ full_name: string }> | null;
  };

  const dueClients = ((links ?? []) as unknown as LinkRow[])
    .filter(l => !reviewedIds.has(l.client_id));

  return {
    data: dueClients.map(l => ({
      id: '',
      client_id: l.client_id,
      client_name: Array.isArray(l.client)
        ? (l.client[0]?.full_name ?? 'Unknown')
        : (l.client?.full_name ?? 'Unknown'),
      trainer_name: Array.isArray(l.trainer)
        ? (l.trainer[0]?.full_name ?? null)
        : (l.trainer?.full_name ?? null),
      assessor_id: assessorId,
      review_month: currentMonthStart,
      goal_alignment_score: null,
      notes: null,
      action_taken: null,
      reviewed_at: '',
    })),
  };
}

export async function submitMonthlyReview(
  assessorId: string,
  clientId: string,
  data: {
    goal_alignment_score: number;
    notes: string;
    action_taken: 'message' | 'call' | 'none';
  },
): Promise<{ success: boolean; error?: string }> {
  const reviewMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split('T')[0];

  const { error } = await supabase.from('monthly_reviews').insert({
    assessor_id: assessorId,
    client_id: clientId,
    review_month: reviewMonth,
    goal_alignment_score: data.goal_alignment_score,
    notes: data.notes,
    action_taken: data.action_taken,
  });

  if (error) {
    console.error('submitMonthlyReview:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getAssessorDashboardStats(assessorId: string): Promise<{
  newClientCount: number;
  openEscalationCount: number;
  pendingTrainerApprovalCount: number;
  monthlyReviewsDueCount: number;
  error?: string;
}> {
  const [newClientsRes, escalationsRes, approvalsRes, dueReviewsRes] =
    await Promise.all([
      // Shared queue count — matches getNewClientQueue (unassigned + assigned).
      supabase
        .from('assessments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']),
      supabase
        .from('escalations')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'reviewing']),
      supabase
        .from('trainer_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // Uses getMonthlyReviewQueue to avoid the RLS block on trainer_client_links
      // for the assessor role — the function already excludes clients reviewed
      // this month, so data.length is the correct due count.
      getMonthlyReviewQueue(assessorId),
    ]);

  const firstError =
    newClientsRes.error?.message ??
    escalationsRes.error?.message ??
    approvalsRes.error?.message ??
    dueReviewsRes.error;

  if (firstError) {
    console.error('getAssessorDashboardStats query error:', firstError);
    return {
      newClientCount: 0,
      openEscalationCount: 0,
      pendingTrainerApprovalCount: 0,
      monthlyReviewsDueCount: 0,
      error: firstError,
    };
  }

  return {
    newClientCount: newClientsRes.count ?? 0,
    openEscalationCount: escalationsRes.count ?? 0,
    pendingTrainerApprovalCount: approvalsRes.count ?? 0,
    monthlyReviewsDueCount: dueReviewsRes.data.length,
  };
}

// ── Assessor Notifications ────────────────────────────────────────────────────

export async function getAssessorNotifications(
  assessorId: string,
): Promise<{ data: AssessorNotification[]; error?: string }> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, message, is_read, created_at')
    .eq('to_user_id', assessorId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getAssessorNotifications:', error);
    return { data: [], error: error.message };
  }

  return {
    data: ((data ?? []) as Array<{
      id: string;
      type: string;
      message: string | null;
      is_read: boolean;
      created_at: string;
    }>).map(row => ({
      id: row.id,
      type: row.type,
      message: row.message ?? '',
      is_read: row.is_read,
      related_id: null,
      created_at: row.created_at,
    })),
  };
}
// markNotificationRead already exists — reuse it for assessor notifications

// ─── Admin Portal — Assessment Team pre-registration ────────────────────────
// profiles.id is FK -> auth.users(id), so an assessor cannot have a profiles
// row before they sign in. Pre-registrations live in preregistered_assessors
// and are linked to a real profile on first OTP sign-in. Phone lookups reuse
// the existing profiles.phone_number column.

export type PreRegisteredAssessor = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  is_active: boolean;
  linked_user_id: string | null;
};

/**
 * Check whether a phone number is pre-registered AND active as an assessor.
 * Called right after OTP verification, before role selection.
 * `phone` must be E.164, e.g. +919876543210.
 */
export async function getPreRegisteredRole(
  phone: string
): Promise<'assessor' | null> {
  const { data, error } = await supabase
    .from('preregistered_assessors')
    .select('role, is_active')
    .eq('phone', phone)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as 'assessor';
}

/**
 * Link a freshly authenticated user to their pre-registration:
 *  - upserts their profiles row with role='assessor' + phone_number
 *  - stamps linked_user_id on the pre-registration (drives the admin list's
 *    "signed in" status)
 * Called after OTP verification when a pre-registered phone is found.
 */
export async function linkAuthUserToProfile(
  userId: string,
  phone: string
): Promise<boolean> {
  const { data: pre } = await supabase
    .from('preregistered_assessors')
    .select('id, full_name')
    .eq('phone', phone)
    .maybeSingle();

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        role: 'assessor',
        phone_number: phone,
        is_active: true,
        ...(pre?.full_name ? { full_name: pre.full_name } : {}),
      },
      { onConflict: 'id' }
    );
  if (profileError) return false;

  if (pre?.id) {
    await supabase
      .from('preregistered_assessors')
      .update({ linked_user_id: userId })
      .eq('id', pre.id);
  }
  return true;
}

/**
 * Admin: list all pre-registered assessors, newest first.
 */
export async function getAllAssessors(): Promise<PreRegisteredAssessor[]> {
  const { data, error } = await supabase
    .from('preregistered_assessors')
    .select('id, full_name, phone, created_at, is_active, linked_user_id')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as PreRegisteredAssessor[];
}

/**
 * Admin: pre-register an assessor by full name + phone.
 * Inserts a preregistered_assessors row (no auth.users entry yet — the auth
 * entry + profile are created when they first sign in via OTP).
 */
export async function preRegisterAssessor(
  fullName: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const normalised = normalisePhone(phone);
  const bareTen = normalised.replace(/\D/g, '').slice(-10);

  // Already pre-registered?
  const { data: existingPre } = await supabase
    .from('preregistered_assessors')
    .select('id')
    .eq('phone', normalised)
    .maybeSingle();
  if (existingPre) {
    return { success: false, error: 'This phone number is already registered.' };
  }

  // Already a signed-in user with this phone? (existing rows store phone_number
  // as raw 10-digit, newer assessor links store E.164 — check both forms)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .in('phone_number', [normalised, bareTen])
    .maybeSingle();
  if (existingProfile) {
    return { success: false, error: 'This phone number is already registered.' };
  }

  const { error } = await supabase
    .from('preregistered_assessors')
    .insert({ full_name: fullName, phone: normalised, role: 'assessor', is_active: true });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Admin: deactivate / reactivate a pre-registered assessor.
 * `id` is the preregistered_assessors row id. If the assessor has already
 * signed in, the change is mirrored onto their profiles row.
 */
export async function toggleAssessorActive(
  id: string,
  isActive: boolean
): Promise<boolean> {
  const { data: pre, error } = await supabase
    .from('preregistered_assessors')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('linked_user_id')
    .maybeSingle();
  if (error) return false;

  if (pre?.linked_user_id) {
    await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', pre.linked_user_id);
  }
  return true;
}
