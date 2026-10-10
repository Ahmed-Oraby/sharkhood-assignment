const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

const sources = [
  {
    file: 'raw-locations.json',
    collection: 'raw_locations',
  },
  {
    file: 'raw-menus.json',
    collection: 'raw_menus',
  },
  {
    file: 'raw-restaurants.json',
    collection: 'raw_restaurants',
  },
];

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/provider_data_factory';

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db('provider_data_factory');

    for (const source of sources) {
      const filePath = path.join(DATA_DIR, source.file);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const documents = EJSON.parse(content);

      if (!Array.isArray(documents)) {
        throw new Error(`${source.file} must contain a JSON array`);
      }

      if (
        documents.some((doc) => !doc || typeof doc !== 'object' || !doc._id)
      ) {
        throw new Error(`${source.file} contains a document without an _id`);
      }

      const collection = db.collection(source.collection);

      if (documents.length > 0) {
        const operations = documents.map((doc) => ({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true,
          },
        }));

        await collection.bulkWrite(operations, { ordered: false });
      }

      const count = await collection.countDocuments();

      console.log(
        `${source.file} -> ${source.collection}: ` +
          `${documents.length} imported; ${count} currently stored`,
      );
    }

    console.log('Raw data import completed.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Import failed:', error.message);
  process.exitCode = 1;
});
