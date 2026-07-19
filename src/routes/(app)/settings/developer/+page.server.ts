import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { listApiTokens, createApiToken, revokeApiToken } from '$lib/server/services/apiTokens';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	// Direct redirect if unauthorized
	if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
		throw redirect(302, '/settings/profile');
	}

	try {
		const tokens = await listApiTokens(user);
		return {
			tokens: tokens.map(t => ({
				id: t.id,
				name: t.name,
				userId: t.userId,
				userName: t.userName,
				createdAt: t.createdAt.toISOString(),
				lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null
			}))
		};
	} catch (err: any) {
		console.error('Failed to load developer tokens:', err);
		return { tokens: [] };
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Token description/name is required' });
		}

		try {
			const result = await createApiToken(user, name);
			// Plaintext token is only shown once here
			return {
				success: true,
				generatedToken: result.token,
				tokenId: result.id
			};
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to create token' });
		}
	},

	revoke: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const tokenId = formData.get('tokenId')?.toString();

		if (!tokenId) {
			return fail(400, { error: 'Token ID is required' });
		}

		try {
			await revokeApiToken(user, tokenId);
			return { success: true };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to revoke token' });
		}
	}
};
