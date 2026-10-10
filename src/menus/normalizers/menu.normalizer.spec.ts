import { normalizeMenu } from './menu.normalizer';

describe('normalizeMenu', () => {
  const validItem = {
    item_id: 123,
    item_name: 'Chicken Burger',
    description: 'Grilled chicken',
    price: 25.5,
    image: null,
  };

  it('normalizes a valid item', () => {
    const result = normalizeMenu(validItem, 'talabat', 456);

    expect(result).toEqual({
      success: true,
      data: {
        provider: 'talabat',
        restaurantId: 456,
        itemId: 123,
        name: 'Chicken Burger',
        description: 'Grilled chicken',
        price: 25.5,
        image: null,
      },
    });
  });

  it('rejects missing item ID', () => {
    const result = normalizeMenu(
      { ...validItem, item_id: undefined },
      'talabat',
      456,
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid item_id',
    });
  });

  it('rejects negative price', () => {
    const result = normalizeMenu({ ...validItem, price: -5 }, 'talabat', 456);

    expect(result).toEqual({
      success: false,
      reason: 'Invalid price',
    });
  });

  it('accepts missing image', () => {
    const result = normalizeMenu(
      { ...validItem, image: undefined },
      'talabat',
      456,
    );

    expect(result.success).toBe(true);
  });
});
