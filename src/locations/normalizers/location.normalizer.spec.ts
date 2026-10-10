import { normalizeLocation } from './location.normalizer';

describe('normalizeLocation', () => {
  it('normalizes a valid location', () => {
    const result = normalizeLocation(
      {
        location_id: 1552,
        location_name: 'Al Ramtha',
        location_slug: 'al-ramtha',
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
        location_id: '1552',
        location_name: 'Al Ramtha',
        location_slug: 'al-ramtha',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid location_id',
    });
  });

  it('rejects a missing location name', () => {
    const result = normalizeLocation(
      {
        location_id: 1552,
        location_slug: 'al-ramtha',
      },
      'talabat',
    );

    expect(result).toEqual({
      success: false,
      reason: 'Invalid location_name',
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
          location_id: 1552,
          location_name: 'Al Ramtha',
          location_slug: 'al-ramtha',
        },
        '',
      ),
    ).toEqual({
      success: false,
      reason: 'Provider is required',
    });
  });
});
