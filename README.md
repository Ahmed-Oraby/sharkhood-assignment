# Provider Data Factory

A backend data-processing service built with **NestJS, MongoDB, Redis, and BullMQ**.

The application imports raw provider data, validates and normalizes records, deduplicates entities, and persists the results into a separate MongoDB database.

Processing runs asynchronously through background jobs, with run tracking and quarantine of invalid records.

## Tech Stack

- **Node.js / TypeScript**
- **NestJS** — API and application modules
- **MongoDB / Mongoose** — raw and normalized data storage
- **BullMQ / Redis** — asynchronous batch processing
- **Jest** — unit testing
- **Docker Compose** — local deployment

## Architecture

The application separates raw provider data from normalized application data.

```text
Raw MongoDB
  ├── raw_locations
  ├── raw_restaurants
  └── raw_menus
          |
          v
    BullMQ Dispatcher
          |
          v
     Batch Workers
          |
          v
    Provider Adapter
          |
          v
    Field Mapping
          |
          v
      Validation
          |
          v
   Normalization
          |
          v
   Deduplication
          |
          v
    Target MongoDB
      ├── locations
      ├── restaurants
      ├── menus
      ├── runs
      ├── batch_results
      └── sync_errors
```

### Provider Adapter

Provider-specific logic is isolated in adapters.

The Talabat adapter handles:

- Mapping provider fields into canonical fields.
- Extracting restaurant IDs from URLs.
- Extracting restaurant IDs and flattening nested menu categories.

The normalization functions operate on canonical fields rather than provider-specific field names.

Additional providers can be supported by introducing new adapters and mapping configurations, although source discovery and some error handling remain provider-specific.

### Data Modeling and Deduplication

The target database uses the following entity identities:

| Entity     | Unique identity                    |
| ---------- | ---------------------------------- |
| Location   | `(provider, locationId)`           |
| Restaurant | `(provider, restaurantId)`         |
| Menu item  | `(provider, restaurantId, itemId)` |

MongoDB upserts allow repeated processing without creating duplicate entities.

### Invalid Records

Invalid source records are quarantined in `sync_errors` with their source document reference, reason, and raw record data.

Errors can be inspected through the API.

## Getting Started

### Requirements

- Docker
- Docker Compose

Node.js and npm are only required for running commands outside Docker.

### Start the application

```bash
docker compose up --build -d
```

This starts:

- NestJS API on port `3000`
- MongoDB on port `27017`
- Redis on port `6379`

Check container status:

```bash
docker compose ps
```

Check application health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "services": {
    "rawMongo": "up",
    "targetMongo": "up",
    "redis": "up"
  }
}
```

### Import Raw Data

Place the supplied raw dataset files in the project's `data/` directory.

The import script uses the `MONGODB_RAW_URI` environment variable to connect to the raw database.

With Node.js installed locally:

```bash
npm ci
node scripts/import-raw-data.js
```

Ensure `.env` contains:

```env
MONGODB_RAW_URI=mongodb://localhost:27017/provider_raw
MONGODB_TARGET_URI=mongodb://localhost:27017/provider_factory
REDIS_HOST=localhost
REDIS_PORT=6379
```

The raw datasets are not committed to the repository.

After importing, the running Dockerized application can process the records using the shared MongoDB service.

## API Endpoints

### Health Check

```http
GET /health
```

Reports MongoDB and Redis connectivity.

### Create Processing Run

```http
POST /runs
Content-Type: application/json
```

Request:

```json
{
  "provider": "talabat"
}
```

Example:

```bash
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{"provider":"talabat"}'
```

Returns a run identifier that can be used to monitor progress.

### Get Run Status

```http
GET /runs/:id
```

Example:

```bash
curl http://localhost:3000/runs/YOUR_RUN_ID
```

Run information includes:

- Status
- Provider
- Start and completion timestamps
- Total jobs
- Completed and failed jobs
- Processed and invalid record counters
- Last error

### Get Run Errors

```http
GET /runs/:id/errors
```

Example:

```bash
curl http://localhost:3000/runs/YOUR_RUN_ID/errors
```

Returns paginated quarantine records associated with the processing run.

## Background Processing

The application uses a BullMQ queue named `provider-processing`.

A dispatcher reads source document IDs from the raw collections and schedules batch jobs.

Workers process the batches using the corresponding domain services.

Implemented processing features include:

- Cursor-based source reads
- Batched processing
- Configured worker concurrency
- Job retries with exponential backoff
- Batch completion tracking
- Run-level counters
- MongoDB upserts for idempotent entity writes

## Testing

Run unit tests:

```bash
npm test
```

Build the project:

```bash
npm run build
```

The test suite covers normalization, field mapping, and provider-specific extraction logic.

## Verified Results

The supplied Talabat dataset was processed successfully using Docker Compose.

| Metric                       |  Result |
| ---------------------------- | ------: |
| Completed batch jobs         | 24 / 24 |
| Failed jobs                  |       0 |
| Processed record occurrences |  37,689 |
| Invalid records              |     157 |
| Unique locations             |     697 |
| Unique restaurants           |     302 |
| Unique menu items            |  28,773 |
| Quarantined records          |     157 |

The completed Docker processing run took approximately **1.76 seconds** in the local test environment.

Repeated processing preserved the expected target entity counts.

## Design Decisions

**Separate databases:** Raw provider data is stored in `provider_raw`, while normalized entities and processing metadata are stored in `provider_factory`.

**Provider adapters:** Provider-specific field mappings and extraction logic are separated from canonical normalization.

**Batch processing:** BullMQ jobs split the workload into smaller units rather than processing the complete dataset in one request.

**Idempotency:** Entity identities and upserts prevent duplicate target records during repeated processing.

**Quarantine:** Invalid records are retained for inspection instead of silently discarded.

## Known Limitations

- Run-level tracking provides aggregate counters rather than detailed timing and counters for every transformation stage.
- Some source discovery and provider-error handling remain tied to the current raw dataset structure.
- Job completion tracking relies on worker events and does not yet provide full crash-recovery reconciliation.
- A dedicated dead-letter queue and automated replay mechanism are not implemented.
- Unit tests are implemented; a dedicated automated end-to-end integration test is not included.
- The sample raw datasets must be imported separately before processing.

## Project Status

The core data-processing pipeline, provider adapter, quarantine mechanism, run-tracking API, and Docker deployment are implemented and verified against the supplied dataset.
