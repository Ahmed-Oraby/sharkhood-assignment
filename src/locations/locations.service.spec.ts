import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LocationsService } from './locations.service';
import { Location } from './schemas/location.schema';
import { SyncError } from './schemas/sync-error.schema';

describe('LocationsService', () => {
  let service: LocationsService;

  const rawLocationModelMock = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(8),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          domain: 'talabat',
        }),
      }),
    }),
    find: jest.fn(),
  };

  const locationModelMock = {
    bulkWrite: jest.fn(),
  };

  const syncErrorModelMock = {
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getModelToken('RawLocation'),
          useValue: rawLocationModelMock,
        },
        {
          provide: getModelToken(Location.name),
          useValue: locationModelMock,
        },
        {
          provide: getModelToken(SyncError.name),
          useValue: syncErrorModelMock,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return the raw document count', async () => {
    await expect(service.getRawDocumentCount()).resolves.toBe(8);
  });

  it('should return the first raw document', async () => {
    await expect(service.getFirstRawDocument()).resolves.toEqual({
      domain: 'talabat',
    });
  });
});
