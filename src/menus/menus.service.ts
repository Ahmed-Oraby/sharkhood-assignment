import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Menu } from './schemas/menu.schema';
import { SyncError } from '../locations/schemas/sync-error.schema';
import { normalizeMenu, NormalizedMenu } from './normalizers/menu.normalizer';
import { mapFields } from '../core/mapping/field-mapper';
import { getProviderAdapter } from '../providers/provider-registry';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel('RawMenu', 'raw')
    private readonly rawMenuModel: Model<any>,

    @InjectModel(Menu.name, 'target')
    private readonly menuModel: Model<Menu>,

    @InjectModel(SyncError.name, 'target')
    private readonly syncErrorModel: Model<SyncError>,
  ) {}

  private async quarantine(
    document: any,
    recordIndex: number,
    reason: string,
    rawRecord: unknown,
    runId?: string,
  ): Promise<void> {
    const sourceDocumentId = String(document._id);

    await this.syncErrorModel.updateOne(
      {
        sourceCollection: 'raw_menus',
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
          sourceCollection: 'raw_menus',
          sourceDocumentId,
          recordIndex,
        },
        ...(runId ? { $addToSet: { runIds: runId } } : {}),
      },
      { upsert: true },
    );
  }

  async syncMenus(documentIds?: string[], runId?: string) {
    const stats = {
      rawDocuments: 0,
      successfulDocuments: 0,
      providerErrors: 0,
      occurrences: 0,
      invalidRecords: 0,
      uniqueMenus: 0,
      upsertedCount: 0,
      modifiedCount: 0,
    };

    const seenKeys = new Set<string>();
    const pending: NormalizedMenu[] = [];
    const batchSize = 500;

    const flush = async () => {
      if (pending.length === 0) return;

      const operations = pending.map((menu) => ({
        updateOne: {
          filter: {
            provider: menu.provider,
            restaurantId: menu.restaurantId,
            itemId: menu.itemId,
          },
          update: {
            $set: {
              name: menu.name,
              description: menu.description,
              price: menu.price,
              image: menu.image,
            },
            $setOnInsert: {
              provider: menu.provider,
              restaurantId: menu.restaurantId,
              itemId: menu.itemId,
            },
          },
          upsert: true,
          timestamps: false,
        },
      }));

      const result = await this.menuModel.bulkWrite(operations);

      stats.upsertedCount += result.upsertedCount;
      stats.modifiedCount += result.modifiedCount;

      pending.length = 0;
    };

    const filter = documentIds?.length
      ? { _id: { $in: documentIds.map((id) => new Types.ObjectId(id)) } }
      : {};

    const cursor = this.rawMenuModel
      .find(filter)
      .lean()
      .cursor({ batchSize: 50 });

    for await (const document of cursor) {
      stats.rawDocuments++;

      const payload = document.payload;
      const adapter = getProviderAdapter(document.domain);

      if (
        !payload ||
        !Array.isArray(payload.results) ||
        payload.results.length === 0
      ) {
        stats.providerErrors++;

        await this.quarantine(
          document,
          -1,
          typeof payload?.Message === 'string'
            ? payload.Message
            : 'Missing or empty payload.results',
          {
            message: payload?.Message,
            statusCode: document.statusCode,
          },
          runId,
        );

        continue;
      }

      stats.successfulDocuments++;

      // Stable index scoped to this source document.
      let recordIndex = 0;

      const restaurants = adapter.extractMenuRestaurants(payload);

      for (const restaurant of restaurants) {
        const restaurantId = restaurant.restaurantId;

        if (restaurantId === null) {
          stats.invalidRecords++;

          await this.quarantine(
            document,
            -2,
            'Invalid restaurant outletCode',
            {
              outletCode: restaurant.rawRestaurantId,
            },
            runId,
          );

          continue;
        }

        for (const item of restaurant.items) {
          stats.occurrences++;
          recordIndex++;

          const mappedItem = mapFields(
            item as Record<string, unknown>,
            adapter.mappings.menu,
          );

          const result = normalizeMenu(
            mappedItem,
            document.domain,
            restaurantId,
          );

          if (!result.success) {
            stats.invalidRecords++;

            await this.quarantine(
              document,
              recordIndex,
              result.reason,
              item,
              runId,
            );

            continue;
          }

          const menu = result.data;
          const key = `${menu.provider}:${menu.restaurantId}:${menu.itemId}`;

          if (seenKeys.has(key)) continue;

          seenKeys.add(key);
          stats.uniqueMenus++;

          pending.push(menu);

          if (pending.length >= batchSize) {
            await flush();
          }
        }
      }
    }

    await flush();

    return stats;
  }
}
