<script lang="ts">
	import { 
		Sparkles, Layers, Cpu, ShieldCheck, Zap, LifeBuoy, 
		ArrowRight, CheckCircle2, MessageSquare, Smartphone
	} from 'lucide-svelte';
</script>

<svelte:head>
	<title>About Stratos - AI Context & Productivity Engine</title>
</svelte:head>

<div class="h-full flex flex-col bg-zinc-50 dark:bg-[#09090b] overflow-y-auto custom-scrollbar">
	<!-- Hero Header -->
	<header class="shrink-0 px-6 sm:px-10 pt-12 pb-8 max-w-5xl w-full mx-auto text-center relative">
		<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-primary text-xs font-semibold tracking-wide uppercase mb-6 border border-brand-primary/20">
			<Sparkles class="w-3.5 h-3.5" />
			Stratos v1.2.0 • AI-Powered Productivity Engine
		</div>

		<h1 class="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
			Built for High-Velocity Teams
		</h1>
		<p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mt-4 leading-relaxed">
			Stratos is a persistent, multi-group productivity platform combining Kanban boards, dynamic custom fields, real-time collaboration, and an integrated helpdesk engine.
		</p>
	</header>

	<!-- Content Container -->
	<main class="flex-1 px-6 sm:px-10 pb-20 max-w-5xl w-full mx-auto space-y-12">
		<!-- Core System Capabilities Grid -->
		<section>
			<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-6 flex items-center gap-2">
				<Layers class="w-5 h-5 text-brand-primary" />
				Core Engine Features
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Feature 1 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
						<Zap class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Kanban & Fractional Indexing</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Fluid drag-and-drop task ordering powered by fractional position algorithms for zero-reorder overhead across massive boards.
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
						<Cpu class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Dynamic Custom Fields</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Extensible JSONB-indexed schema supporting custom drop-downs, date pickers, numeric metrics, and reporter tracking.
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
						<MessageSquare class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Real-Time Sync & Mentions</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						SSE streaming notifications, rich-text @mentions, auto-follower tracking, and dual Incoming/Sent Inbox management.
					</p>
				</div>

				<!-- Feature 4 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
						<LifeBuoy class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Helpdesk & Ticket Portal</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Integrated ticket portal with severity tracking, SLA timers, and automated team resolution pipelines.
					</p>
				</div>

				<!-- Feature 5 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
						<ShieldCheck class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Group Isolation & Branding</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Multi-tenant security boundaries with custom primary colors, custom branding logos, and theme preferences.
					</p>
				</div>

				<!-- Feature 6 -->
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
					<div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
						<Smartphone class="w-5 h-5" />
					</div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Mobile-First Snap Scroll</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Native touch snap-scrolling, mobile bottom navigation, and full-screen drawer overlays for phone viewports.
					</p>
				</div>
			</div>
		</section>

		<!-- Feature Request Banner -->
		<section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-8 sm:p-10 border border-zinc-800 shadow-xl">
			<div class="absolute -right-12 -bottom-12 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>
			
			<div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
				<div class="space-y-2 max-w-xl">
					<div class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
						<Sparkles class="w-3.5 h-3.5" />
						Feature Requests & Feedback
					</div>
					<h3 class="text-2xl font-bold tracking-tight text-white">Have an idea or need a feature request?</h3>
					<p class="text-sm text-zinc-400 leading-relaxed">
						Submit your request directly through our integrated Helpdesk system. Our team reviews feature suggestions regularly!
					</p>
				</div>

				<a 
					href="/helpdesk" 
					class="shrink-0 flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-brand-primary/25"
				>
					<LifeBuoy class="w-4 h-4" />
					Submit Feature Request
					<ArrowRight class="w-4 h-4" />
				</a>
			</div>
		</section>

		<!-- Author & Tech Stack Section -->
		<section class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 shadow-sm">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800/50 pb-6 mb-6">
				<div>
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">Project & Author Information</h3>
				</div>
				<div class="flex items-center gap-3">
					<div class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Author: <span class="text-zinc-900 dark:text-white font-bold">Steve Torrefranca</span>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
				<div class="flex items-center gap-2">
					<CheckCircle2 class="w-4 h-4 text-emerald-500" />
					SvelteKit 2.0 & Svelte 5
				</div>
				<div class="flex items-center gap-2">
					<CheckCircle2 class="w-4 h-4 text-emerald-500" />
					TypeScript & Drizzle ORM
				</div>
				<div class="flex items-center gap-2">
					<CheckCircle2 class="w-4 h-4 text-emerald-500" />
					PostgreSQL TCP Connection Pool
				</div>
				<div class="flex items-center gap-2">
					<CheckCircle2 class="w-4 h-4 text-emerald-500" />
					TailwindCSS Design System
				</div>
			</div>
		</section>
	</main>
</div>
