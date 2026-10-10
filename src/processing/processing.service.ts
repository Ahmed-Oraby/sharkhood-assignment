import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProcessingService {
  constructor(
    @InjectQueue('provider-processing')
    private readonly queue: Queue,

    @InjectModel('RawLocation', 'raw')
    private readonly rawLocationModel: Model<any>,

    @InjectModel('RawRestaurant', 'raw')
    private readonly rawRestaurantModel: Model<any>,

    @InjectModel('RawMenu', 'raw')
    private readonly rawMenuModel: Model<any>,
  ) {}

  async enqueueRun(runId: string, provider: string) {
    const job = await this.queue.add(
      'dispatch-run',
      {
        runId,
        provider,
      },
      {
        jobId: `dispatch-${runId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    );

    return job.id;
  }

  async dispatchBatches(runId: string, provider: string) {
    const sources = [
      {
        collection: 'raw_locations',
        model: this.rawLocationModel,
      },
      {
        collection: 'raw_restaurants',
        model: this.rawRestaurantModel,
      },
      {
        collection: 'raw_menus',
        model: this.rawMenuModel,
      },
    ];

    const batchSize = 25;
    let totalJobs = 0;

    for (const source of sources) {
      let batch: string[] = [];
      let batchNumber = 0;

      const cursor = source.model
        .find({ domain: provider })
        .select('_id')
        .lean()
        .cursor({ batchSize });

      for await (const document of cursor) {
        batch.push(String(document._id));

        if (batch.length === batchSize) {
          await this.queue.add(
            'process-batch',
            {
              runId,
              provider,
              sourceCollection: source.collection,
              documentIds: batch,
            },
            {
              jobId: `${runId}-${source.collection}-${batchNumber}`,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
              removeOnComplete: 100,
              removeOnFail: false,
            },
          );

          totalJobs++;
          batchNumber++;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await this.queue.add(
          'process-batch',
          {
            runId,
            provider,
            sourceCollection: source.collection,
            documentIds: batch,
          },
          {
            jobId: `${runId}-${source.collection}-${batchNumber}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: false,
          },
        );

        totalJobs++;
      }
    }

    return { totalJobs };
  }
}
