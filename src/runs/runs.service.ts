import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Run, RunDocument, RunStatus } from './schemas/run.schema';
import { ProcessingService } from '../processing/processing.service';
import { BadRequestException } from '@nestjs/common';
import { SyncError } from '../locations/schemas/sync-error.schema';

@Injectable()
export class RunsService {
  constructor(
    @InjectModel(Run.name)
    private readonly runModel: Model<Run>,

    private readonly processingService: ProcessingService,

    @InjectModel(SyncError.name)
    private readonly syncErrorModel: Model<SyncError>,
  ) {}

  async createRun(provider = 'talabat'): Promise<RunDocument> {
    return this.runModel.create({
      provider,
      status: RunStatus.PENDING,
    });
  }

  async getRun(id: string): Promise<RunDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Run not found');
    }

    const run = await this.runModel.findById(id).exec();

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    return run;
  }

  async startRun(provider = 'talabat') {
    const run = await this.createRun(provider);

    try {
      await this.processingService.enqueueRun(String(run._id), provider);
    } catch (error) {
      await this.runModel.findByIdAndUpdate(run._id, {
        $set: {
          status: RunStatus.FAILED,
          completedAt: new Date(),
          lastError:
            error instanceof Error ? error.message : 'Failed to enqueue run',
        },
      });

      throw error;
    }

    return {
      runId: String(run._id),
      status: RunStatus.PENDING,
    };
  }

  async getRunErrors(runId: string, page = 1, limit = 20) {
    if (!Types.ObjectId.isValid(runId)) {
      throw new BadRequestException('Invalid run ID');
    }

    // Reuse the existing method to verify that the run exists.
    await this.getRun(runId);

    const filter = { runIds: runId };

    const [errors, total] = await Promise.all([
      this.syncErrorModel
        .find(filter)
        .select('-rawRecord')
        .sort({ sourceCollection: 1, recordIndex: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      this.syncErrorModel.countDocuments(filter),
    ]);

    return {
      runId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      errors,
    };
  }
}
