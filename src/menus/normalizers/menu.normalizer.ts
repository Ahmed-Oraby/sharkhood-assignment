export interface NormalizedMenu {
  provider: string;
  restaurantId: number;
  itemId: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}

export type MenuResult =
  { success: true; data: NormalizedMenu } | { success: false; reason: string };

export function normalizeMenu(
  raw: unknown,
  provider: string,
  restaurantId: number,
): MenuResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      reason: 'Item must be an object',
    };
  }

  const item = raw as Record<string, unknown>;

  if (typeof provider !== 'string' || !provider.trim()) {
    return {
      success: false,
      reason: 'Invalid provider',
    };
  }

  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    return {
      success: false,
      reason: 'Invalid restaurant ID',
    };
  }

  if (
    typeof item.itemId !== 'number' ||
    !Number.isSafeInteger(item.itemId) ||
    item.itemId <= 0
  ) {
    return {
      success: false,
      reason: 'Invalid itemId',
    };
  }

  if (typeof item.name !== 'string' || !item.name.trim()) {
    return {
      success: false,
      reason: 'Invalid name',
    };
  }

  const price = Number(item.price);

  if (
    item.price === null ||
    item.price === undefined ||
    item.price === '' ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return {
      success: false,
      reason: 'Invalid price',
    };
  }

  return {
    success: true,
    data: {
      provider: provider.trim(),
      restaurantId,
      itemId: item.itemId,
      name: item.name.trim(),
      description:
        typeof item.description === 'string' ? item.description.trim() : null,
      price,
      image:
        typeof item.image === 'string' && item.image.trim()
          ? item.image.trim()
          : null,
    },
  };
}
