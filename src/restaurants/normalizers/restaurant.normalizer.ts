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
    typeof record.restaurantId !== 'number' ||
    !Number.isSafeInteger(record.restaurantId) ||
    record.restaurantId <= 0
  ) {
    return {
      success: false,
      reason: 'Invalid restaurantId',
    };
  }

  if (typeof record.name !== 'string' || !record.name.trim()) {
    return {
      success: false,
      reason: 'Invalid name',
    };
  }

  if (typeof record.url !== 'string' || !record.url.trim()) {
    return {
      success: false,
      reason: 'Invalid url',
    };
  }

  return {
    success: true,
    data: {
      provider: provider.trim(),
      restaurantId: record.restaurantId,
      name: record.name.trim(),
      url: record.url.trim(),
    },
  };
}
