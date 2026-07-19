import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from './redis';

// Configure Redis-backed two-tier rate limiters
export const tokenRateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 60, // 60 requests
	duration: 60, // per 60 seconds
	keyPrefix: 'ratelimit:token'
});

export const groupRateLimiter = new RateLimiterRedis({
	storeClient: redis,
	points: 300, // 300 requests
	duration: 60, // per 60 seconds
	keyPrefix: 'ratelimit:group'
});

export interface RateLimitResult {
	allowed: boolean;
	retryAfter?: number;
}

/**
 * Validates request rates against both individual token and group-wide limits.
 * Returns information if the limit is exceeded.
 */
export async function checkRateLimits(tokenId: string, groupId: string): Promise<RateLimitResult> {
	try {
		// Verify both limits in parallel
		const [tokenRes, groupRes] = await Promise.allSettled([
			tokenRateLimiter.consume(tokenId),
			groupRateLimiter.consume(groupId)
		]);

		// Check if either limiter failed consumption (rejected promise means rate limit hit)
		if (tokenRes.status === 'rejected') {
			const msBeforeNext = tokenRes.reason.msBeforeNext || 1000;
			return { allowed: false, retryAfter: Math.ceil(msBeforeNext / 1000) };
		}

		if (groupRes.status === 'rejected') {
			const msBeforeNext = groupRes.reason.msBeforeNext || 1000;
			return { allowed: false, retryAfter: Math.ceil(msBeforeNext / 1000) };
		}

		return { allowed: true };
	} catch (err: any) {
		// Log limiter errors but fall through to allow service (graceful degradation)
		console.error('[RateLimiter] Limiter error:', err);
		return { allowed: true };
	}
}
