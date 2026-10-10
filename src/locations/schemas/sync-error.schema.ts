import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type SyncErrorDocument = HydratedDocument<SyncError>;

@Schema({ timestamps: true, collection: 'sync_errors' })
export class SyncError {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  sourceCollection: string;

  @Prop({ required: true })
  sourceDocumentId: string;

  @Prop({ required: true })
  recordIndex: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: SchemaTypes.Mixed })
  rawRecord: unknown;

  @Prop({ type: [String], default: [] })
  runIds: string[];
}

export const SyncErrorSchema = SchemaFactory.createForClass(SyncError);

SyncErrorSchema.index(
  { sourceCollection: 1, sourceDocumentId: 1, recordIndex: 1 },
  { unique: true },
);
