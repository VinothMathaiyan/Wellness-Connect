import { supabase } from '../../../lib/supabaseClient';
import type { AvailabilitySlot, TrainerOnboardingData } from '../types/trainerOnboarding.types';

/**
 * Converts the form's certificationName string (comma-separated, possibly
 * multi-chip) into a proper string[] for the certifications column.
 * e.g. "NASM-CPT, RYT 200" → ['NASM-CPT', 'RYT 200']
 *      ""                  → []
 */
function parseCertifications(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
}

/**
 * Converts the form's AvailabilitySlot[] into the jsonb shape stored in the
 * profiles.availability column:
 *   { weekdays: "6 AM - 9 AM, 5 PM - 8 PM", weekends: "8 AM - 12 PM" }
 *
 * Strategy:
 *   - Weekday slots (Mon–Fri): collect unique start hours, format as
 *     consolidated range strings joined by ", "
 *   - Weekend slots (Sat–Sun): same treatment
 *   - If a category has no slots, that key is omitted
 */
function buildAvailabilityJson(
  slots: AvailabilitySlot[],
): { weekdays?: string; weekends?: string } | null {
  if (slots.length === 0) return null;

  const WEEKDAY_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const WEEKEND_DAYS = new Set(['Sat', 'Sun']);

  function formatHour(h: number): string {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour} ${period}`;
  }

  function summariseSlots(subset: AvailabilitySlot[]): string {
    // Collect unique start hours across all days in this subset
    const hours = Array.from(
      new Set(subset.map(s => parseInt(s.start_time.split(':')[0], 10))),
    ).sort((a, b) => a - b);

    if (hours.length === 0) return '';

    // Build consecutive range groups
    const ranges: string[] = [];
    let rangeStart = hours[0];
    let prev = hours[0];

    for (let i = 1; i <= hours.length; i++) {
      const curr = hours[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        // End of a consecutive run — prev+1 is the end hour of the last slot
        ranges.push(`${formatHour(rangeStart)} - ${formatHour(prev + 1)}`);
        rangeStart = curr;
        prev = curr;
      }
    }

    return ranges.join(', ');
  }

  const weekdaySlots = slots.filter(s => WEEKDAY_DAYS.has(s.day));
  const weekendSlots = slots.filter(s => WEEKEND_DAYS.has(s.day));

  const result: { weekdays?: string; weekends?: string } = {};
  if (weekdaySlots.length > 0) result.weekdays = summariseSlots(weekdaySlots);
  if (weekendSlots.length > 0) result.weekends = summariseSlots(weekendSlots);

  return Object.keys(result).length > 0 ? result : null;
}

export const saveTrainerOnboarding = async (
  userId: string,
  data: TrainerOnboardingData,
): Promise<{ error: string | null }> => {
  try {
    // ── Field mapping ────────────────────────────────────────────────────────
    // Form field              → DB column
    // data.bio                → bio (text)
    // data.certificationName  → certifications (text[])  — split comma string
    // data.yearsOfExperience  → experience_years (int)   — parse from string
    // data.photoUrl           → avatar_url (text)        — primary photo col
    // data.specialisations    → specialties (text[])
    // data.city               → city (text)
    // data.availabilitySlots  → availability (jsonb)     — convert slot array

    const certifications = parseCertifications(data.certificationName);

    const experienceYears =
      data.yearsOfExperience.trim() !== ''
        ? parseInt(data.yearsOfExperience, 10)
        : null;

    const availability = buildAvailabilityJson(data.availabilitySlots);

    const { error } = await supabase
      .from('profiles')
      .update({
        city:             data.city ?? '',
        specialties:      data.specialisations ?? [],
        certifications,
        avatar_url:       data.photoUrl ?? null,  // avatar_url is the primary column
        bio:              data.bio.trim() || null,
        experience_years: experienceYears,
        availability,
      })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to save trainer profile';
    console.error('saveTrainerOnboarding:', message);
    return { error: message };
  }
};

export const getTrainerProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getTrainerProfile:', error);
    return null;
  }
  return data;
};
