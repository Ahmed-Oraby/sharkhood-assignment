import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RunDocument = HydratedDocument<Run>;

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({
  timestamps: true,
  collection: 'runs',
})
export class Run {
  @Prop({
    type: String,
    enum: Object.values(RunStatus),
    default: RunStatus.PENDING,
  })
  status: RunStatus;

  @Prop({ required: true, default: 'talabat' })
  provider: string;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  totalJobs: number;

  @Prop({ type: Number, default: 0 })
  completedJobs: number;

  @Prop({ type: Number, default: 0 })
  failedJobs: number;

  @Prop({ type: Number, default: 0 })
  processedRecords: number;

  @Prop({ type: Number, default: 0 })
  invalidRecords: number;

  @Prop({ type: String, default: null })
  lastError: string | null;

  @Prop({ default: false })
  dispatchCompleted: boolean;
}

export const RunSchema = SchemaFactory.createForClass(Run);
