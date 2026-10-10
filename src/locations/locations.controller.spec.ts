import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

describe('LocationsController', () => {
  let controller: LocationsController;

  const locationsServiceMock = {
    getRawDocumentCount: jest.fn().mockResolvedValue(8),
    getFirstRawDocument: jest.fn().mockResolvedValue({
      domain: 'talabat',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: locationsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return the raw document count', async () => {
    await expect(controller.getRawDocumentCount()).resolves.toEqual({
      count: 8,
    });
  });

  it('should return a raw document sample', async () => {
    await expect(controller.getFirstRawDocument()).resolves.toEqual({
      domain: 'talabat',
    });
  });
});
