import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Fetch Redis URL from dynamic environment variables, default to local docker port
const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
	maxRetriesPerRequest: 3,
	connectTimeout: 5000
});

redis.on('error', (err) => {
	console.error('Redis Client Error:', err);
});

/**
 * Retrieves cached data from Redis.
 */
export async function getCachedDashboardData<T>(key: string): Promise<T | null> {
	try {
		const cached = await redis.get(key);
		if (cached) {
			return JSON.parse(cached) as T;
		}
	} catch (err) {
		console.error(`Failed to get cache for key ${key}:`, err);
	}
	return null;
}

/**
 * Saves data into Redis cache with a specific TTL in seconds.
 */
export async function setCachedDashboardData<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
	try {
		const serialized = JSON.stringify(data);
		await redis.set(key, serialized, 'EX', ttlSeconds);
	} catch (err) {
		console.error(`Failed to set cache for key ${key}:`, err);
	}
}

/**
 * Invalidates (deletes) dashboard charts and metrics cache keys for a group and/or user.
 * Safe for production by using SCAN instead of KEYS.
 */
export async function invalidateDashboardCache(groupId: string, userId?: string): Promise<void> {
	try {
		// 1. Invalidate group charts
		const chartsPattern = `dashboard:charts:group:${groupId}:*`;
		await deleteKeysByPattern(chartsPattern);

		// 2. Invalidate user metrics
		if (userId) {
			const userMetricsKey = `dashboard:metrics:group:${groupId}:user:${userId}`;
			await redis.del(userMetricsKey);
		} else {
			const metricsPattern = `dashboard:metrics:group:${groupId}:user:*`;
			await deleteKeysByPattern(metricsPattern);
		}
	} catch (err) {
		console.error(`Failed to invalidate dashboard cache for group ${groupId}:`, err);
	}
}

/**
 * Helper to scan and delete keys in batches to avoid blocking Redis.
 */
async function deleteKeysByPattern(pattern: string): Promise<void> {
	let cursor = '0';
	do {
		const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
		cursor = newCursor;
		if (keys.length > 0) {
			await redis.del(...keys);
		}
	} while (cursor !== '0');
}
