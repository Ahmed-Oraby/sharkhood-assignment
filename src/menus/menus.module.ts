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
    // Read-only source database
    MongooseModule.forFeature(
      [
        {
          name: 'RawMenu',
          schema: new Schema({}, { strict: false }),
          collection: 'raw_menus',
        },
      ],
      'raw',
    ),

    // Normalized target database
    MongooseModule.forFeature(
      [
        {
          name: Menu.name,
          schema: MenuSchema,
        },
        {
          name: SyncError.name,
          schema: SyncErrorSchema,
        },
      ],
      'target',
    ),
  ],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
