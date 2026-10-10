import { normalizeMenu } from './menu.normalizer';
import { mapFields } from '../../core/mapping/field-mapper';
import { talabatMenuMapping } from '../../providers/talabat/talabat.mapping';

describe('normalizeMenu', () => {
  const validItem = {
    itemId: 123,
    name: 'Chicken Burger',
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
      { ...validItem, itemId: undefined },
      'talabat',
      456,
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid itemId',
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

  it('rejects missing item name', () => {
    const result = normalizeMenu({ ...validItem, name: '' }, 'talabat', 456);

    expect(result).toEqual({
      success: false,
      reason: 'Invalid name',
    });
  });

  it('rejects invalid restaurant ID', () => {
    const result = normalizeMenu(validItem, 'talabat', -1);

    expect(result).toEqual({
      success: false,
      reason: 'Invalid restaurant ID',
    });
  });

  it('rejects invalid provider', () => {
    const result = normalizeMenu(validItem, '', 456);

    expect(result).toEqual({
      success: false,
      reason: 'Invalid provider',
    });
  });
});

describe('Talabat menu mapping', () => {
  it('maps Talabat fields to canonical fields', () => {
    const mapped = mapFields(
      {
        item_id: 123,
        item_name: 'Chicken Burger',
        description: 'Grilled chicken',
        price: 25.5,
        image: null,
      },
      talabatMenuMapping,
    );

    expect(mapped).toEqual({
      itemId: 123,
      name: 'Chicken Burger',
      description: 'Grilled chicken',
      price: 25.5,
      image: null,
    });
  });
});
