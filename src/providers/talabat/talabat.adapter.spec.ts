import { talabatAdapter } from './talabat.adapter';

describe('Talabat menu extraction', () => {
  it('extracts and flattens items across categories', () => {
    const payload = {
      results: [
        {
          outletCode: '42081',
          category: [
            {
              category_id: 1,
              items: [
                { item_id: 101, item_name: 'Burger' },
                { item_id: 102, item_name: 'Fries' },
              ],
            },
            {
              category_id: 2,
              items: [{ item_id: 103, item_name: 'Pizza' }],
            },
          ],
        },
      ],
    };

    expect(talabatAdapter.extractMenuRestaurants(payload)).toEqual([
      {
        restaurantId: 42081,
        rawRestaurantId: '42081',
        items: [
          { item_id: 101, item_name: 'Burger' },
          { item_id: 102, item_name: 'Fries' },
          { item_id: 103, item_name: 'Pizza' },
        ],
      },
    ]);
  });

  it('rejects an invalid restaurant ID', () => {
    const result = talabatAdapter.extractMenuRestaurants({
      results: [{ outletCode: 'invalid', category: [] }],
    });

    expect(result[0].restaurantId).toBeNull();
  });

  it('handles a missing results array', () => {
    expect(
      talabatAdapter.extractMenuRestaurants({
        Message: 'This is not restaurant page (Talabat).',
      }),
    ).toEqual([]);
  });

  it('handles missing categories', () => {
    const result = talabatAdapter.extractMenuRestaurants({
      results: [{ outletCode: 42081 }],
    });

    expect(result[0].items).toEqual([]);
  });
});
