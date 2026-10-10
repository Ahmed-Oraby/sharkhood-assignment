import { normalizeRestaurant } from './restaurant.normalizer';

describe('normalizeRestaurant', () => {
  const validRestaurant = {
    area_name: 'Al Zaab',
    restaurant_name: 'Example Restaurant',
    restaurant_url:
      'https://www.talabat.com/uae/restaurant/42081/example-restaurant?aid=1280',
  };

  it('normalizes a valid restaurant', () => {
    expect(normalizeRestaurant(validRestaurant, 'talabat')).toEqual({
      success: true,
      data: {
        provider: 'talabat',
        restaurantId: 42081,
        name: 'Example Restaurant',
        url: validRestaurant.restaurant_url,
      },
    });
  });

  it('rejects a missing restaurant name', () => {
    expect(
      normalizeRestaurant(
        { ...validRestaurant, restaurant_name: '' },
        'talabat',
      ),
    ).toEqual({
      success: false,
      reason: 'Invalid restaurant_name',
    });
  });

  it('rejects an invalid restaurant URL', () => {
    const result = normalizeRestaurant(
      { ...validRestaurant, restaurant_url: 'not-a-url' },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Malformed restaurant_url',
    });
  });

  it('rejects a URL without a restaurant ID', () => {
    const result = normalizeRestaurant(
      {
        ...validRestaurant,
        restaurant_url: 'https://www.talabat.com/uae/restaurants',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Restaurant ID missing from URL',
    });
  });

  it('rejects a URL from another website', () => {
    const result = normalizeRestaurant(
      {
        ...validRestaurant,
        restaurant_url: 'https://example.com/uae/restaurant/42081/example',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Unexpected restaurant URL origin',
    });
  });
});
