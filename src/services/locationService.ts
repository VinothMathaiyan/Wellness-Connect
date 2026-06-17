// src/services/locationService.ts
//
// Pure, framework-agnostic helpers for resolving the user's city from their
// device location. No React, no UI, and no database access — callers (the
// useLocation hook) own all state and side effects. Functions resolve a
// ResolvedLocation and reject/throw a LocationErrorKind on failure.
//
// PRODUCTION NOTE (intentionally not implemented here): the public Nominatim
// endpoint used by reverseGeocode is rate-limited to ~1 request/second and
// expects a descriptive identifying header (User-Agent / Referer) that browsers
// are not permitted to set on fetch(). For production this call should be
// proxied through a Supabase Edge Function (or swapped for a browser-friendly
// geocoding provider) so an identifying header can be attached and usage stays
// within limits. OpenStreetMap data also requires visible
// "© OpenStreetMap contributors" attribution wherever resolved places appear.

import type {
  LocationCoordinates,
  ResolvedLocation,
  LocationErrorKind,
} from '@/types';

const LOCATION_ERROR_KINDS: readonly LocationErrorKind[] = [
  'unsupported',
  'permission_denied',
  'timeout',
  'position_unavailable',
  'geocode_failed',
  'empty',
];

/** Type guard so callers can narrow a caught value to a known LocationErrorKind. */
export function isLocationErrorKind(value: unknown): value is LocationErrorKind {
  return (
    typeof value === 'string' &&
    (LOCATION_ERROR_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Resolve the device's current coordinates via the Geolocation API.
 *
 * Requires a secure context (HTTPS or localhost — the Vercel preview URL
 * qualifies). Rejects with a LocationErrorKind:
 *   - 'unsupported'          geolocation API not available
 *   - 'permission_denied'    user blocked the request (code 1)
 *   - 'position_unavailable' position could not be determined (code 2)
 *   - 'timeout'              request exceeded the timeout (code 3)
 */
export function getCurrentCoordinates(): Promise<LocationCoordinates> {
  return new Promise<LocationCoordinates>((resolve, reject) => {
    const fail = (kind: LocationErrorKind) => reject(kind);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fail('unsupported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => {
        // GeolocationPositionError codes:
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
        switch (error.code) {
          case 1:
            fail('permission_denied');
            break;
          case 2:
            fail('position_unavailable');
            break;
          case 3:
            fail('timeout');
            break;
          default:
            fail('position_unavailable');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

/**
 * Reverse-geocode coordinates to a city using OpenStreetMap's Nominatim.
 * Throws 'geocode_failed' on network/non-200/parse failure and 'empty' when no
 * usable place name is present in the response.
 */
export async function reverseGeocode(
  coords: LocationCoordinates,
): Promise<ResolvedLocation> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '10',
    lat: String(coords.latitude),
    lon: String(coords.longitude),
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept-Language':
          (typeof navigator !== 'undefined' && navigator.language) || 'en',
      },
    });
  } catch {
    const kind: LocationErrorKind = 'geocode_failed';
    throw kind;
  }

  if (!response.ok) {
    const kind: LocationErrorKind = 'geocode_failed';
    throw kind;
  }

  let data: NominatimReverseResponse;
  try {
    data = (await response.json()) as NominatimReverseResponse;
  } catch {
    const kind: LocationErrorKind = 'geocode_failed';
    throw kind;
  }

  const address = data.address ?? {};
  // Fallback chain — Nominatim labels the locality differently by region.
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.suburb ??
    address.county;

  if (!city) {
    const kind: LocationErrorKind = 'empty';
    throw kind;
  }

  return {
    city,
    state: address.state,
    country: address.country,
  };
}

/**
 * Orchestrates coordinate capture + reverse geocoding.
 * Resolves a ResolvedLocation; rejects/throws a LocationErrorKind.
 */
export async function resolveCityFromDevice(): Promise<ResolvedLocation> {
  const coords = await getCurrentCoordinates();
  return reverseGeocode(coords);
}
