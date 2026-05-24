// src/utils/otpUtils.ts
//
// Helpers for phone OTP auth. The dev bypass (any number + "123456") stays
// available ONLY when VITE_USE_DEV_OTP=true (local dev). In production the
// flag is false and real Supabase Phone Auth (Twilio SMS) is used.

export const IS_DEV_OTP = import.meta.env.VITE_USE_DEV_OTP === 'true';

/**
 * Normalise a phone number to E.164 format for Supabase/Twilio.
 * Handles Indian numbers with or without country code.
 * Examples:
 *   "9876543210"    → "+919876543210"
 *   "09876543210"   → "+919876543210"
 *   "+919876543210" → "+919876543210"
 *   "+447911123456" → "+447911123456" (non-Indian, passed through)
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + digits;
  if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+91' + digits.slice(1);
  if (digits.length === 10) return '+91' + digits;
  return '+' + digits;
}

/**
 * Validate a raw phone input before attempting to send OTP.
 * Returns error string or null if valid.
 */
export function validatePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 'Please enter your mobile number';
  if (digits.length < 10) return 'Number is too short';
  if (digits.length > 13) return 'Number is too long';
  return null;
}

/**
 * Validate OTP input.
 */
export function validateOtp(otp: string): string | null {
  if (!otp || otp.length === 0) return 'Please enter the OTP';
  if (!/^\d{6}$/.test(otp)) return 'OTP must be 6 digits';
  return null;
}
