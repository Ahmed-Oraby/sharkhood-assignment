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
    typeof item.item_id !== 'number' ||
    !Number.isSafeInteger(item.item_id) ||
    item.item_id <= 0
  ) {
    return {
      success: false,
      reason: 'Invalid item_id',
    };
  }

  if (typeof item.item_name !== 'string' || !item.item_name.trim()) {
    return {
      success: false,
      reason: 'Invalid item_name',
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
      itemId: item.item_id,
      name: item.item_name.trim(),
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
