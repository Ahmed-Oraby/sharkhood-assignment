import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema } from 'mongoose';

import { ProcessingService } from './processing.service';
import { ProcessingProcessor } from './processing.processor';

import { Run, RunSchema } from '../runs/schemas/run.schema';
import {
  BatchResult,
  BatchResultSchema,
} from '../runs/schemas/batch-result.schema';

import { LocationsModule } from '../locations/locations.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { MenusModule } from '../menus/menus.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'provider-processing',
    }),

    // Source database: read-only
    MongooseModule.forFeature(
      [
        {
          name: 'RawLocation',
          schema: new Schema({}, { strict: false }),
          collection: 'raw_locations',
        },
        {
          name: 'RawRestaurant',
          schema: new Schema({}, { strict: false }),
          collection: 'raw_restaurants',
        },
        {
          name: 'RawMenu',
          schema: new Schema({}, { strict: false }),
          collection: 'raw_menus',
        },
      ],
      'raw',
    ),

    // Target database: run tracking and batch results
    MongooseModule.forFeature(
      [
        {
          name: Run.name,
          schema: RunSchema,
        },
        {
          name: BatchResult.name,
          schema: BatchResultSchema,
        },
      ],
      'target',
    ),

    LocationsModule,
    RestaurantsModule,
    MenusModule,
  ],
  providers: [ProcessingService, ProcessingProcessor],
  exports: [ProcessingService],
})
export class ProcessingModule {}
