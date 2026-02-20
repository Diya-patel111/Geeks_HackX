import { MAX_FILE_SIZE_MB } from './constants';

/** ─── Date / Time ─────────────────────────────────────────────────────────── */

/**
 * "2 hours ago", "3 days ago", etc.
 */
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30)  return `${days} day${days > 1 ? 's' : ''} ago`;

  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Full date + time string for tooltips.
 */
export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

/** ─── Numbers ──────────────────────────────────────────────────────────────── */

/**
 * 1500 → "1.5K",  2_400_000 → "2.4M"
 */
export function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Distance in metres → human-readable string.
 */
export function formatDistance(metres) {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

/** ─── Files ────────────────────────────────────────────────────────────────── */

/**
 * Convert File size to "3.2 MB".
 */
export function formatFileSize(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1_048_576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/**
 * Validate files selected for upload.
 * Returns an array of error strings (empty = all good).
 */
export function validateFiles(files, maxCount = 5) {
  const errors = [];
  if (files.length > maxCount) {
    errors.push(`You can upload at most ${maxCount} files.`);
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_MB * 1_048_576) {
      errors.push(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB limit.`);
    }
    if (!file.type.startsWith('image/')) {
      errors.push(`"${file.name}" is not an image.`);
    }
  }
  return errors;
}

/** ─── GeoJSON ─────────────────────────────────────────────────────────────── */

/**
 * Build a GeoJSON Point object (for issue creation).
 * @param {number} lat
 * @param {number} lng
 * @param {{ city?, address?, ward? }} meta
 */
export function buildGeoPoint(lat, lng, meta = {}) {
  return {
    type: 'Point',
    coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
    ...meta,
  };
}

/**
 * Reverse geocode coordinates to a human-readable address using
 * OpenStreetMap Nominatim (free, no API key required).
 *
 * Returns { city, address } strings, or empty strings on failure
 * (never throws — location submission should not be blocked by geocoding).
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ city: string, address: string, ward: string }>}
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent (fair-use policy)
        'Accept-Language': 'en',
        'User-Agent': 'JanAwaaz-CivicApp/1.0',
      },
    });

    if (!res.ok) return { city: '', address: '', ward: '' };

    const data = await res.json();
    const a = data.address ?? {};

    // city: prefer city → town → village → county → state_district
    const city =
      a.city ?? a.town ?? a.village ?? a.county ?? a.state_district ?? '';

    // ward / suburb
    const ward = a.suburb ?? a.neighbourhood ?? a.quarter ?? '';

    // Short human-readable address: road + suburb/city
    const parts = [a.road, ward || city].filter(Boolean);
    const address = parts.length ? parts.join(', ') : (data.display_name?.split(',').slice(0, 2).join(',') ?? '');

    return { city, address, ward };
  } catch {
    // Network failure, JSON parse error, etc. — silently degrade.
    return { city: '', address: '', ward: '' };
  }
}
