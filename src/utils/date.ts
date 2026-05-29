// src/utils/date.ts
//
// Single source of truth for ISO date strings (YYYY-MM-DD) and Monday-anchored
// week math across all three apps (Trainer, Client, Assessment).
//
// Display formatting (DD/MM/YYYY, relative dates, etc.) lives in dateUtils.ts —
// this module is strictly for *storage / query* date values and week boundaries
// used by check-ins, weekly reports, nutrition logs, and trainer schedules.
//
// NOTE: todayISO()/toISODate() preserve the exact behavior of the
// `new Date(...).toISOString().split('T')[0]` pattern they replace (UTC-based
// calendar date). Keep all such conversions routed through here so the
// behavior stays consistent and greppable in one place.

/** Today as a YYYY-MM-DD string. */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Convert any date-ish value to a YYYY-MM-DD string. */
export function toISODate(value: Date | string | number): string {
  return new Date(value).toISOString().split('T')[0];
}

/**
 * YYYY-MM-DD string for the date `days` days before `from` (default: today).
 * Keeps rolling-window date math (last 7/14/30 days) routed through this file
 * so it stays greppable and consistent — callers must not compute it inline.
 */
export function daysAgoISO(days: number, from: Date | string | number = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return toISODate(d);
}

/**
 * Day index with Monday = 0 … Sunday = 6 (vs JS native Sunday = 0).
 * Defaults to today.
 */
export function dayIndexFromMonday(value: Date | string | number = new Date()): number {
  return (new Date(value).getDay() + 6) % 7;
}

/**
 * Monday of the ISO week containing `date`, as a YYYY-MM-DD string.
 * Reused by getWeeklyLogs, saveWeeklyReflection, getWeeklyReflection, and the
 * WeeklyReport screen so the report label and rendered data stay aligned.
 */
export function mondayOfWeek(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - dayIndexFromMonday(d));
  return toISODate(d);
}
