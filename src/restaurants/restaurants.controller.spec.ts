import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

describe('RestaurantsController', () => {
  let controller: RestaurantsController;

  const restaurantsServiceMock = {
    syncRestaurants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        {
          provide: RestaurantsService,
          useValue: restaurantsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<RestaurantsController>(RestaurantsController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should trigger restaurant synchronization', async () => {
    const mockResult = {
      rawDocuments: 70,
      occurrences: 1011,
      uniqueRestaurants: 302,
      invalidRecords: 0,
      providerErrors: 2,
      upsertedCount: 302,
      modifiedCount: 0,
    };

    restaurantsServiceMock.syncRestaurants.mockResolvedValue(mockResult);

    await expect(controller.syncRestaurants()).resolves.toEqual(mockResult);

    expect(restaurantsServiceMock.syncRestaurants).toHaveBeenCalledTimes(1);
  });
});
