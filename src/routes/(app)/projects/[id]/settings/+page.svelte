<script lang="ts">
	import { ArrowLeft, Settings } from 'lucide-svelte';
	import ProjectProfileCard from '$lib/components/project-settings/ProjectProfileCard.svelte';
	import ProjectVisibilityCard from '$lib/components/project-settings/ProjectVisibilityCard.svelte';
	import ProjectMembersCard from '$lib/components/project-settings/ProjectMembersCard.svelte';
	import ProjectTagsCard from '$lib/components/project-settings/ProjectTagsCard.svelte';
	import ProjectDangerZoneCard from '$lib/components/project-settings/ProjectDangerZoneCard.svelte';
	import ProjectLedgerCard from '$lib/components/project-settings/ProjectLedgerCard.svelte';

	let { data, form } = $props();

	let project = $derived(data.project);
	let members = $derived(data.members);
	let availableUsers = $derived(data.availableUsers);
	let user = $derived(data.user);

	let isProjectAdmin = $derived(
		user.role === 'Admin' ||
		members.find((m: any) => m.userId === user.id)?.role === 'Admin'
	);
</script>

<svelte:head>
	<title>{project.name} Settings | Stratos</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
	<!-- Page Header -->
	<div class="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
		<a
			href="/"
			class="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-500 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-xs"
		>
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
				<Settings class="w-6 h-6 text-zinc-400" />
				{project.name} Settings
			</h1>
			<p class="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
				Manage visibility, access, tags, and team members for this project.
			</p>
		</div>
	</div>

	{#if form?.error}
		<div class="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-sm font-medium">
			{form.error}
		</div>
	{/if}

	<!-- 2-Column Responsive Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
		<!-- Left Settings Column (7 cols on lg, 8 cols on xl) -->
		<div class="lg:col-span-7 xl:col-span-8 space-y-6">
			<ProjectProfileCard {project} {isProjectAdmin} />
			<ProjectVisibilityCard {project} {isProjectAdmin} />
			<ProjectMembersCard {members} {availableUsers} {isProjectAdmin} />
			<ProjectTagsCard {project} bind:tags={data.tags} {isProjectAdmin} />
			{#if user?.role === 'Admin'}
				<ProjectDangerZoneCard {project} />
			{/if}
		</div>

		<!-- Right Column: Project Ledger History (5 cols on lg, 4 cols on xl, sticky on desktop) -->
		<div class="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
			<ProjectLedgerCard projectId={project.id} initialActivity={data.activity} />
		</div>
	</div>
</div>
