import {
	Bell,
	CheckCircle2,
	UserPlus,
	AtSign,
	MessageSquare
} from 'lucide-svelte';

export interface TaskNotificationGroup {
	taskId: string | null;
	taskTitle: string;
	boardId?: string | null;
	latestCreatedAt: string | Date;
	unreadCount: number;
	notifications: any[];
}

export function getNotificationIcon(type: string) {
	switch (type) {
		case 'assigned':
			return { icon: UserPlus, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
		case 'mentioned':
			return { icon: AtSign, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' };
		case 'status_changed':
			return { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
		case 'comment_added':
			return { icon: MessageSquare, color: 'text-brand-primary dark:text-brand-primary', bg: 'bg-brand-primary/10 dark:bg-brand-primary/10' };
		default:
			return { icon: Bell, color: 'text-brand-primary dark:text-brand-primary', bg: 'bg-brand-primary/10 dark:bg-brand-primary/10' };
	}
}

export function getNotificationText(type: string, isSent: boolean = false) {
	if (isSent) {
		switch (type) {
			case 'assigned': return 'assigned a task to';
			case 'mentioned': return 'mentioned';
			case 'status_changed': return 'updated a task for';
			case 'comment_added': return 'commented on a task for';
			default: return 'notified';
		}
	}
	switch (type) {
		case 'assigned': return 'assigned you a task';
		case 'mentioned': return 'mentioned you in a task';
		case 'status_changed': return 'changed the status of a task';
		case 'comment_added': return 'commented on a task';
		default: return 'notified you';
	}
}

export function groupNotificationsByTask(notificationsList: any[]): TaskNotificationGroup[] {
	if (!notificationsList || notificationsList.length === 0) return [];

	const groupsMap = new Map<string, TaskNotificationGroup>();

	for (const notif of notificationsList) {
		const key = notif.taskId || 'system';
		const existing = groupsMap.get(key);

		if (!existing) {
			groupsMap.set(key, {
				taskId: notif.taskId || null,
				taskTitle: notif.taskTitle || (notif.taskId ? 'Untitled Task' : 'System Notifications'),
				boardId: notif.boardId || null,
				latestCreatedAt: notif.createdAt,
				unreadCount: notif.readAt ? 0 : 1,
				notifications: [notif]
			});
		} else {
			existing.notifications.push(notif);
			if (!notif.readAt) {
				existing.unreadCount += 1;
			}
			// Keep latestCreatedAt updated
			if (new Date(notif.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
				existing.latestCreatedAt = notif.createdAt;
			}
		}
	}

	// Sort groups by latestCreatedAt descending
	return Array.from(groupsMap.values()).sort(
		(a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
	);
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
	try {
		const res = await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, notificationId: id })
		});
		return res.ok;
	} catch (err) {
		console.error("Failed to mark notification as read", err);
		return false;
	}
}

export async function markTaskNotificationsAsRead(taskId: string): Promise<boolean> {
	try {
		const res = await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ taskId })
		});
		return res.ok;
	} catch (err) {
		console.error("Failed to mark task notifications as read", err);
		return false;
	}
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
	try {
		const res = await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ markAll: true })
		});
		return res.ok;
	} catch (err) {
		console.error("Failed to mark all notifications as read", err);
		return false;
	}
}
