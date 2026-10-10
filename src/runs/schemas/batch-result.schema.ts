import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
  collection: 'batch_results',
})
export class BatchResult {
  @Prop({ required: true })
  runId: string;

  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true })
  sourceCollection: string;

  @Prop({ required: true })
  processedRecords: number;

  @Prop({ required: true })
  invalidRecords: number;
}

export const BatchResultSchema = SchemaFactory.createForClass(BatchResult);

BatchResultSchema.index({ runId: 1, jobId: 1 }, { unique: true });
