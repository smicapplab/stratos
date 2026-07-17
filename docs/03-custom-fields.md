# 03 - Custom Fields Engine

## Concept
Different groups need different data (e.g., IT needs "Severity", Marketing needs "Campaign Type"). Creating a dedicated database column for every possible field is an anti-pattern. Instead, we use Postgres `JSONB`.

## Schema Design
1. **Field Definitions Table**:
   - `id`: UUID
   - `groupId`: UUID (scoped to the group)
   - `name`: String (e.g., "T-Shirt Size")
   - `type`: Enum (`text`, `number`, `date`, `select`, `multi-select`)
   - `options`: JSONB (Array of valid options for selects)

2. **Task Table Integration**:
   - The `tasks` table will have a single `customFields` column of type `JSONB`.
   - Data is stored as a key-value map mapping the Field Definition `id` to the value.
   - Example: `{"field-uuid-1": "Large", "field-uuid-2": 5}`

## Querying, Indexing & The Sorting Problem
- **Filtering**: Because it is `JSONB`, we can perform complex filtering via Drizzle/Postgres (e.g., "Show me all tasks where T-Shirt Size is Large"). A GIN (Generalized Inverted Index) on the `customFields` column makes filtering extremely fast.
- **The Sorting Problem**: GIN indexes are useless for sorting. Sorting by a JSONB field requires Postgres to do a full sequential scan, parse the JSON, and sort in memory. 
- **Mitigation Strategy & Hard Compromises**: Using an Entity-Attribute-Value (EAV) side-table with triggers is an architectural anti-pattern that creates query builder nightmares. Instead, we embrace Postgres' native capabilities with strict guardrails:
  - We rely on GIN indexes for fast filtering across the JSONB structure.
  - **The Compromise:** For ad-hoc sorting on custom fields, we accept the performance hit of a sequential JSONB scan *only* because we enforce strict limits on the UI (e.g., maximum 5,000 active tasks loaded in a Table view). 
  - **Expression Indexes (Scale Escape Hatch):** If a specific custom field (e.g., "Priority Score") becomes universally critical and causes sorting bottlenecks, we do not migrate it to a hardcoded column. Instead, we create a targeted **B-Tree Expression Index** via standard database migrations. *Crucially*, we must cast the extracted text value to the correct type to ensure correct sorting (e.g., `10` sorts after `5` instead of before it). Example: `CREATE INDEX idx_tasks_custom_priority ON tasks (((customFields->>'priorityScore')::numeric))`. This gives us native sort performance without altering the table schema.
