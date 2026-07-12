<script lang="ts">
	import {
		MessageSquare,
		Trash2,
		Edit2,
		CornerUpLeft,
		SmilePlus,
		Smile,
	} from "lucide-svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";

	let {
		activeTab = $bindable(),
		activityItems,
		commentTiptapAction,
		submitComment,
		editingCommentId = $bindable(),
		editTiptapAction,
		saveCommentEdit,
		confirmDeleteComment,
		replyingToId = $bindable(),
		showReactionPopupId = $bindable(),
		COMMON_EMOJIS,
		EMOJI_MAP,
		toggleReaction,
		replyTiptapAction,
		submitReply,
		getOracleIconInfo,
		formatAuditValue,
	} = $props();
</script>

<!-- Activity feed -->
<div class="pt-10 border-t border-zinc-200 dark:border-white/10">
	<div class="flex items-center justify-between mb-8">
		<div
			class="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold"
		>
			<MessageSquare class="w-4 h-4 text-zinc-400" /> Activity
		</div>
		<div
			class="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-lg border border-zinc-200 dark:border-white/5"
		>
			<button
				onclick={(e) => {
					e.preventDefault();
					activeTab = "comments";
				}}
				class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all {activeTab ===
				'comments'
					? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
					: 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				>Comments</button
			>
			<button
				onclick={(e) => {
					e.preventDefault();
					activeTab = "history";
				}}
				class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all {activeTab ===
				'history'
					? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
					: 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				>History</button
			>
		</div>
	</div>

	<div
		class="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-sm flex items-start gap-3 sm:gap-4 mb-10"
	>
		<div class="shrink-0 mt-1 hidden sm:block">
			<div
				class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-sm border border-white dark:border-zinc-900"
			></div>
		</div>
		<div
			class="flex-1 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-all bg-zinc-50/50 dark:bg-[#18181b]"
		>
			<div use:commentTiptapAction></div>
		</div>
		<div class="shrink-0">
			<button
				onclick={submitComment}
				type="button"
				class="px-5 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-sm uppercase tracking-wide text-sm transition-all h-[44px] flex items-center justify-center"
				>SEND</button
			>
		</div>
	</div>

	<div class="space-y-6">
		{#each activityItems as item (item.id)}
			{#if activeTab === "comments"}
				<div class="relative z-10">
					<!-- Root Comment Card -->
					<div
						class="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-sm group"
					>
						{#if editingCommentId === item.id}
							<div
								class="border border-blue-500/50 rounded-xl overflow-hidden bg-zinc-50 dark:bg-[#18181b] shadow-sm mb-3"
							>
								<div
									use:editTiptapAction={item.content || ""}
								></div>
							</div>
							<div class="flex gap-2 justify-end">
								<button
									onclick={() => (editingCommentId = null)}
									type="button"
									class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold rounded-lg uppercase tracking-wide transition-colors"
									>Cancel</button
								>
								<button
									onclick={() =>
										saveCommentEdit(item.id as string)}
									type="button"
									class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm uppercase tracking-wide transition-colors"
									>Update</button
								>
							</div>
						{:else}
							<div class="flex items-start gap-4">
								<div class="shrink-0">
									<Avatar name={item.userName} size="md" />
								</div>
								<div class="flex-1 min-w-0">
									<div
										class="flex items-center justify-between mb-2 flex-wrap gap-2"
									>
										<div class="flex items-center gap-3">
											<span
												class="font-bold text-[15px] text-zinc-900 dark:text-zinc-100"
												>{item.userName}</span
											>
											<span
												class="text-[13px] font-medium text-zinc-500"
												>{item.formattedDate}</span
											>
											{#if item.updatedAt && item.updatedAt !== item.createdAt}
												<span
													class="text-[11px] font-medium text-zinc-400 italic"
													>edited</span
												>
											{/if}
										</div>
										<div
											class="flex items-center gap-4 transition-opacity"
										>
											<button
												onclick={(e) => {
													e.preventDefault();
													confirmDeleteComment(
														item.id as string,
													);
												}}
												class="text-red-500 font-medium text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
												><Trash2 class="w-2.5 h-2.5" /> Delete</button
											>
											<button
												onclick={(e) => {
													e.preventDefault();
													editingCommentId =
														item.id as string;
												}}
												class="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
												><Edit2 class="w-2.5 h-2.5" /> Edit</button
											>
											<button
												onclick={(e) => {
													e.preventDefault();
													replyingToId =
														replyingToId === item.id
															? null
															: (item.id as string);
												}}
												class="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
												><CornerUpLeft
													class="w-2.5 h-2.5"
												/> Reply</button
											>
										</div>
									</div>
									<div
										class="text-[13px] text-zinc-600 dark:text-zinc-300 prose dark:prose-invert max-w-none break-words prose-p:leading-snug prose-p:my-1 prose-p:text-[13px] prose-ul:my-1 prose-li:my-0 prose-li:text-[13px]"
									>
										{@html item.sanitizedContent}
									</div>
									<div class="flex flex-wrap gap-1.5 mt-5">
										<div class="relative">
											<button
												onclick={(e) => {
													e.preventDefault();
													showReactionPopupId =
														showReactionPopupId ===
														item.id
															? null
															: (item.id as string);
												}}
												class="text-zinc-500 font-medium text-[13px] flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
												><SmilePlus
													class="w-3.5 h-3.5"
												/></button
											>
											{#if showReactionPopupId === item.id}
												<div
													class="absolute left-0 top-full mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 shadow-xl rounded-xl p-1.5 flex gap-0.5 z-[99]"
												>
													{#each COMMON_EMOJIS as reaction}
														<button
															onclick={() => {
																toggleReaction(
																	item.id as string,
																	reaction.id,
																);
																showReactionPopupId =
																	null;
															}}
															class="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors"
														>
															<reaction.icon
																class="w-4 h-4"
															/>
														</button>
													{/each}
												</div>
											{/if}
										</div>
										{#if item.groupedReactions.length > 0}
											{#each item.groupedReactions as group}
												{@const Icon =
													EMOJI_MAP[group.emoji] ||
													Smile}
												<button
													onclick={() =>
														toggleReaction(
															item.id as string,
															group.emoji,
														)}
													class="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-[12px] flex items-center gap-1.5 transition-colors"
													title={group.users.join(
														", ",
													)}
												>
													<span
														class="text-zinc-500 dark:text-zinc-400"
														><Icon
															class="w-3.5 h-3.5"
														/></span
													>
													<span
														class="font-semibold text-zinc-600 dark:text-zinc-300"
														>{group.count}</span
													>
												</button>
											{/each}
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Replies Section -->
					{#if (item.replies && item.replies.length > 0) || replyingToId === item.id}
						<div class="mt-4 flex">
							<!-- Vertical connecting line -->
							<div
								class="w-10 sm:w-16 flex justify-center shrink-0"
							>
								<div
									class="w-[3px] bg-zinc-200 dark:bg-zinc-800/80 rounded-full"
								></div>
							</div>

							<div class="flex-1 space-y-4">
								<!-- Nested Reply Cards -->
								{#if item.replies}
									{#each item.replies as reply}
										<div
											class="bg-white dark:bg-[#121214] p-4 sm:p-5 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-sm group/reply"
										>
											{#if editingCommentId === reply.id}
												<div
													class="border border-blue-500/50 rounded-xl overflow-hidden bg-zinc-50 dark:bg-[#18181b] shadow-sm mb-3"
												>
													<div
														use:editTiptapAction={reply.content ||
															""}
													></div>
												</div>
												<div
													class="flex gap-2 justify-end"
												>
													<button
														onclick={() =>
															(editingCommentId =
																null)}
														type="button"
														class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold rounded-lg uppercase tracking-wide transition-colors"
														>Cancel</button
													>
													<button
														onclick={() =>
															saveCommentEdit(
																reply.id as string,
															)}
														type="button"
														class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm uppercase tracking-wide transition-colors"
														>Update</button
													>
												</div>
											{:else}
												<div
													class="flex items-start gap-4"
												>
													<div class="shrink-0">
														<Avatar
															name={reply.userName}
															size="sm"
														/>
													</div>
													<div class="flex-1 min-w-0">
														<div
															class="flex items-center justify-between mb-2 flex-wrap gap-2"
														>
															<div
																class="flex items-center gap-3"
															>
																<span
																	class="font-bold text-[14px] text-zinc-900 dark:text-zinc-100"
																	>{reply.userName}</span
																>
																<span
																	class="text-[12px] font-medium text-zinc-500"
																	>{reply.formattedDate}</span
																>
																{#if reply.updatedAt && reply.updatedAt !== reply.createdAt}
																	<span
																		class="text-[10px] font-medium text-zinc-400 italic"
																		>edited</span
																	>
																{/if}
															</div>
															<div
																class="flex items-center gap-3 transition-opacity"
															>
																<button
																	onclick={(
																		e,
																	) => {
																		e.preventDefault();
																		confirmDeleteComment(
																			reply.id as string,
																		);
																	}}
																	class="text-red-500 font-medium text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
																	><Trash2
																		class="w-2.5 h-2.5"
																	/>
																	Delete</button
																>
																<button
																	onclick={(
																		e,
																	) => {
																		e.preventDefault();
																		editingCommentId =
																			reply.id as string;
																	}}
																	class="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
																	><Edit2
																		class="w-2.5 h-2.5"
																	/>
																	Edit</button
																>
															</div>
														</div>
														<div
															class="text-[13px] text-zinc-600 dark:text-zinc-300 prose dark:prose-invert max-w-none break-words prose-p:leading-snug prose-p:my-1 prose-p:text-[13px] prose-ul:my-1 prose-li:my-0 prose-li:text-[13px]"
														>
															{@html reply.sanitizedContent}
														</div>
														<div
															class="flex flex-wrap gap-1.5 mt-5"
														>
															<div
																class="relative"
															>
																<button
																	onclick={(
																		e,
																	) => {
																		e.preventDefault();
																		showReactionPopupId =
																			showReactionPopupId ===
																			reply.id
																				? null
																				: (reply.id as string);
																	}}
																	class="text-zinc-500 font-medium text-[13px] flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
																	><SmilePlus
																		class="w-3.5 h-3.5"
																	/></button
																>
																{#if showReactionPopupId === reply.id}
																	<div
																		class="absolute left-0 top-full mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 shadow-xl rounded-xl p-1.5 flex gap-0.5 z-[99]"
																	>
																		{#each COMMON_EMOJIS as reaction}
																			<button
																				onclick={() => {
																					toggleReaction(
																						reply.id as string,
																						reaction.id,
																					);
																					showReactionPopupId =
																						null;
																				}}
																				class="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors"
																			>
																				<reaction.icon
																					class="w-4 h-4"
																				/>
																			</button>
																		{/each}
																	</div>
																{/if}
															</div>
															{#if reply.groupedReactions.length > 0}
																{#each reply.groupedReactions as group}
																	{@const Icon =
																		EMOJI_MAP[
																			group
																				.emoji
																		] ||
																		Smile}
																	<button
																		onclick={() =>
																			toggleReaction(
																				reply.id as string,
																				group.emoji,
																			)}
																		class="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-[12px] flex items-center gap-1.5 transition-colors"
																		title={group.users.join(
																			", ",
																		)}
																	>
																		<span
																			class="text-zinc-500 dark:text-zinc-400"
																			><Icon
																				class="w-3.5 h-3.5"
																			/></span
																		>
																		<span
																			class="font-semibold text-zinc-600 dark:text-zinc-300"
																			>{group.count}</span
																		>
																	</button>
																{/each}
															{/if}
														</div>
													</div>
												</div>
											{/if}
										</div>
									{/each}
								{/if}

								<!-- Reply Input Box -->
								{#if replyingToId === item.id}
									<div
										class="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-sm flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2"
									>
										<div
											class="shrink-0 mt-1 hidden sm:block"
										>
											<div
												class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm border border-white dark:border-zinc-900"
											></div>
										</div>
										<div
											class="flex-1 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-all bg-zinc-50/50 dark:bg-[#18181b]"
										>
											<div use:replyTiptapAction></div>
										</div>
										<div
											class="flex flex-col gap-2 shrink-0"
										>
											<button
												onclick={() =>
													submitReply(
														item.id as string,
													)}
												type="button"
												class="px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-sm uppercase tracking-wide text-xs transition-all h-[42px] flex items-center justify-center"
												>Reply</button
											>
											<button
												onclick={() =>
													(replyingToId = null)}
												type="button"
												class="px-4 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-bold text-xs uppercase tracking-wide transition-colors"
												>Cancel</button
											>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				{@const IconInfo = getOracleIconInfo(item)}
				<div class="flex gap-2 relative z-10 group items-start">
					<div class="w-10 flex justify-center shrink-0 pt-0.5">
						<div
							class="w-8 h-8 rounded-full border-2 bg-white dark:bg-[#121214] flex items-center justify-center shrink-0 {IconInfo.color}"
						>
							<IconInfo.icon class="w-4 h-4" />
						</div>
					</div>
					<div class="flex flex-col gap-0.5 mt-0.5">
						<div
							class="text-[13px] text-zinc-700 dark:text-zinc-300"
						>
							<span
								class="font-bold text-blue-600 dark:text-blue-500"
								>{item.userName}</span
							>
							{#if item.actionType === "stage_change"}
								changed the stage to <span class="font-medium"
									>{formatAuditValue(
										item.actionType,
										item.newValue,
									)}</span
								>
							{:else if item.actionType === "assignee_change"}
								{#if !item.newValue}
									unassigned the task
								{:else}
									assigned the task to <span
										class="font-medium"
										>{formatAuditValue(
											item.actionType,
											item.newValue,
										)}</span
									>
								{/if}
							{:else if item.actionType === "task_created"}
								created this task
							{:else if item.actionType === "parent_change"}
								{#if !item.newValue || item.newValue === "none"}
									unlinked this task from its parent <span
										class="font-medium"
										>{formatAuditValue(
											item.actionType,
											item.oldValue,
										)}</span
									>
								{:else if item.oldValue && item.oldValue !== "none"}
									moved this task to be a subtask of <span
										class="font-medium"
										>{formatAuditValue(
											item.actionType,
											item.newValue,
										)}</span
									>
								{:else}
									added this task as a subtask of <span
										class="font-medium"
										>{formatAuditValue(
											item.actionType,
											item.newValue,
										)}</span
									>
								{/if}
							{:else}
								changed {item.actionType
									?.replace("_change", "")
									.replace(/_/g, " ")}
								{#if item.oldValue}
									from <span class="font-medium"
										>{formatAuditValue(
											item.actionType,
											item.oldValue,
										)}</span
									>
								{/if}
								to
								<span class="font-medium"
									>{formatAuditValue(
										item.actionType,
										item.newValue,
									)}</span
								>
							{/if}
						</div>
						<div class="text-[12px] text-zinc-400 font-medium">
							{new Date(item.createdAt).toLocaleDateString(
								undefined,
								{
									month: "short",
									day: "numeric",
									year: "numeric",
								},
							)} at {new Date(item.createdAt).toLocaleTimeString(
								undefined,
								{
									hour: "numeric",
									minute: "2-digit",
									second: "2-digit",
								},
							)}
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
