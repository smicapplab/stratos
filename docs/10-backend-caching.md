# 10 - Backend Caching

## Stack Reality Check
Stratos is a Node-based SvelteKit application. Because we operate in a long-running process, we leverage a dedicated **Redis** instance for all in-memory caching needs across the cluster.

## The Redis Cluster Cache

We use **Redis** as the industry standard for distributed caching. Because we need a unified cache for auth sessions, rate limiting, and heavy queries across all application containers, Redis acts as our centralized in-memory store.

### Security Imperative: Auth Caching in a Cluster
- **The Liability:** Caching auth sessions across a cluster introduces a dangerous stale-cache risk. If an admin revokes an employee's access, a 5-minute cache TTL would allow them to continue making authenticated requests.
- **The Solution:** We cache the session in Redis with a short TTL (e.g., 5 mins). If an admin revokes access, the application must immediately issue a `redis.del(\`session:${sessionId}\`)` to globally invalidate the cache across the entire cluster instantly. Redis's native TTL handling ensures we don't need background CRON jobs to clean up expired sessions.

### Cache Targets
**Dashboard aggregations (High Compute)**
`GROUP BY / COUNT()` queries for the dashboards module (see `05-dashboards.md`) are expensive. Cache results per group for 5 minutes:

```typescript
// Example using Redis adapter
const cacheKey = `dashboard:${groupId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await runDashboardQuery(groupId);
await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); // 5 minutes TTL
return result;
```

**Cache Thrashing Warning:** We explicitly do *not* invalidate the dashboard cache (`redis.del()`) on every task mutation. Active boards see hundreds of mutations per hour. Manual invalidation would cause a 0% cache hit rate. We accept a 5-minute stale read for dashboards.

## What We Are Explicitly NOT Doing

| Approach | Why Not |
|---|---|
| Postgres `UNLOGGED` Tables | While they skip WAL, they lack native TTL eviction policies and still hit disk I/O. It introduces table bloat and requires custom vacuuming CRON jobs. Redis is purpose-built for this, which is why we use it instead. |
| Elasticsearch / Algolia | Postgres native full-text search (`tsvector`) is sufficient for our scale (see `09-activity-search.md`). |
