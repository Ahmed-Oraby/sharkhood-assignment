import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RestaurantsService } from './restaurants.service';
import { Restaurant } from './schemas/restaurant.schema';
import { SyncError } from '../locations/schemas/sync-error.schema';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  const rawRestaurantModelMock = {
    find: jest.fn(),
  };

  const restaurantModelMock = {
    bulkWrite: jest.fn(),
  };

  const syncErrorModelMock = {
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: getModelToken('RawRestaurant'),
          useValue: rawRestaurantModelMock,
        },
        {
          provide: getModelToken(Restaurant.name),
          useValue: restaurantModelMock,
        },
        {
          provide: getModelToken(SyncError.name),
          useValue: syncErrorModelMock,
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
