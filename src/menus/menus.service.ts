import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Menu } from './schemas/menu.schema';
import { SyncError } from '../locations/schemas/sync-error.schema';
import { normalizeMenu, NormalizedMenu } from './normalizers/menu.normalizer';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel('RawMenu')
    private readonly rawMenuModel: Model<any>,

    @InjectModel(Menu.name)
    private readonly menuModel: Model<Menu>,

    @InjectModel(SyncError.name)
    private readonly syncErrorModel: Model<SyncError>,
  ) {}

  private async quarantine(
    document: any,
    recordIndex: number,
    reason: string,
    rawRecord: unknown,
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
      },
      { upsert: true },
    );
  }

  async syncMenus() {
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

    const cursor = this.rawMenuModel.find({}).lean().cursor({ batchSize: 50 });

    for await (const document of cursor) {
      stats.rawDocuments++;

      const payload = document.payload;

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
        );

        continue;
      }

      stats.successfulDocuments++;

      for (const restaurant of payload.results) {
        const restaurantId = Number(restaurant?.outletCode);

        if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
          stats.invalidRecords++;

          await this.quarantine(document, -2, 'Invalid restaurant outletCode', {
            outletCode: restaurant?.outletCode,
          });

          continue;
        }

        const provider = document.domain || 'talabat';
        const categories = Array.isArray(restaurant.category)
          ? restaurant.category
          : [];

        for (const category of categories) {
          const items = Array.isArray(category?.items) ? category.items : [];

          for (const item of items) {
            stats.occurrences++;

            const result = normalizeMenu(item, provider, restaurantId);

            if (!result.success) {
              stats.invalidRecords++;

              // Record index must identify the nested item uniquely.
              // We will improve this to a structured source path later.
              await this.quarantine(
                document,
                stats.occurrences,
                result.reason,
                item,
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
    }

    await flush();

    return stats;
  }
}
