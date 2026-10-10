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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { success: false, reason: 'Location must be an object' };
  }

  const location = raw as Record<string, unknown>;

  if (typeof provider !== 'string' || !provider.trim()) {
    return { success: false, reason: 'Provider is required' };
  }

  if (
    typeof location.locationId !== 'number' ||
    !Number.isSafeInteger(location.locationId) ||
    location.locationId <= 0
  ) {
    return { success: false, reason: 'Invalid locationId' };
  }

  if (typeof location.name !== 'string' || !location.name.trim()) {
    return { success: false, reason: 'Invalid name' };
  }

  if (typeof location.slug !== 'string' || !location.slug.trim()) {
    return { success: false, reason: 'Invalid slug' };
  }

  return {
    success: true,
    data: {
      provider: provider.trim(),
      locationId: location.locationId,
      name: location.name.trim(),
      slug: location.slug.trim(),
    },
  };
}
