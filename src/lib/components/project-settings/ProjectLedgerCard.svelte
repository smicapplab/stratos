<script lang="ts">
	import { History, Users, Settings, Tag, LayoutTemplate, Activity } from 'lucide-svelte';

	let { projectId, initialActivity = [] }: { projectId: string; initialActivity: any[] } = $props();

	let allActivity = $state<any[]>([]);
	let offset = $state(0);
	let hasMore = $state(true);
	let isLoadingMore = $state(false);

	$effect(() => {
		allActivity = initialActivity || [];
		offset = initialActivity ? initialActivity.length : 0;
		hasMore = (initialActivity || []).length >= 15;
	});

	function getActionIcon(actionType: string) {
		if (actionType.includes('member')) return Users;
		if (actionType.includes('project')) return Settings;
		if (actionType.includes('tag')) return Tag;
		if (actionType.includes('board')) return LayoutTemplate;
		return Activity;
	}

	function getActionText(log: any) {
		const name = `<span class="font-semibold text-zinc-900 dark:text-zinc-100">${log.userName || 'User'}</span>`;
		const details = log.details || {};

		switch (log.actionType) {
			case 'project_created':
				return `${name} created the project`;
			case 'project_updated':
				return `${name} updated project profile`;
			case 'project_visibility_changed':
				return `${name} changed visibility to ${details.visibility || 'new setting'}`;
			case 'user_invited':
				return `${name} invited <span class="font-medium text-zinc-900 dark:text-zinc-100">${details.email}</span> as ${details.role || 'Member'}`;
			case 'user_removed':
				return `${name} removed user <span class="font-medium text-zinc-900 dark:text-zinc-100">${details.targetName || details.email || 'a user'}</span>`;
			case 'member_added':
				return `${name} added <span class="font-medium text-zinc-900 dark:text-zinc-100">${details.targetName || 'a member'}</span> as ${details.role || 'Member'}`;
			case 'member_removed':
				return `${name} removed <span class="font-medium text-zinc-900 dark:text-zinc-100">${details.targetName || 'a member'}</span> from project`;
			case 'member_role_updated':
				return `${name} updated role for <span class="font-medium text-zinc-900 dark:text-zinc-100">${details.targetName || 'a member'}</span> to ${details.newRole || details.role || 'new role'}`;
			case 'tag_created':
				return `${name} created tag <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.tagName || details.name}"</span>`;
			case 'tag_updated':
				return `${name} updated tag <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.tagName || details.name}"</span>`;
			case 'tag_deleted':
				return `${name} deleted tag <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.tagName || details.name || ''}"</span>`;
			case 'board_created':
				return `${name} created board <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.boardName || details.name}"</span>`;
			case 'board_deleted':
				return `${name} deleted board <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.boardName || details.name || ''}"</span>`;
			case 'task_created':
				return `${name} created task <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.taskTitle || details.title || ''}"</span>`;
			case 'task_deleted':
				return `${name} deleted task <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.taskTitle || details.title || ''}"</span>`;
			case 'stage_changed':
				return `${name} moved task <span class="font-medium text-zinc-900 dark:text-zinc-100">"${details.taskTitle || ''}"</span>`;
			default:
				const readableAction = (log.actionType || 'action').replace(/_/g, ' ');
				return `${name} ${readableAction}`;
		}
	}

	function formatTime(dateVal: Date | string) {
		const date = new Date(dateVal);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function loadMoreActivity() {
		if (isLoadingMore || !hasMore) return;
		isLoadingMore = true;
		try {
			const res = await fetch(`/api/projects/${projectId}/activity?limit=15&offset=${offset}`);
			if (res.ok) {
				const nextLogs = await res.json();
				if (nextLogs.length < 15) {
					hasMore = false;
				}
				allActivity = [...allActivity, ...nextLogs];
				offset += nextLogs.length;
			}
		} catch (e) {
			console.error("Failed to load more activity", e);
		} finally {
			isLoadingMore = false;
		}
	}
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
	<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center gap-3">
		<History class="w-5 h-5 text-zinc-500" />
		<h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
			Project Ledger
		</h3>
	</div>

	<div class="p-5 sm:p-6 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
		{#if allActivity.length === 0}
			<div class="text-center py-12 text-zinc-500 dark:text-zinc-400 text-sm">
				No activity recorded yet.
			</div>
		{:else}
			<div class="relative before:absolute before:inset-y-0 before:left-[17px] before:w-[2px] before:bg-zinc-200 dark:before:bg-zinc-800/80">
				{#each allActivity as log (log.id || log.createdAt)}
					{@const Icon = getActionIcon(log.actionType)}
					<div class="relative flex items-start gap-4 mb-4 last:mb-0">
						<!-- Timeline Node -->
						<div class="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-xs">
							<Icon class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
						</div>

						<!-- Content -->
						<div class="flex-1 pt-1.5 pb-1">
							<div class="text-sm text-zinc-600 dark:text-zinc-300 leading-snug">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html getActionText(log)}
							</div>
							<div class="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
								{formatTime(log.createdAt)}
							</div>
						</div>
					</div>
				{/each}
			</div>

			{#if hasMore}
				<div class="mt-6 flex justify-center pb-2">
					<button
						class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 min-h-[44px]"
						onclick={loadMoreActivity}
						disabled={isLoadingMore}
					>
						{isLoadingMore ? "Loading..." : "Load More Activity"}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</section>
