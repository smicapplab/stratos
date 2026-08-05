import type { SessionUser, Session } from '$lib/server/auth/session';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: SessionUser | null;
			session: Session | null;
			group: {
				id: string;
				name: string;
				logoUrl: string | null;
				showWorkspaceName: boolean;
				defaultTheme: string;
			} | null;
			apiToken: {
				tokenId: string;
				groupId: string;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
