import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import {
  SyncError,
  SyncErrorSchema,
} from '../locations/schemas/sync-error.schema';

@Module({
  imports: [
    // Raw source database
    MongooseModule.forFeature(
      [
        {
          name: 'RawRestaurant',
          schema: new Schema({}, { strict: false }),
          collection: 'raw_restaurants',
        },
      ],
      'raw',
    ),

    // Normalized target database
    MongooseModule.forFeature(
      [
        {
          name: Restaurant.name,
          schema: RestaurantSchema,
        },
        {
          name: SyncError.name,
          schema: SyncErrorSchema,
        },
      ],
      'target',
    ),
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
