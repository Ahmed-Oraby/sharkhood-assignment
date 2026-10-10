import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema } from 'mongoose';

import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { Menu, MenuSchema } from './schemas/menu.schema';
import {
  SyncError,
  SyncErrorSchema,
} from '../locations/schemas/sync-error.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'RawMenu',
        schema: new Schema({}, { strict: false }),
        collection: 'raw_menus',
      },
      {
        name: Menu.name,
        schema: MenuSchema,
      },
      {
        name: SyncError.name,
        schema: SyncErrorSchema,
      },
    ]),
  ],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
