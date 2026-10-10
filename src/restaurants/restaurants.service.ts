import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Restaurant } from './schemas/restaurant.schema';
import {
  normalizeRestaurant,
  NormalizedRestaurant,
} from './normalizers/restaurant.normalizer';
import { SyncError } from '../locations/schemas/sync-error.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel('RawRestaurant')
    private readonly rawModel: Model<any>,

    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,

    @InjectModel(SyncError.name)
    private readonly syncErrorModel: Model<SyncError>,
  ) {}

  async syncRestaurants(documentIds?: string[], runId?: string) {
    const unique = new Map<string, NormalizedRestaurant>();

    let rawDocuments = 0;
    let occurrences = 0;
    let invalidRecords = 0;
    let providerErrors = 0;

    const filter = documentIds?.length
      ? { _id: { $in: documentIds.map((id) => new Types.ObjectId(id)) } }
      : {};

    const cursor = this.rawModel.find(filter).lean().cursor({ batchSize: 50 });

    for await (const document of cursor) {
      rawDocuments++;

      const payload = document.payload;

      const pageError = payload?.['Page Error Message'];

      const providerMessage =
        typeof payload?.error === 'string' ? payload.error.trim() : '';

      const hasProviderError =
        (typeof pageError === 'string' && pageError.trim() !== '') ||
        providerMessage !== '';

      if (!payload || hasProviderError || !Array.isArray(payload.results)) {
        providerErrors++;

        const reason =
          (typeof pageError === 'string' && pageError.trim()) ||
          providerMessage ||
          'Missing or invalid payload.results';

        await this.quarantine(
          document,
          -1,
          reason,
          {
            message: pageError,
            error: payload?.error,
            params: document.params,
            statusCode: document.statusCode,
          },
          runId,
        );

        continue;
      }

      for (const [index, rawRestaurant] of payload.results.entries()) {
        occurrences++;

        const result = normalizeRestaurant(rawRestaurant, document.domain);

        if (!result.success) {
          invalidRecords++;

          await this.quarantine(
            document,
            index,
            result.reason,
            rawRestaurant,
            runId,
          );

          continue;
        }

        const restaurant = result.data;
        const key = `${restaurant.provider}:${restaurant.restaurantId}`;

        // The same restaurant can appear in multiple areas.
        // Keep one record per stable restaurant ID.
        if (!unique.has(key)) {
          unique.set(key, restaurant);
        }
      }
    }

    let upsertedCount = 0;
    let modifiedCount = 0;

    const restaurants = Array.from(unique.values());

    for (let i = 0; i < restaurants.length; i += 200) {
      const batch = restaurants.slice(i, i + 200);

      const result = await this.restaurantModel.bulkWrite(
        batch.map((restaurant) => ({
          updateOne: {
            filter: {
              provider: restaurant.provider,
              restaurantId: restaurant.restaurantId,
            },
            update: {
              $set: {
                name: restaurant.name,
                url: restaurant.url,
              },
              $setOnInsert: {
                provider: restaurant.provider,
                restaurantId: restaurant.restaurantId,
              },
            },
            upsert: true,
            timestamps: false,
          },
        })),
        { ordered: false },
      );

      upsertedCount += result.upsertedCount;
      modifiedCount += result.modifiedCount;
    }

    return {
      rawDocuments,
      occurrences,
      uniqueRestaurants: unique.size,
      invalidRecords,
      providerErrors,
      upsertedCount,
      modifiedCount,
    };
  }

  private async quarantine(
    document: any,
    recordIndex: number,
    reason: string,
    rawRecord: unknown,
    runId?: string,
  ) {
    const sourceDocumentId = String(document._id);

    console.log('[Restaurant quarantine]', {
      runId,
      sourceDocumentId,
      recordIndex,
      reason,
    });

    await this.syncErrorModel.updateOne(
      {
        sourceCollection: 'raw_restaurants',
        sourceDocumentId,
        recordIndex,
      },
      {
        $set: {
          provider: document.domain || 'unknown',
          reason,
          rawRecord,
        },
        $setOnInsert: {
          sourceCollection: 'raw_restaurants',
          sourceDocumentId,
          recordIndex,
        },
        ...(runId ? { $addToSet: { runIds: runId } } : {}),
      },
      { upsert: true },
    );
  }
}
