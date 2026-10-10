import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { normalizeLocation } from './normalizers/location.normalizer';
import { Location } from './schemas/location.schema';
import { SyncError } from './schemas/sync-error.schema';
import { mapFields } from '../core/mapping/field-mapper';
import { getProviderAdapter } from '../providers/provider-registry';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel('RawLocation', 'raw')
    private readonly rawLocationModel: Model<any>,
    @InjectModel(Location.name, 'target')
    private readonly locationModel: Model<Location>,
    @InjectModel(SyncError.name, 'target')
    private readonly syncErrorModel: Model<SyncError>,
  ) {}

  async getRawDocumentCount(): Promise<number> {
    return this.rawLocationModel.countDocuments().exec();
  }

  async getFirstRawDocument(): Promise<any | null> {
    return this.rawLocationModel.findOne().lean().exec();
  }

  async getNormalizationPreview() {
    const uniqueLocations = new Map<string, object>();

    let rawSourceDocuments = 0;
    let locationOccurrences = 0;
    let validOccurrences = 0;
    let invalidOccurrences = 0;

    const cursor = this.rawLocationModel
      .find()
      .lean()
      .cursor({ batchSize: 100 });

    for await (const document of cursor) {
      rawSourceDocuments++;

      const provider =
        typeof document.domain === 'string' ? document.domain : '';

      const results = document.payload?.results;

      if (!Array.isArray(results)) {
        invalidOccurrences++;
        continue;
      }

      for (const rawLocation of results) {
        locationOccurrences++;

        const adapter = getProviderAdapter(document.domain);

        const mappedLocation = mapFields(
          rawLocation as Record<string, unknown>,
          adapter.mappings.location,
        );

        const result = normalizeLocation(mappedLocation, document.domain);

        if (!result.success) {
          invalidOccurrences++;
          continue;
        }

        validOccurrences++;

        const location = result.data;
        const key = `${location.provider}:${location.locationId}`;

        uniqueLocations.set(key, location);
      }
    }

    return {
      rawSourceDocuments,
      locationOccurrences,
      validOccurrences,
      uniqueLocations: uniqueLocations.size,
      duplicateOccurrences: validOccurrences - uniqueLocations.size,
      invalidOccurrences,
      sample: Array.from(uniqueLocations.values()).slice(0, 5),
    };
  }

  async syncLocations(documentIds?: string[], runId?: string) {
    const pending = new Map<
      string,
      {
        provider: string;
        locationId: number;
        name: string;
        slug: string;
      }
    >();

    const seenKeys = new Set<string>();

    let rawSourceDocuments = 0;
    let locationOccurrences = 0;
    let invalidOccurrences = 0;
    let writeOperations = 0;
    let upsertedCount = 0;
    let modifiedCount = 0;

    const flush = async () => {
      if (pending.size === 0) return;

      const operations = Array.from(pending.values()).map((location) => ({
        updateOne: {
          filter: {
            provider: location.provider,
            locationId: location.locationId,
          },
          update: {
            $set: {
              name: location.name,
              slug: location.slug,
            },
            $setOnInsert: {
              provider: location.provider,
              locationId: location.locationId,
            },
          },
          upsert: true,
          timestamps: false,
        },
      }));

      const result = await this.locationModel.bulkWrite(operations, {
        ordered: false,
      });

      writeOperations += operations.length;
      upsertedCount += result.upsertedCount;
      modifiedCount += result.modifiedCount;

      pending.clear();
    };

    const filter = documentIds?.length
      ? { _id: { $in: documentIds.map((id) => new Types.ObjectId(id)) } }
      : {};

    const cursor = this.rawLocationModel
      .find(filter)
      .lean()
      .cursor({ batchSize: 100 });

    for await (const document of cursor) {
      rawSourceDocuments++;

      const provider =
        typeof document.domain === 'string' ? document.domain : '';

      const results = document.payload?.results;

      if (!Array.isArray(results)) {
        invalidOccurrences++;
        continue;
      }

      for (const [index, rawLocation] of results.entries()) {
        locationOccurrences++;

        const adapter = getProviderAdapter(document.domain);

        const mappedLocation = mapFields(
          rawLocation as Record<string, unknown>,
          adapter.mappings.location,
        );

        const result = normalizeLocation(mappedLocation, document.domain);

        if (!result.success) {
          invalidOccurrences++;

          await this.syncErrorModel.updateOne(
            {
              sourceCollection: 'raw_locations',
              sourceDocumentId: String(document._id),
              recordIndex: index,
            },
            {
              $set: {
                provider,
                reason: result.reason,
                rawRecord: rawLocation,
              },
              $setOnInsert: {
                sourceCollection: 'raw_locations',
                sourceDocumentId: String(document._id),
                recordIndex: index,
              },
              ...(runId ? { $addToSet: { runIds: runId } } : {}),
            },
            { upsert: true },
          );

          continue;
        }

        const location = result.data;
        const key = `${location.provider}:${location.locationId}`;

        if (seenKeys.has(key)) {
          continue;
        }

        seenKeys.add(key);
        pending.set(key, location);

        if (pending.size >= 500) {
          await flush();
        }
      }
    }

    await flush();

    return {
      rawSourceDocuments,
      locationOccurrences,
      uniqueLocations: seenKeys.size,
      invalidOccurrences,
      writeOperations,
      upsertedCount,
      modifiedCount,
    };
  }
}
