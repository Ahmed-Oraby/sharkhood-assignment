import {
  ProviderAdapter,
  ProviderMenuRestaurant,
} from '../provider-adapter.interface';
import {
  talabatLocationMapping,
  talabatRestaurantMapping,
  talabatMenuMapping,
} from './talabat.mapping';

export const talabatAdapter: ProviderAdapter = {
  provider: 'talabat',

  mappings: {
    location: talabatLocationMapping,
    restaurant: talabatRestaurantMapping,
    menu: talabatMenuMapping,
  },

  extractRestaurantId(url: string): number | null {
    try {
      const parsed = new URL(url);

      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'www.talabat.com'
      ) {
        return null;
      }

      const match = parsed.pathname.match(
        /^\/uae\/restaurant\/([1-9]\d*)(?:\/|$)/,
      );

      if (!match) return null;

      const id = Number(match[1]);

      return Number.isSafeInteger(id) ? id : null;
    } catch {
      return null;
    }
  },

  extractMenuRestaurants(payload: unknown): ProviderMenuRestaurant[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const data = payload as Record<string, unknown>;

    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((restaurant): ProviderMenuRestaurant => {
      const record =
        restaurant && typeof restaurant === 'object'
          ? (restaurant as Record<string, unknown>)
          : {};

      const rawRestaurantId = record.outletCode;
      const parsedId = Number(rawRestaurantId);

      const restaurantId =
        rawRestaurantId !== null &&
        rawRestaurantId !== undefined &&
        rawRestaurantId !== '' &&
        Number.isSafeInteger(parsedId) &&
        parsedId > 0
          ? parsedId
          : null;

      const items: unknown[] = [];

      const categories = Array.isArray(record.category) ? record.category : [];

      for (const category of categories) {
        if (!category || typeof category !== 'object') continue;

        const categoryRecord = category as Record<string, unknown>;

        if (Array.isArray(categoryRecord.items)) {
          items.push(...categoryRecord.items);
        }
      }

      return {
        restaurantId,
        rawRestaurantId,
        items,
      };
    });
  },
};
