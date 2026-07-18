import { redis } from '$lib/server/redis';
import { randomUUID } from 'crypto';
import type { Actor } from '$lib/server/services/users';

export async function generateFileToken(actor: Actor, filePath: string, mimeType: string, fileName: string): Promise<string> {
	const token = randomUUID();
	await redis.set(
		`preview:token:${token}`,
		JSON.stringify({
			filePath,
			mimeType,
			fileName,
			userId: actor.id,
			groupId: actor.groupId
		}),
		'EX',
		7200 // 2 hours TTL
	);
	return token;
}
