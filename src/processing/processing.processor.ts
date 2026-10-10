import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';

import { ProcessingService } from './processing.service';
import { LocationsService } from '../locations/locations.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MenusService } from '../menus/menus.service';
import { Run, RunStatus } from '../runs/schemas/run.schema';
import { BatchResult } from '../runs/schemas/batch-result.schema';

interface BatchJobData {
  runId: string;
  provider: string;
  sourceCollection: string;
  documentIds: string[];
}

@Processor('provider-processing', {
  concurrency: 3,
})
export class ProcessingProcessor extends WorkerHost {
  constructor(
    private readonly processingService: ProcessingService,

    private readonly locationsService: LocationsService,

    private readonly restaurantsService: RestaurantsService,

    private readonly menusService: MenusService,

    @InjectModel(Run.name, 'target')
    private readonly runModel: Model<Run>,

    @InjectModel(BatchResult.name, 'target')
    private readonly batchResultModel: Model<BatchResult>,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'dispatch-run':
        return this.dispatchRun(job);

      case 'process-batch':
        return this.processBatch(job);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async dispatchRun(job: Job) {
    const { runId, provider } = job.data;

    console.log(`[Dispatcher] Starting run ${runId}`);

    await this.runModel.findByIdAndUpdate(runId, {
      $set: { status: RunStatus.RUNNING, startedAt: new Date() },
    });

    const result = await this.processingService.dispatchBatches(
      runId,
      provider,
    );

    await this.runModel.findByIdAndUpdate(runId, {
      $set: {
        totalJobs: result.totalJobs,
        dispatchCompleted: true,
      },
    });

    await this.finalizeRun(runId);

    console.log(`[Dispatcher] Queued ${result.totalJobs} batch jobs`);

    return result;
  }

  private async processBatch(job: Job<BatchJobData>) {
    const { runId, sourceCollection, documentIds } = job.data;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new Error('Batch must contain document IDs');
    }

    console.log(
      `[Batch] Processing ${sourceCollection}: ` +
        `${documentIds.length} documents`,
    );

    let result: Record<string, any>;

    switch (sourceCollection) {
      case 'raw_locations':
        result = await this.locationsService.syncLocations(documentIds, runId);
        break;

      case 'raw_restaurants':
        result = await this.restaurantsService.syncRestaurants(
          documentIds,
          runId,
        );
        break;

      case 'raw_menus':
        result = await this.menusService.syncMenus(documentIds, runId);
        break;

      default:
        throw new Error(`Unsupported source collection: ${sourceCollection}`);
    }

    const processedRecords =
      result.locationOccurrences ?? result.occurrences ?? 0;

    const invalidRecords =
      (result.invalidOccurrences ?? result.invalidRecords ?? 0) +
      (result.providerErrors ?? 0);

    console.log(
      `[Batch] Finished ${sourceCollection}: ` +
        `${processedRecords} occurrences, ` +
        `${invalidRecords} errors`,
    );

    return {
      runId,
      sourceCollection,
      processedRecords,
      invalidRecords,
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    if (job.name !== 'process-batch') return;

    const result = job.returnvalue as {
      runId: string;
      sourceCollection: string;
      processedRecords: number;
      invalidRecords: number;
    };

    if (!result || !job.id) return;

    try {
      await this.batchResultModel.updateOne(
        {
          runId: result.runId,
          jobId: job.id,
        },
        {
          $setOnInsert: {
            runId: result.runId,
            jobId: job.id,
            sourceCollection: result.sourceCollection,
            processedRecords: result.processedRecords,
            invalidRecords: result.invalidRecords,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 11000
      ) {
        throw error;
      }
    }

    const totals = await this.batchResultModel.aggregate([
      { $match: { runId: result.runId } },
      {
        $group: {
          _id: null,
          completedJobs: { $sum: 1 },
          processedRecords: { $sum: '$processedRecords' },
          invalidRecords: { $sum: '$invalidRecords' },
        },
      },
    ]);

    const summary = totals[0];

    if (!summary) return;

    await this.runModel.findByIdAndUpdate(result.runId, {
      $max: {
        completedJobs: summary.completedJobs,
        processedRecords: summary.processedRecords,
        invalidRecords: summary.invalidRecords,
      },
    });

    console.log(
      `[Run ${result.runId}] Completed ${summary.completedJobs} batches`,
    );

    await this.finalizeRun(result.runId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    console.error(`[Job ${job.id}] Failed: ${error.message}`);

    if (job.attemptsMade < (job.opts.attempts ?? 1)) {
      return; // BullMQ will retry this job.
    }

    const { runId } = job.data;
    if (!runId) return;

    if (job.name === 'dispatch-run') {
      await this.runModel.findByIdAndUpdate(runId, {
        $set: {
          status: RunStatus.FAILED,
          completedAt: new Date(),
          lastError: error.message,
        },
      });
      return;
    }

    if (job.name === 'process-batch') {
      // This initial implementation counts terminal failures.
      await this.runModel.findByIdAndUpdate(runId, {
        $inc: { failedJobs: 1 },
        $set: { lastError: error.message },
      });

      await this.finalizeRun(runId);
    }
  }

  private async finalizeRun(runId: string) {
    const run = await this.runModel.findById(runId).lean();

    if (!run || !run.dispatchCompleted) return;

    if (run.completedJobs + run.failedJobs < run.totalJobs) {
      return;
    }

    const hasFailures = run.failedJobs > 0;

    await this.runModel.updateOne(
      {
        _id: run._id,
        status: RunStatus.RUNNING,
        dispatchCompleted: true,
      },
      {
        $set: {
          status: hasFailures ? RunStatus.FAILED : RunStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
    );

    console.log(`[Run ${runId}] ${hasFailures ? 'FAILED' : 'COMPLETED'}`);
  }
}
