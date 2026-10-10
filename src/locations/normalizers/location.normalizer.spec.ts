import { normalizeLocation } from './location.normalizer';
import { mapFields } from '../../core/mapping/field-mapper';
import { talabatLocationMapping } from '../../providers/talabat/talabat.mapping';

describe('normalizeLocation', () => {
  it('normalizes a valid location', () => {
    const result = normalizeLocation(
      {
        locationId: 1552,
        name: 'Al Ramtha',
        slug: 'al-ramtha',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: true,
      data: {
        provider: 'talabat',
        locationId: 1552,
        name: 'Al Ramtha',
        slug: 'al-ramtha',
      },
    });
  });

  it('rejects an invalid location ID', () => {
    const result = normalizeLocation(
      {
        locationId: '1552',
        name: 'Al Ramtha',
        slug: 'al-ramtha',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid locationId',
    });
  });

  it('rejects a missing location name', () => {
    const result = normalizeLocation(
      {
        locationId: 1552,
        slug: 'al-ramtha',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid name',
    });
  });

  it('rejects a non-object input', () => {
    expect(normalizeLocation(null, 'talabat')).toEqual({
      success: false,
      reason: 'Location must be an object',
    });
  });

  it('rejects a missing provider', () => {
    expect(
      normalizeLocation(
        {
          locationId: 1552,
          name: 'Al Ramtha',
          slug: 'al-ramtha',
        },
        '',
      ),
    ).toEqual({
      success: false,
      reason: 'Provider is required',
    });
  });

  it('maps Talabat location fields to canonical fields', () => {
    const mapped = mapFields(
      {
        location_id: 123,
        location_name: 'Dubai Marina',
        location_slug: 'dubai-marina',
      },
      talabatLocationMapping,
    );

    expect(mapped).toEqual({
      locationId: 123,
      name: 'Dubai Marina',
      slug: 'dubai-marina',
    });
  });
});
