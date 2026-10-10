import { FieldMapping } from '../../core/mapping/field-mapper';

export const talabatLocationMapping: FieldMapping = {
  locationId: 'location_id',
  name: 'location_name',
  slug: 'location_slug',
};

export const talabatRestaurantMapping: FieldMapping = {
  name: 'restaurant_name',
  url: 'restaurant_url',
};

export const talabatMenuMapping: FieldMapping = {
  itemId: 'item_id',
  name: 'item_name',
  description: 'description',
  price: 'price',
  image: 'image',
};
