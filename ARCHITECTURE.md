# Architecture — Provider Data Factory

## 1. Overview

Provider Data Factory is a NestJS application that transforms raw third-party provider data into normalized domain entities.

The architecture separates data ingestion, provider-specific extraction, validation, normalization, persistence, and asynchronous job orchestration.

The current implementation supports Talabat data and provides extension points for additional providers.

## 2. System Components

```text
REST API
   |
   v
RunsService
   |
   v
BullMQ Queue (Redis)
   |
   +-- Dispatcher
   |      |
   |      +-- Read raw document IDs
   |      +-- Schedule batch jobs
   |
   +-- Batch Workers
          |
          +-- Provider Adapter
          +-- Declarative Field Mapping
          +-- Normalization & Validation
          +-- Deduplication
          +-- MongoDB Bulk Upserts
          +-- Error Quarantine
```

### Main Components

- **RunsModule:** Creates processing runs and exposes run status and error endpoints.
- **ProcessingModule:** Dispatches jobs and tracks batch execution.
- **LocationsModule:** Processes location records.
- **RestaurantsModule:** Processes restaurant records.
- **MenusModule:** Processes nested restaurant menu items.
- **Provider Adapter:** Encapsulates Talabat-specific extraction and field mappings.
- **HealthModule:** Checks MongoDB and Redis connectivity.

## 3. Data Storage

Two MongoDB databases are used.

### Raw Database: `provider_raw`

Contains the original source collections:

- `raw_locations`
- `raw_restaurants`
- `raw_menus`

The processing pipeline reads from these collections without modifying source records.

### Target Database: `provider_factory`

Contains normalized entities and processing metadata:

- `locations`
- `restaurants`
- `menus`
- `runs`
- `batch_results`
- `sync_errors`

Separating the databases protects raw source data and allows normalization logic to evolve independently.

## 4. Domain Model

| Entity     | Identity                         | Main fields                     |
| ---------- | -------------------------------- | ------------------------------- |
| Location   | provider + locationId            | name, slug                      |
| Restaurant | provider + restaurantId          | name, url                       |
| Menu       | provider + restaurantId + itemId | name, description, price, image |

The relationships are represented through provider-specific identifiers.

A menu item belongs to a restaurant through `(provider, restaurantId)`.

The current implementation does not require MongoDB references between the normalized collections.

### Indexes and Idempotency

Unique compound indexes enforce entity identities.

Processing uses MongoDB upserts, allowing the same source records to be processed repeatedly without inserting duplicate target entities.

This provides idempotency for entity persistence, although it does not guarantee exactly-once job execution.

## 5. Provider Extensibility

The provider layer contains:

- `ProviderAdapter` interface
- Provider registry
- Talabat adapter
- Declarative field mappings

Provider-specific responsibilities include restaurant ID extraction, nested menu extraction, and raw-to-canonical field mapping.

The shared normalizers validate canonical entities without depending on Talabat field names.

To introduce another provider, a developer can implement a new adapter and register it.

Additional source-discovery and provider-error handling changes may still be necessary because the current implementation is not completely provider-independent.

## 6. Processing Lifecycle

1. The client calls `POST /runs` with a provider.
2. A run record is created.
3. BullMQ schedules a dispatcher job.
4. The dispatcher reads raw document IDs and divides them into batches.
5. Batch jobs process source documents using the corresponding domain service.
6. Provider adapters extract and map raw data.
7. Pure normalization functions validate canonical records.
8. Valid entities are deduplicated and written using bulk upserts.
9. Invalid records are quarantined in `sync_errors`.
10. Batch results update run-level progress.
11. The run is marked completed after its batches finish.

## 7. Reliability and Error Handling

### Retries

Batch jobs use BullMQ retries with exponential backoff.

Worker concurrency is limited to avoid unbounded parallel processing.

### Quarantine

Invalid source records are stored separately with their source document ID, record index, error reason, and original data.

This preserves diagnostic information without blocking processing of valid records.

### Run Tracking

Run records track:

- Status and timestamps
- Total and completed jobs
- Failed jobs
- Processed and invalid records
- Last reported error

Batch-result records help prevent duplicate accounting for completed jobs.

### Limitations

- Worker-event-based completion accounting has a crash-recovery gap.
- A dedicated dead-letter queue and automated replay are not implemented.
- Per-stage metrics and timings are not fully captured.
- Some quarantine identifiers for malformed nested restaurant records can collide.
- Automated integration testing remains incomplete.

## 8. Testing and Verification

Unit tests cover normalization, mapping, and Talabat-specific extraction.

The complete pipeline was also manually verified using Docker Compose.

| Metric               | Verified result |
| -------------------- | --------------: |
| Batch jobs completed |           24/24 |
| Failed jobs          |               0 |
| Location entities    |             697 |
| Restaurant entities  |             302 |
| Menu entities        |          28,773 |
| Quarantined records  |             157 |

Repeated runs produced the expected target entity counts, demonstrating idempotent entity writes for the supplied dataset.

## 9. Design Trade-offs

**MongoDB:** Suitable for heterogeneous raw provider documents and flexible normalized schemas.

**BullMQ:** Provides background processing, retry handling, and controlled worker concurrency without blocking HTTP requests.

**Provider adapters:** Improve separation of concerns and make normalization easier to test, at the cost of additional abstraction.

**Bulk upserts:** Improve throughput and prevent duplicate entity insertion, but cannot provide exactly-once execution guarantees.

**Incremental processing:** Cursor reads and batches reduce memory requirements compared with loading all raw records at once.

## 10. Future Improvements

- Introduce persistence repository interfaces and ports.
- Make batch sizes, concurrency, and retry policies fully configurable.
- Add dead-letter handling and failed-job replay.
- Reconcile unfinished runs after process restarts.
- Add per-stage metrics and structured correlated logs.
- Add automated integration and end-to-end tests.
- Support additional provider-specific source layouts.
