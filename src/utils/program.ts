// src/utils/program.ts
//
// Program-week math for the client app. Pure helpers — no Supabase, no JSX.
//
// Date *storage/query* helpers (ISO strings, week boundaries) live in date.ts.
// This file is program-progress logic layered on top of a plan's scheduled
// start date, so the "Week N" label is derived from one place everywhere.

export type ProgramWeek = number | 'not_started' | 'starts_future';

/** Min distinct daily-log days in the current week to unlock the Weekly Report. */
export const WEEKLY_REPORT_MIN_DAYS = 3;

/**
 * Which week of the program "today" falls in, given the plan's scheduled start.
 *
 *  - scheduledAt null / invalid → 'not_started'   (program hasn't been scheduled)
 *  - scheduledAt in the future  → 'starts_future'
 *  - scheduledAt in the past    → floor((today - scheduledAt) / 7) + 1,
 *                                 clamped to [1, durationWeeks]
 *
 * NOTE: never derive the week from workout_plans.created_at — a plan can be
 * created well before it actually starts, which is exactly what produced the
 * bogus "Week 2" on an unscheduled plan.
 */
export function getProgramWeek(
  scheduledAt: string | null | undefined,
  durationWeeks: number | null | undefined,
): ProgramWeek {
  if (!scheduledAt) return 'not_started';

  const start = new Date(scheduledAt);
  if (isNaN(start.getTime())) return 'not_started';

  const now = new Date();
  if (start.getTime() > now.getTime()) return 'starts_future';

  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  let week = Math.floor(diffDays / 7) + 1;
  if (week < 1) week = 1;
  if (durationWeeks && durationWeeks > 0 && week > durationWeeks) week = durationWeeks;
  return week;
}
