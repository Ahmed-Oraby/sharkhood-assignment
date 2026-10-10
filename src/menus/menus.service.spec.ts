import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { Menu } from './schemas/menu.schema';
import { SyncError } from '../locations/schemas/sync-error.schema';

describe('MenusService', () => {
  let service: MenusService;

  const rawMenuModelMock = {
    find: jest.fn(),
  };

  const menuModelMock = {
    bulkWrite: jest.fn(),
  };

  const syncErrorModelMock = {
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        {
          provide: getModelToken('RawMenu'),
          useValue: rawMenuModelMock,
        },
        {
          provide: getModelToken(Menu.name),
          useValue: menuModelMock,
        },
        {
          provide: getModelToken(SyncError.name),
          useValue: syncErrorModelMock,
        },
      ],
    }).compile();

    service = module.get<MenusService>(MenusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
