// src/utils/dateUtils.ts
//
// Single source of truth for date formatting and parsing across all three apps
// (Trainer, Client, Assessment). Display format is Indian locale: DD/MM/YYYY.
//
// Storage stays ISO (YYYY-MM-DD / full ISO timestamps) in the database — use
// toInputDateValue() only for <input type="date"> values, never for display.

/**
 * Format a date value to display string: DD/MM/YYYY
 * Accepts: Date object | ISO string | timestamp
 */
export function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Timezone-safe variant of formatDate: always renders the date in IST
 * (Asia/Kolkata) regardless of the browser's local timezone. DD/MM/YYYY.
 */
export function formatDateIST(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }); // returns DD/MM/YYYY in en-IN locale
}

/**
 * Timezone-safe variant of formatDateTime: always renders date + 24h time in
 * IST (Asia/Kolkata) regardless of the browser's local timezone.
 */
export function formatDateTimeIST(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format with time: DD/MM/YYYY, HH:MM
 */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)}, ${hh}:${min}`;
}

/**
 * Format for section headers: "Mon, 24 May 2026"
 */
export function formatDateLong(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Format relative time: "Today", "Yesterday", "2 days ago", or DD/MM/YYYY
 */
export function formatRelativeDate(value: Date | string | number | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

/**
 * Convert a date to the value format required by <input type="date">: YYYY-MM-DD
 * Use this ONLY for setting input values, never for display.
 */
export function toInputDateValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Parse dd/mm/yyyy string → Date object
 */
export function parseDDMMYYYY(str: string): Date | null {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}
