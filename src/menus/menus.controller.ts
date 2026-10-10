import { Controller, Post } from '@nestjs/common';
import { MenusService } from './menus.service';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post('sync')
  syncMenus() {
    return this.menusService.syncMenus();
  }
}
