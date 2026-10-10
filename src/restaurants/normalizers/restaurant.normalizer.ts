export interface NormalizedRestaurant {
  provider: string;
  restaurantId: number;
  name: string;
  url: string;
}

export type RestaurantNormalizationResult =
  | { success: true; data: NormalizedRestaurant }
  | { success: false; reason: string };

export function normalizeRestaurant(
  raw: unknown,
  provider: string,
): RestaurantNormalizationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      reason: 'Restaurant must be an object',
    };
  }

  const record = raw as Record<string, unknown>;

  if (typeof provider !== 'string' || !provider.trim()) {
    return {
      success: false,
      reason: 'Provider is required',
    };
  }

  if (
    typeof record.restaurant_name !== 'string' ||
    !record.restaurant_name.trim()
  ) {
    return {
      success: false,
      reason: 'Invalid restaurant_name',
    };
  }

  if (typeof record.restaurant_url !== 'string') {
    return {
      success: false,
      reason: 'Invalid restaurant_url',
    };
  }

  let url: URL;

  try {
    url = new URL(record.restaurant_url);
  } catch {
    return {
      success: false,
      reason: 'Malformed restaurant_url',
    };
  }

  if (url.protocol !== 'https:' || url.hostname !== 'www.talabat.com') {
    return {
      success: false,
      reason: 'Unexpected restaurant URL origin',
    };
  }

  const match = url.pathname.match(/^\/uae\/restaurant\/([1-9]\d*)(?:\/|$)/);

  if (!match) {
    return {
      success: false,
      reason: 'Restaurant ID missing from URL',
    };
  }

  const restaurantId = Number(match[1]);

  if (!Number.isSafeInteger(restaurantId)) {
    return {
      success: false,
      reason: 'Invalid restaurant ID',
    };
  }

  return {
    success: true,
    data: {
      provider: provider.trim(),
      restaurantId,
      name: record.restaurant_name.trim(),
      url: url.toString(),
    },
  };
}
