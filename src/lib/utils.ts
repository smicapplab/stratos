import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getTaskIdentifier(task: { id: string; boardPrefix?: string | null; number?: number | null }) {
	if (task.boardPrefix && task.number) {
		return `${task.boardPrefix}-${task.number}`;
	}
	return `TSK-${task.id.split('-')[0].substring(0, 4).toUpperCase()}`;
}

/** Escape HTML special characters to prevent XSS in HTML email templates */
export function htmlEscape(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Escape SQL LIKE/ILIKE wildcard characters (%, _, \) to prevent pattern injection */
export function escapeLikePattern(query: string): string {
	return query.replace(/[%_\\]/g, '\\$&');
}
