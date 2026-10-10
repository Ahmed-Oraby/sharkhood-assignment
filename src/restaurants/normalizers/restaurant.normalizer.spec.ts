import { normalizeRestaurant } from './restaurant.normalizer';
import { mapFields } from '../../core/mapping/field-mapper';
import { talabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('normalizeRestaurant', () => {
  const validRestaurant = {
    restaurantId: 42081,
    name: 'Example Restaurant',
    url: 'https://www.talabat.com/uae/restaurant/42081/example-restaurant?aid=1280',
  };

  it('normalizes a valid restaurant', () => {
    expect(normalizeRestaurant(validRestaurant, 'talabat')).toEqual({
      success: true,
      data: {
        provider: 'talabat',
        restaurantId: 42081,
        name: 'Example Restaurant',
        url: validRestaurant.url,
      },
    });
  });

  it('rejects a missing restaurant name', () => {
    expect(
      normalizeRestaurant({ ...validRestaurant, name: '' }, 'talabat'),
    ).toEqual({
      success: false,
      reason: 'Invalid name',
    });
  });

  it('rejects an invalid restaurant ID', () => {
    expect(
      normalizeRestaurant(
        { ...validRestaurant, restaurantId: null },
        'talabat',
      ),
    ).toEqual({
      success: false,
      reason: 'Invalid restaurantId',
    });
  });

  it('rejects a missing URL', () => {
    expect(
      normalizeRestaurant({ ...validRestaurant, url: '' }, 'talabat'),
    ).toEqual({
      success: false,
      reason: 'Invalid url',
    });
  });

  it('rejects a missing provider', () => {
    expect(normalizeRestaurant(validRestaurant, '')).toEqual({
      success: false,
      reason: 'Provider is required',
    });
  });

  it('rejects a non-object input', () => {
    expect(normalizeRestaurant(null, 'talabat')).toEqual({
      success: false,
      reason: 'Restaurant must be an object',
    });
  });
});

describe('Talabat restaurant adapter', () => {
  it('maps Talabat fields to canonical fields', () => {
    const mapped = mapFields(
      {
        area_name: 'Al Zaab',
        restaurant_name: 'Example Restaurant',
        restaurant_url:
          'https://www.talabat.com/uae/restaurant/42081/example-restaurant?aid=1280',
      },
      talabatAdapter.mappings.restaurant,
    );

    expect(mapped).toEqual({
      name: 'Example Restaurant',
      url: 'https://www.talabat.com/uae/restaurant/42081/example-restaurant?aid=1280',
    });
  });

  it('extracts the restaurant ID instead of the area ID', () => {
    expect(
      talabatAdapter.extractRestaurantId(
        'https://www.talabat.com/uae/restaurant/42081/example-restaurant?aid=1280',
      ),
    ).toBe(42081);
  });

  it('rejects a malformed URL', () => {
    expect(talabatAdapter.extractRestaurantId('not-a-url')).toBeNull();
  });

  it('rejects a URL without a restaurant ID', () => {
    expect(
      talabatAdapter.extractRestaurantId(
        'https://www.talabat.com/uae/restaurants',
      ),
    ).toBeNull();
  });

  it('rejects a URL from another website', () => {
    expect(
      talabatAdapter.extractRestaurantId(
        'https://example.com/uae/restaurant/42081/example',
      ),
    ).toBeNull();
  });
});
