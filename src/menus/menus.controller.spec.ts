import { Test, TestingModule } from '@nestjs/testing';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

describe('MenusController', () => {
  let controller: MenusController;

  const menusServiceMock = {
    syncMenus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenusController],
      providers: [
        {
          provide: MenusService,
          useValue: menusServiceMock,
        },
      ],
    }).compile();

    controller = module.get<MenusController>(MenusController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should trigger menu synchronization', async () => {
    const mockResult = {
      rawDocuments: 500,
      successfulDocuments: 345,
      providerErrors: 155,
      occurrences: 31102,
      invalidRecords: 0,
      uniqueMenus: 28773,
      upsertedCount: 28773,
      modifiedCount: 0,
    };

    menusServiceMock.syncMenus.mockResolvedValue(mockResult);

    await expect(controller.syncMenus()).resolves.toEqual(mockResult);

    expect(menusServiceMock.syncMenus).toHaveBeenCalledTimes(1);
  });
});
