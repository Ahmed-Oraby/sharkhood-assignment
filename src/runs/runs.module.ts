import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { Run, RunSchema } from './schemas/run.schema';
import { ProcessingModule } from '../processing/processing.module';
import {
  SyncError,
  SyncErrorSchema,
} from '../locations/schemas/sync-error.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Run.name,
        schema: RunSchema,
      },
      {
        name: SyncError.name,
        schema: SyncErrorSchema,
      },
    ]),
    ProcessingModule,
  ],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
