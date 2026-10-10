import { FieldMapping } from '../core/mapping/field-mapper';

export interface ProviderMenuRestaurant {
  restaurantId: number | null;
  items: unknown[];
  rawRestaurantId: unknown;
}

export interface ProviderAdapter {
  readonly provider: string;

  readonly mappings: {
    location: FieldMapping;
    restaurant: FieldMapping;
    menu: FieldMapping;
  };

  extractRestaurantId(url: string): number | null;

  extractMenuRestaurants(payload: unknown): ProviderMenuRestaurant[];
}
