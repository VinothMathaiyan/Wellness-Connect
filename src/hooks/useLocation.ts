// src/hooks/useLocation.ts
//
// React state wrapper around the pure locationService. Owns loading/error/result
// state for the UI and exposes a one-shot detect(). Privacy: fetches only when
// detect() is called (an explicit user tap), never watchPosition, and never
// silently re-prompts a user who has already denied access.

import { useCallback, useState } from 'react';
import type { LocationErrorKind, ResolvedLocation } from '@/types';
import {
  isLocationErrorKind,
  resolveCityFromDevice,
} from '@/services/locationService';

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseLocationResult {
  detect: () => Promise<ResolvedLocation | null>;
  status: LocationStatus;
  error: LocationErrorKind | null;
  result: ResolvedLocation | null;
  /** Whether the Geolocation API exists at all — used to hide the trigger. */
  isSupported: boolean;
}

/**
 * Friendly, non-blocking message for each error kind, shown inline beside the
 * city field. Returns null for 'unsupported' — that case hides the auto-detect
 * trigger entirely rather than surfacing a message.
 */
export function locationErrorMessage(
  kind: LocationErrorKind | null,
): string | null {
  switch (kind) {
    case 'permission_denied':
    case 'position_unavailable':
      return 'Location access denied. Please enter your city manually.';
    case 'timeout':
      return "Couldn't detect your location in time. Please enter your city manually.";
    case 'geocode_failed':
    case 'empty':
      return "Couldn't find your city automatically. Please enter it manually.";
    case 'unsupported':
    case null:
    default:
      return null;
  }
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<LocationErrorKind | null>(null);
  const [result, setResult] = useState<ResolvedLocation | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const detect = useCallback(async (): Promise<ResolvedLocation | null> => {
    setStatus('loading');
    setError(null);
    setResult(null);

    // If the Permissions API is available, check it first. A prior 'denied'
    // state means we must NOT call getCurrentPosition again (that would either
    // silently fail or re-prompt) — surface the denial instead.
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: 'geolocation',
        });
        if (permission.state === 'denied') {
          setError('permission_denied');
          setStatus('error');
          return null;
        }
      } catch {
        // Some browsers reject permissions.query for the 'geolocation' name;
        // fall through and let getCurrentPosition drive the permission prompt.
      }
    }

    try {
      const resolved = await resolveCityFromDevice();
      setResult(resolved);
      setStatus('success');
      return resolved;
    } catch (caught) {
      setError(isLocationErrorKind(caught) ? caught : 'geocode_failed');
      setStatus('error');
      return null;
    }
  }, []);

  return { detect, status, error, result, isSupported };
}
