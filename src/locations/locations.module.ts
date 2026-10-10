import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { Location, LocationSchema } from './schemas/location.schema';
import { SyncError, SyncErrorSchema } from './schemas/sync-error.schema';

@Module({
  imports: [
    // Read-only source database
    MongooseModule.forFeature(
      [
        {
          name: 'RawLocation',
          schema: {},
          collection: 'raw_locations',
        },
      ],
      'raw',
    ),

    // Normalized target database
    MongooseModule.forFeature(
      [
        {
          name: Location.name,
          schema: LocationSchema,
          collection: 'locations',
        },
        {
          name: SyncError.name,
          schema: SyncErrorSchema,
        },
      ],
      'target',
    ),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
