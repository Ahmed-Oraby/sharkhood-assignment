export interface NormalizedLocation {
  provider: string;
  locationId: number;
  name: string;
  slug: string;
}

export type LocationNormalizationResult =
  | { success: true; data: NormalizedLocation }
  | { success: false; reason: string };

export function normalizeLocation(
  raw: unknown,
  provider: string,
): LocationNormalizationResult {
  if (!raw || typeof raw !== 'object') {
    return { success: false, reason: 'Location must be an object' };
  }

  const location = raw as Record<string, unknown>;

  if (!provider || typeof provider !== 'string') {
    return { success: false, reason: 'Provider is required' };
  }

  if (
    typeof location.location_id !== 'number' ||
    !Number.isInteger(location.location_id) ||
    location.location_id <= 0
  ) {
    return { success: false, reason: 'Invalid location_id' };
  }

  if (
    typeof location.location_name !== 'string' ||
    !location.location_name.trim()
  ) {
    return { success: false, reason: 'Invalid location_name' };
  }

  if (
    typeof location.location_slug !== 'string' ||
    !location.location_slug.trim()
  ) {
    return { success: false, reason: 'Invalid location_slug' };
  }

  return {
    success: true,
    data: {
      provider,
      locationId: location.location_id,
      name: location.location_name.trim(),
      slug: location.location_slug.trim(),
    },
  };
}
