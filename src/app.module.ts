import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { LocationsModule } from './locations/locations.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenusModule } from './menus/menus.module';
import { ProcessingModule } from './processing/processing.module';
import { RunsModule } from './runs/runs.module';
import { HealthModule } from './health/health.module';
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      connectionName: 'raw',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_RAW_URI'),
      }),
    }),

    MongooseModule.forRootAsync({
      connectionName: 'target',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_TARGET_URI'),
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),

    LocationsModule,

    RestaurantsModule,

    MenusModule,

    ProcessingModule,

    RunsModule,

    HealthModule,
  ],
})
export class AppModule {}
