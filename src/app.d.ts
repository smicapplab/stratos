declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
			group: {
				id: string;
				name: string;
				logoUrl: string | null;
				defaultTheme: string;
			} | null;
			apiToken: { tokenId: string; groupId: string } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
