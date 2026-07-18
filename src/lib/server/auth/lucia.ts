import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "../db/db";
import { sessions, users } from "../db/schema";
import { dev } from "$app/environment";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			email: attributes.email,
			name: attributes.name,
			role: attributes.role,
			groupId: attributes.groupId,
			jobTitle: attributes.jobTitle,
			avatarUrl: attributes.avatarUrl,
			theme: attributes.theme
		};
	},
	getSessionAttributes: (attributes) => {
		return {
			userAgent: attributes.userAgent,
			ipAddress: attributes.ipAddress
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
		DatabaseSessionAttributes: DatabaseSessionAttributes;
	}
}

interface DatabaseUserAttributes {
	email: string;
	name: string;
	role: 'Admin' | 'Manager' | 'Member' | 'Viewer';
	groupId: string;
	jobTitle: string | null;
	avatarUrl: string | null;
	theme: string;
}

interface DatabaseSessionAttributes {
	userAgent: string | null;
	ipAddress: string | null;
}
