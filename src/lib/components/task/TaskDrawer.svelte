<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from "$app/forms";
	import { untrack } from "svelte";
	import DOMPurify from "dompurify";
	import {
		MessageSquare,
		X,
		User,
		Trash2,
		List,
		Search,
		ThumbsUp,
		Heart,
		Smile,
		PartyPopper,
		Rocket,
		Eye,
		CheckCircle2,
		XCircle,
		Plus,
		ListTree,
		Flag,
		Calendar as CalendarIcon,
		Layout,
		Paperclip,
		FileText,
		Check,
		Link as LinkIcon,
		Unlink,
		Layers,
		Download,
		File as FileIcon
	} from "lucide-svelte";
	import { Editor } from "@tiptap/core";
	import StarterKit from "@tiptap/starter-kit";
	import Mention from "@tiptap/extension-mention";
	import Image from "@tiptap/extension-image";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import TaskDrawerProperties from "$lib/components/ui/TaskDrawerProperties.svelte";
	import TaskActivityFeed from "$lib/components/task/TaskActivityFeed.svelte";
	import TaskDescription from "$lib/components/task/TaskDescription.svelte";
	import TaskChecklists from "$lib/components/task/TaskChecklists.svelte";
	import { toastStore, modalStore } from "$lib/stores/ui.svelte";
	import { getTaskIdentifier } from "$lib/utils";
	import VideoPlayer from "$lib/components/ui/VideoPlayer.svelte";

	type GroupUser = { id: string; name: string };
	type ActivityFeedItem = {
		id?: string;
		type: "comment" | "audit_log";
		content?: string;
		actionType?: string;
		oldValue?: string | null;
		newValue?: string | null;
		userName: string;
		createdAt: string | Date;
		updatedAt?: string | Date;
		parentCommentId?: string | null;
		reactions?: {
			id: string;
			emoji: string;
			userId: string;
			userName: string;
		}[];
	};
	type ChecklistItem = { id: string; text: string; done: boolean };
	type TaskType = {
		id: string;
		title: string;
		description: string | null;
		checklists: any;
		assigneeId: string | null;
		priority: string;
		dueDate: Date | string | null;
		parentTaskId: string | null;
		stageId: string;
		boardId?: string | null;
		boardName?: string | null;
		boardPrefix?: string | null;
		number?: number;
		orderIndex?: string;
		customFields?: Record<string, any>;
	};

	interface Props {
		task: TaskType;
		onClose: () => void;
		allTasks?: TaskType[];
		groupUsers: GroupUser[];
		stages?: any[];
		customFields?: any[];
		projectTags?: any[];
		projectId?: string;
	}

	let { task = $bindable(), onClose, allTasks = [], groupUsers, stages = [], customFields = [], projectTags = [], projectId }: Props = $props();



	let taskComments = $state<ActivityFeedItem[]>([]);
	let activeTab = $state<"comments" | "history">("comments");

	let checklists = $state<ChecklistItem[]>(task.checklists || []);
	let newChecklistText = $state("");

	let editor = $state<Editor | null>(null);
	let commentEditor = $state<Editor | null>(null);

	// Derived task.id to prevent $effect from tracking the entire task object
	let taskId = $derived(task.id);


	
	let siblingTasks = $derived(
		task.parentTaskId 
			? allTasks.filter((t: any) => t.parentTaskId === task.parentTaskId && t.id !== task.id).sort((a: any, b: any) => {
				const aIndex = a.orderIndex || '';
				const bIndex = b.orderIndex || '';
				if (aIndex < bIndex) return -1;
				if (aIndex > bIndex) return 1;
				return 0;
			})
			: []
	);

	let subtasks = $derived(
		allTasks?.filter((t) => t.parentTaskId === taskId) || [],
	);

	// Tiptap Mentions State
	let mentionProps = $state<{
		items: any[];
		command: any;
		clientRect: any;
		selectedIndex: number;
	}>({
		items: [],
		command: null,
		clientRect: null,
		selectedIndex: 0,
	});

	// Comment Editing & Replying State
	let editingCommentId = $state<string | null>(null);
	let editEditor = $state<Editor | null>(null);
	let replyingToId = $state<string | null>(null);
	let replyEditor = $state<Editor | null>(null);

	// Reactions State
	let showReactionPopupId = $state<string | null>(null);
	const COMMON_EMOJIS = [
		{ id: 'thumbs-up', icon: ThumbsUp },
		{ id: 'heart', icon: Heart },
		{ id: 'smile', icon: Smile },
		{ id: 'party', icon: PartyPopper },
		{ id: 'rocket', icon: Rocket },
		{ id: 'eye', icon: Eye }
	];
	const EMOJI_MAP = Object.fromEntries(COMMON_EMOJIS.map(e => [e.id, e.icon]));

	function getOracleIconInfo(item: any) {
		if (item.type === 'comment') {
			return { icon: MessageSquare, color: "border-purple-500 text-purple-600 dark:text-purple-400" };
		}
		if (item.actionType === 'stage_change') {
			const stage = stages?.find(s => s.id === item.newValue);
			const val = stage?.name?.toLowerCase() || item.newValue?.toLowerCase() || '';
			if (val === 'done' || val === 'closed' || val === 'resolved' || val === 'completed') {
				return { icon: CheckCircle2, color: "border-emerald-500 text-emerald-600 dark:text-emerald-400" };
			}
			if (val === 'rejected' || val === 'aborted' || val === 'cancelled') {
				return { icon: XCircle, color: "border-orange-500 text-orange-600 dark:text-orange-400" };
			}
			return { icon: CheckCircle2, color: "border-blue-500 text-blue-600 dark:text-blue-400" };
		}
		if (item.actionType === 'assignee_change') {
			return { icon: User, color: "border-indigo-400 text-indigo-500 dark:text-indigo-400" };
		}
		if (item.actionType === 'priority_change') {
			return { icon: Flag, color: "border-red-400 text-red-500 dark:text-red-400" };
		}
		if (item.actionType === 'due_date_change') {
			return { icon: CalendarIcon, color: "border-amber-400 text-amber-500 dark:text-amber-400" };
		}
		if (item.actionType === 'task_created') {
			return { icon: Plus, color: "border-green-400 text-green-500 dark:text-green-400" };
		}
		if (item.actionType === 'parent_change') {
			return { icon: ListTree, color: "border-fuchsia-400 text-fuchsia-500 dark:text-fuchsia-400" };
		}
		return { icon: MessageSquare, color: "border-zinc-400 text-zinc-500 dark:text-zinc-400" };
	}

	function groupReactions(reactions: ActivityFeedItem['reactions']) {
		if (!reactions) return [];
		const map = new Map<
			string,
			{ emoji: string; count: number; users: string[] }
		>();
		for (const r of reactions) {
			if (!map.has(r.emoji))
				map.set(r.emoji, { emoji: r.emoji, count: 0, users: [] });
			const entry = map.get(r.emoji)!;
			entry.count++;
			entry.users.push(r.userName);
		}
		return Array.from(map.values());
	}

	function sanitizeHtml(html: string | undefined): string {
		if (!html) return '';
		return DOMPurify.sanitize(html);
	}

	function formatCommentDate(dateVal: string | Date): string {
		return new Date(dateVal).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	function formatReplyDate(dateVal: string | Date): string {
		return new Date(dateVal).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	}

	type ProcessedReply = ActivityFeedItem & {
		sanitizedContent: string;
		formattedDate: string;
		groupedReactions: ReturnType<typeof groupReactions>;
	};

	type ThreadedActivityFeedItem = ActivityFeedItem & {
		replies?: ProcessedReply[];
		sanitizedContent: string;
		formattedDate: string;
		groupedReactions: ReturnType<typeof groupReactions>;
	};

	let activityItems = $derived.by(() => {
		if (activeTab === "history") {
			return taskComments
				.filter((c) => c.type === "audit_log")
				.map((c) => ({
					...c,
					sanitizedContent: '',
					formattedDate: formatCommentDate(c.createdAt),
					groupedReactions: [],
				})) as ThreadedActivityFeedItem[];
		} else {
			const comments = taskComments.filter((c) => c.type === "comment");
			const rootComments = comments.filter((c) => !c.parentCommentId);
			const replyItems = comments.filter((c) => c.parentCommentId);

			return rootComments
				.map((root) => ({
					...root,
					sanitizedContent: sanitizeHtml(root.content),
					formattedDate: formatCommentDate(root.createdAt),
					groupedReactions: groupReactions(root.reactions),
					replies: replyItems
						.filter((r) => r.parentCommentId === root.id)
						.sort(
							(a, b) =>
								new Date(a.createdAt).getTime() -
								new Date(b.createdAt).getTime(),
						)
						.map((r) => ({
							...r,
							sanitizedContent: sanitizeHtml(r.content),
							formattedDate: formatReplyDate(r.createdAt),
							groupedReactions: groupReactions(r.reactions),
						})),
				}))
				.reverse() as ThreadedActivityFeedItem[];
		}
	});

	// Task Linking State
	let linkedTasks = $state<
		{
			id: string;
			linkedTaskId: string;
			title: string;
			stageId: string;
			linkType: string;
			direction: string;
		}[]
	>([]);
	let showLinkMenu = $state(false);
	let linkSearchQuery = $state("");
	let linkSearchResults = $state<{ id: string; title: string; boardPrefix?: string; number?: number }[]>([]);
	let selectedLinkType = $state("blocks");

	// Subtask Linking State
	let showSubtaskMenu = $state(false);
	let subtaskSearchQuery = $state("");
	let subtaskSearchResults = $state<{ id: string; title: string; boardPrefix?: string; number?: number }[]>([]);

	function formatAuditValue(
		type: string | undefined,
		val: string | null | undefined,
	) {
		if (!val || val === "unassigned" || val === "none") return val || null;
		if (type === "assignee_change") {
			const u = groupUsers.find((u) => u.id === val);
			return u ? u.name : val;
		}
		if (type === "stage_change") {
			const s = stages?.find((s) => s.id === val);
			return s ? s.name : val;
		}
		if (type === "due_date_change") {
			return new Date(val).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		}
		if (type === "parent_change") {
			const t = allTasks?.find((t: any) => t.id === val);
			return t ? getTaskIdentifier(t) : val;
		}
		return val;
	}

	$effect(() => {
		const id = taskId; // only track the derived id, not the entire task object
		if (id) {
			fetch(`/api/tasks/${id}/links`)
				.then((r) => r.json())
				.then((d) => (linkedTasks = d));
		}
	});

	$effect(() => {
		if (linkSearchQuery.length >= 2) {
			const currentTaskId = untrack(() => task.id);
			const delay = setTimeout(async () => {
				const res = await fetch(`/api/search?q=${encodeURIComponent(linkSearchQuery)}`);
				if (res.ok) {
					const data = await res.json();
					linkSearchResults = data.tasks.filter(
						(t: any) => t.id !== currentTaskId,
					);
				}
			}, 300);
			return () => clearTimeout(delay);
		} else {
			linkSearchResults = [];
		}
	});

	$effect(() => {
		if (subtaskSearchQuery.length >= 2) {
			const currentTaskId = untrack(() => task.id);
			const delay = setTimeout(async () => {
				const res = await fetch(`/api/search?q=${encodeURIComponent(subtaskSearchQuery)}`);
				if (res.ok) {
					const data = await res.json();
					const currentParentId = untrack(() => task.parentTaskId);
					subtaskSearchResults = data.tasks.filter(
						(t: any) => t.id !== currentTaskId && t.parentTaskId === null && t.id !== currentParentId,
					);
				}
			}, 300);
			return () => clearTimeout(delay);
		} else {
			subtaskSearchResults = [];
		}
	});

	async function linkSubtask(targetTaskId: string) {
		const formData = new FormData();
		formData.append('taskId', targetTaskId);
		formData.append('parentTaskId', task.id);
		const res = await fetch(`${$page.url.pathname}?/linkSubtask`, {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': 'true' }
		});
		
		let success = false;
		try {
			const result = await res.json();
			success = result.type === 'success';
		} catch (e) {
			success = res.ok;
		}

		if (success) {
			showSubtaskMenu = false;
			subtaskSearchQuery = "";
			toastStore.success("Subtask linked");
		} else {
			toastStore.error("Failed to link subtask");
		}
	}

	async function addLink(targetTaskId: string) {
		const res = await fetch(`/api/tasks/${task.id}/links`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetTaskId, linkType: selectedLinkType }),
		});
		if (res.ok) {
			showLinkMenu = false;
			linkSearchQuery = "";
			const data = await fetch(`/api/tasks/${task.id}/links`).then((r) =>
				r.json(),
			);
			linkedTasks = data;
			toastStore.success("Link added");
		} else {
			const err = await res.json();
			toastStore.error(err.error || "Failed to link task");
		}
	}

	async function removeLink(linkId: string) {
		const res = await fetch(`/api/tasks/${task.id}/links`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ linkId }),
		});
		if (res.ok) {
			linkedTasks = linkedTasks.filter((l) => l.id !== linkId);
			toastStore.success("Link removed");
		}
	}

	function editTiptapAction(node: HTMLElement, initialContent: string) {
		editEditor = new Editor({
			element: node,
			extensions: [StarterKit],
			content: initialContent,
			editorProps: {
				attributes: {
					class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none p-3",
				},
			},
		});
		return { destroy: () => editEditor?.destroy() };
	}

	async function saveCommentEdit(id: string) {
		if (!editEditor) return;
		const content = editEditor.getHTML();
		const res = await fetch(`/api/comments/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
		if (res.ok) {
			editingCommentId = null;
			const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
			taskComments = await freshRes.json();
		}
	}

	function confirmDeleteComment(id: string) {
		modalStore.show({
			title: 'Delete Comment',
			description: 'Are you sure you want to delete this comment? This action cannot be undone.',
			confirmText: 'Delete Comment',
			destructive: true,
			onConfirm: () => deleteComment(id),
		});
	}

	async function deleteComment(id: string) {
		const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
		if (res.ok) {
			const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
			taskComments = await freshRes.json();
			toastStore.success('Comment deleted');
		} else {
			toastStore.error('Failed to delete comment');
		}
	}

	async function updateSubtaskTitle(subtaskId: string, newTitle: string) {
		if (!newTitle.trim()) return;
		const formData = new FormData();
		formData.append('taskId', subtaskId);
		formData.append('title', newTitle.trim());
		const res = await fetch(`${$page.url.pathname}?/updateTask`, {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': 'true' }
		});
		
		let success = false;
		try {
			const result = await res.json();
			success = result.type === 'success';
		} catch (e) {
			success = res.ok;
		}

		if (!success) toastStore.error('Failed to update title');
	}

	function confirmDeleteSubtask(subtaskId: string) {
		modalStore.show({
			title: 'Delete Subtask',
			description: 'Are you sure you want to delete this subtask? This action cannot be undone.',
			confirmText: 'Delete Task',
			destructive: true,
			onConfirm: async () => {
				const formData = new FormData();
				formData.append('taskId', subtaskId);
				const res = await fetch(`${$page.url.pathname}?/softDeleteTask`, {
					method: 'POST',
					body: formData,
					headers: { 'x-sveltekit-action': 'true' }
				});
				let success = false;
				try {
					const result = await res.json();
					success = result.type === 'success';
				} catch (e) {
					success = res.ok;
				}

				if (success) {
					toastStore.success('Subtask deleted');
				} else {
					toastStore.error('Failed to delete subtask');
				}
			}
		});
	}

	async function unlinkSubtask(subtaskId: string) {
		const formData = new FormData();
		formData.append('taskId', subtaskId);
		formData.append('parentTaskId', '');
		const res = await fetch(`${$page.url.pathname}?/linkSubtask`, {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': 'true' }
		});
		
		let success = false;
		try {
			const result = await res.json();
			success = result.type === 'success';
		} catch (e) {
			success = res.ok;
		}

		if (success) {
			toastStore.success("Subtask unlinked");
		} else {
			toastStore.error("Failed to unlink subtask");
		}
	}

	async function toggleSubtask(subtask: any) {
		let boardStages = stages;
		if (!boardStages || boardStages.length === 0) {
			toastStore.error("Cannot toggle subtask from this view.");
			return;
		}

		const currentStage = boardStages.find(s => s.id === subtask.stageId);
		const isDone = currentStage?.name?.toLowerCase().match(/done|completed|closed|resolved/);
		const targetStage = isDone 
			? boardStages[0]?.id 
			: (boardStages.find(s => s.name.toLowerCase().match(/done|completed|closed|resolved/))?.id || boardStages[boardStages.length - 1]?.id);
		
		if (targetStage && targetStage !== subtask.stageId) {
			const formData = new FormData();
			formData.append('taskId', subtask.id);
			formData.append('title', subtask.title); // Title is strictly required by the backend
			formData.append('stageId', targetStage);
			const res = await fetch(`${$page.url.pathname}?/updateTask`, {
				method: 'POST',
				body: formData,
				headers: { 'x-sveltekit-action': 'true' }
			});
			let success = false;
			try {
				const result = await res.json();
				success = result.type === 'success';
			} catch (e) {
				success = res.ok;
			}
			if (!success) toastStore.error('Failed to toggle subtask status');
		}
	}

	function isSubtaskDone(subtask: any) {
		if (!stages || stages.length === 0) return false;
		const s = stages.find(s => s.id === subtask.stageId);
		return !!s?.name?.toLowerCase().match(/done|completed|closed|resolved/);
	}

	let isCompleted = $derived((() => {
		const stage = stages?.find(s => s.id === task.stageId);
		if (!stage) return false;
		return stage.isCompleted === true;
	})());

	function handleMarkComplete() {
		const doneStage = stages?.find(s => (!task.boardId || s.boardId === task.boardId) && s.isCompleted === true);
		if (doneStage && task.stageId !== doneStage.id) {
			task.stageId = doneStage.id;
			handlePropertyChange();
		}
	}

	function handleUnmarkComplete() {
		const todoStage = stages?.find(s => (!task.boardId || s.boardId === task.boardId) && !s.isCompleted);
		if (todoStage && task.stageId !== todoStage.id) {
			task.stageId = todoStage.id;
			handlePropertyChange();
		}
	}

	// Attachments
	let taskAttachments = $state<any[]>([]);
	let isUploading = $state(false);

	async function fetchAttachments() {
		try {
			const res = await fetch(`/api/tasks/${task.id}/attachments`);
			if (res.ok) {
				taskAttachments = await res.json();
			}
		} catch (e) {
			console.error("Failed to fetch attachments", e);
		}
	}

	let previewAttachment = $state<any>(null);
	let previewTextContent = $state<string | null>(null);
	let loadingText = $state(false);

	function isImageFile(file: any) {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('image/')) return true;
		const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
		return imgExts.some(ext => name.endsWith(ext));
	}

	function isPdfFile(file: any) {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type === 'application/pdf') return true;
		return name.endsWith('.pdf');
	}

	function isTextFile(file: any) {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		
		if (type.startsWith('text/') || type === 'application/json' || type === 'application/javascript' || type === 'application/x-typescript') {
			return true;
		}

		const txtExtensions = ['.env', '.json', '.md', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.sh', '.py', '.ini', '.conf', '.log', '.csv', '.txt'];
		return txtExtensions.some(ext => name.endsWith(ext));
	}

	function isOfficeDoc(file: any) {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();

		const isOfficeMime = type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			type === 'application/msword' ||
			type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			type === 'application/vnd.ms-excel' ||
			type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
			type === 'application/vnd.ms-powerpoint';
		if (isOfficeMime) return true;

		const docExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];
		return docExtensions.some(ext => name.endsWith(ext));
	}

	function isVideoFile(file: any) {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('video/')) return true;
		const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.mkv'];
		return videoExts.some(ext => name.endsWith(ext));
	}

	async function openPreview(file: any) {
		previewAttachment = file;
		previewTextContent = null;

		if (isTextFile(file)) {
			loadingText = true;
			try {
				const res = await fetch(file.fileUrl);
				if (res.ok) {
					const contentLength = res.headers.get('Content-Length');
					if (contentLength && parseInt(contentLength) > 1 * 1024 * 1024) {
						previewTextContent = 'This file exceeds the 1MB inline preview limit. Please download the file to view its full contents.';
					} else {
						const text = await res.text();
						if (text.length > 1 * 1024 * 1024) {
							previewTextContent = 'This file exceeds the 1MB inline preview limit. Please download the file to view its full contents.';
						} else {
							previewTextContent = text;
						}
					}
				} else {
					previewTextContent = 'Error: Failed to load preview text content.';
				}
			} catch (err) {
				previewTextContent = 'Error: Failed to fetch preview.';
			} finally {
				loadingText = false;
			}
		}
	}

	function isLocalhost() {
		if (typeof window === 'undefined') return true;
		const host = window.location.hostname;
		return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.');
	}

	let absoluteOfficeUrl = $derived.by(() => {
		if (!previewAttachment) return '';
		const origin = window.location.origin;
		const absTokenUrl = `${origin}${previewAttachment.fileUrl}`;
		return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absTokenUrl)}`;
	});

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		
		const file = input.files[0];
		const formData = new FormData();
		formData.append('file', file);
		formData.append('taskId', task.id);

		isUploading = true;
		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				const data = await res.json();
				taskAttachments = [...taskAttachments, data.attachment];
				toastStore.success("Attachment uploaded");
			} else {
				const err = await res.json();
				toastStore.error(err.error || "Upload failed");
			}
		} catch (e) {
			toastStore.error("Upload failed");
		} finally {
			isUploading = false;
			input.value = '';
		}
	}

	async function deleteAttachment(id: string) {
		try {
			const res = await fetch(`/api/tasks/${task.id}/attachments/${id}`, { method: 'DELETE' });
			if (res.ok) {
				taskAttachments = taskAttachments.filter(a => a.id !== id);
				toastStore.success("Attachment deleted");
			}
		} catch (e) {
			toastStore.error("Delete failed");
		}
	}

	// Fetch Comments and Attachments on task change or stage change
	$effect(() => {
		if (task.id) {
			task.stageId; // Force reactivity when stage changes
			fetch(`/api/tasks/${task.id}/comments?t=${Date.now()}`)
				.then((r) => r.json())
				.then((data) => {
					taskComments = data;
				});
			fetchAttachments();
		}
	});

	// Sync comments, checklists, and editor content when the task ID changes (not on every mutation)
	$effect(() => {
		const id = taskId; // only track the id
		if (id) {
			untrack(() => {
				checklists = task.checklists || [];
			});

			untrack(() => {
				if (
					editor &&
					editor.getHTML() !== task.description &&
					task.description &&
					!editor.isFocused
				) {
					editor.commands.setContent(task.description);
				}
			});
		}
	});

	async function uploadImage(file: File, view: any, event: Event) {
		event.preventDefault();
		const formData = new FormData();
		formData.append("file", file);
		formData.append("taskId", task.id);

		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData,
		});
		if (res.ok) {
			const data = await res.json();
			const { schema } = view.state;
			const node = schema.nodes.image.create({
				src: data.url,
				alt: file.name,
			});
			const transaction = view.state.tr.replaceSelectionWith(node);
			view.dispatch(transaction);
		} else {
			toastStore.error("Image upload failed");
		}
	}

	const fileHandlerProps = {
		handlePaste: (view: any, event: ClipboardEvent) => {
			const items = event.clipboardData?.items;
			if (items) {
				for (let i = 0; i < items.length; i++) {
					if (items[i].type.startsWith("image/")) {
						const file = items[i].getAsFile();
						if (file) {
							uploadImage(file, view, event);
							return true;
						}
					}
				}
			}
			return false;
		},
		handleDrop: (
			view: any,
			event: DragEvent,
			_slice: any,
			moved: boolean,
		) => {
			if (!moved && event.dataTransfer?.files?.[0]) {
				const file = event.dataTransfer.files[0];
				if (file.type.startsWith("image/")) {
					uploadImage(file, view, event);
					return true;
				}
			}
			return false;
		},
	};

	function tiptapAction(node: HTMLElement) {
		editor = new Editor({
			element: node,
			extensions: [
				StarterKit,
				Image.configure({
					HTMLAttributes: {
						class: "rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-full",
					},
				}),
			],
			content: task.description || "",
			editorProps: {
				attributes: {
					class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px] p-4 text-zinc-900 dark:text-zinc-100",
				},
				...fileHandlerProps,
			},
			onUpdate: ({ editor }) => {
				task.description = editor.getHTML();
			},
			onBlur: () => {
				handlePropertyChange();
			},
		});
		return { destroy: () => editor?.destroy() };
	}

	function createMentionExtension() {
		return Mention.configure({
			HTMLAttributes: {
				class: "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md",
			},
			suggestion: {
				items: async ({ query }: { query: string }) => {
					const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
					if (!res.ok) return [];
					return await res.json();
				},
				render: () => {
					return {
						onStart: (props) => {
							mentionProps = {
								items: props.items,
								command: props.command,
								clientRect: props.clientRect?.(),
								selectedIndex: 0,
							};
						},
						onUpdate: (props) => {
							mentionProps.items = props.items;
							mentionProps.clientRect = props.clientRect?.();
							mentionProps.command = props.command;
						},
						onKeyDown: (props) => {
							if (props.event.key === "ArrowDown") {
								mentionProps.selectedIndex =
									(mentionProps.selectedIndex + 1) %
									mentionProps.items.length;
								return true;
							}
							if (props.event.key === "ArrowUp") {
								mentionProps.selectedIndex =
									(mentionProps.selectedIndex -
										1 +
										mentionProps.items.length) %
									mentionProps.items.length;
								return true;
							}
							if (props.event.key === "Enter") {
								if (mentionProps.items.length > 0)
									mentionProps.command({
										id: mentionProps.items[
											mentionProps.selectedIndex
										].id,
										label: mentionProps.items[
											mentionProps.selectedIndex
										].name,
									});
								return true;
							}
							return false;
						},
						onExit: () => {
							mentionProps.items = [];
							mentionProps.clientRect = null;
						},
					};
				},
			},
		});
	}

	function commentTiptapAction(node: HTMLElement) {
		commentEditor = new Editor({
			element: node,
			extensions: [
				StarterKit,
				Image.configure({
					HTMLAttributes: {
						class: "rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-full",
					},
				}),
				createMentionExtension(),
			],
			content: "",
			editorProps: {
				attributes: {
					class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[80px] max-h-32 p-3 custom-scrollbar overflow-y-auto",
				},
				...fileHandlerProps,
			},
		});
		return {
			destroy() {
				commentEditor?.destroy();
			},
		};
	}

	function replyTiptapAction(node: HTMLElement) {
		replyEditor = new Editor({
			element: node,
			extensions: [
				StarterKit,
				Image.configure({
					HTMLAttributes: {
						class: "rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-full",
					},
				}),
				createMentionExtension(),
			],
			content: "",
			editorProps: {
				attributes: {
					class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[60px] max-h-32 p-3 custom-scrollbar overflow-y-auto",
				},
				...fileHandlerProps,
			},
		});
		return {
			destroy() {
				replyEditor?.destroy();
			},
		};
	}

	async function submitComment() {
		if (!commentEditor) return;
		const content = commentEditor.getHTML();
		if (!content || content === "<p></p>") return;

		const res = await fetch(`/api/tasks/${task.id}/comments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});

		if (res.ok) {
			const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
			taskComments = await freshRes.json();
			commentEditor.commands.setContent("");
		}
	}

	async function submitReply(parentId: string) {
		if (!replyEditor) return;
		const content = replyEditor.getHTML();
		if (!content || content === "<p></p>") return;

		const res = await fetch(`/api/tasks/${task.id}/comments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content, parentCommentId: parentId }),
		});

		if (res.ok) {
			const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
			taskComments = await freshRes.json();
			replyingToId = null;
		}
	}

	async function toggleReaction(commentId: string, emoji: string) {
		const res = await fetch(`/api/comments/${commentId}/reactions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ emoji }),
		});
		if (res.ok) {
			const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
			taskComments = await freshRes.json();
		}
	}

	function handlePropertyChange() {
		if (typeof window !== "undefined") {
			setTimeout(() => {
				(
					document.getElementById("task-form") as HTMLFormElement
				)?.requestSubmit();
			}, 10);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (mentionProps.clientRect) return; // Let tiptap handle arrows if mention popup is open

		const active = document.activeElement as HTMLElement | null;
		const isInput =
			active?.tagName === "INPUT" ||
			active?.tagName === "TEXTAREA" ||
			active?.isContentEditable;

		if (isInput) {
			if (e.metaKey && e.key === "Enter") {
				e.preventDefault();
				if (active.id === "task-title-input") {
					active.blur();
					(
						document.getElementById("task-form") as HTMLFormElement
					)?.requestSubmit();
					toastStore.success("Task title updated");
				} else if (commentEditor && active.closest(".tiptap")) {
					submitComment();
				}
			}
			return;
		}
		if (e.key === "Escape") onClose();

		if (e.key.toLowerCase() === "c") {
			if (commentEditor) {
				e.preventDefault();
				commentEditor.commands.focus();
			}
		} else if (e.key.toLowerCase() === "a") {
			const assigneeBtn = document.querySelector("#assignee-wrapper button") as HTMLButtonElement | null;
			if (assigneeBtn) {
				e.preventDefault();
				assigneeBtn.click();
				assigneeBtn.focus();
			}
		} else if (e.key.toLowerCase() === "p") {
			const priorityBtn = document.querySelector("#priority-wrapper button") as HTMLButtonElement | null;
			if (priorityBtn) {
				e.preventDefault();
				priorityBtn.click();
				priorityBtn.focus();
			}
		}
	}

	// ... Checklist logic
	function addChecklistItem() {
		if (!newChecklistText.trim()) return;
		checklists = [
			...checklists,
			{ id: crypto.randomUUID(), text: newChecklistText, done: false },
		];
		newChecklistText = "";
		saveChecklists();
	}
	function toggleChecklist(id: string) {
		checklists = checklists.map((c) =>
			c.id === id ? { ...c, done: !c.done } : c,
		);
		saveChecklists();
	}
	function deleteChecklist(id: string) {
		checklists = checklists.filter((c) => c.id !== id);
		saveChecklists();
	}
	function saveChecklists() {
		task.checklists = checklists;
		// Use the existing form's requestSubmit to go through SvelteKit's enhance flow
		handlePropertyChange();
	}

</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Mention Dropdown Overlay -->
{#if mentionProps.clientRect && mentionProps.items.length > 0}
	<div
		class="fixed z-[999999] w-56 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
		style="top: {mentionProps.clientRect.bottom + 4}px; left: {mentionProps
			.clientRect.left}px;"
	>
		{#each mentionProps.items as item, i}
			<button
				type="button"
				class="w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors {i ===
				mentionProps.selectedIndex
					? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-blue-400 font-medium'
					: 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5'}"
				onclick={() =>
					mentionProps.command({ id: item.id, label: item.name })}
			>
				<Avatar name={item.name} size="xs" />
				<span class="truncate">{item.name}</span>
			</button>
		{/each}
	</div>
{/if}

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm z-50 transition-opacity flex justify-end pointer-events-auto"
	onclick={onClose}
>
	<!-- Centered Modal -->
	<div
		class="w-full h-full lg:w-[1100px] lg:max-w-full lg:max-h-full bg-white dark:bg-[#0c0c0d] lg:rounded-l-2xl shadow-[-10px_0_40px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_40px_rgba(0,0,0,0.5)] border-l border-zinc-200/80 dark:border-white/10 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right duration-200"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Modal Header -->
		<div
			class="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]"
		>
			<div class="flex items-center gap-3">
				<div
					class="px-2.5 py-1 bg-zinc-200/50 dark:bg-white/10 rounded-md text-xs font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-400"
				>
					{getTaskIdentifier(task)}
				</div>
				{#if isCompleted}
					<button 
						type="button"
						onclick={handleUnmarkComplete} 
						class="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-bold transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer group"
						title="Unmark Complete"
					>
						<CheckCircle2 class="w-3.5 h-3.5" />
						<span>Completed</span>
					</button>
				{:else}
					<button 
						type="button" 
						class="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-md text-xs font-bold transition-colors group"
						onclick={handleMarkComplete}
						title="Move to Done/Completed stage"
					>
						<CheckCircle2 class="w-3.5 h-3.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-zinc-400 dark:text-zinc-500 transition-colors" />
						<span class="text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Mark Complete</span>
					</button>
				{/if}
			</div>
				<div class="flex items-center gap-3">
					<button 
						class="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
					>
						<Layout class="w-3.5 h-3.5" />
						{task.boardName || 'Board'}
						<span class="text-zinc-300 dark:text-zinc-600 px-1">/</span>
						<span class="text-blue-600 dark:text-blue-400 font-bold tracking-tight">
							{getTaskIdentifier(task)}
						</span>
					</button>
				</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
					onclick={onClose}
				>
					<X class="w-5 h-5" />
				</button>
			</div>
		</div>

		<div class="flex-1 flex overflow-hidden relative">
			<!-- Left Main Content -->
			<div
				class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 pb-24"
			>
				<form
					method="POST"
					action="?/updateTask"
					id="task-form"
					use:enhance={() => {
						return async ({ update, result }) => {
							update({ reset: false });
							if (result.type === "success") {
								toastStore.success("Task saved");
								const freshRes = await fetch(`/api/tasks/${task.id}/comments`);
								taskComments = await freshRes.json();
							}
						};
					}}
				>
					<input type="hidden" name="taskId" value={task.id} />
					<input
						type="hidden"
						name="checklists"
						value={JSON.stringify(checklists)}
					/>
					<input
						type="hidden"
						name="customFields"
						value={JSON.stringify(task.customFields || {})}
					/>

					<!-- Title -->
					<div class="mb-6 group relative">
						{#if task.parentTaskId}
							{@const parentTask = allTasks.find(t => t.id === task.parentTaskId)}
							{#if parentTask}
								<div class="mb-2 inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-white/5 rounded-md text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors" onclick={() => {
									task = parentTask;
								}}>
									<ListTree class="w-3.5 h-3.5" />
									Parent: {getTaskIdentifier(parentTask)}
								</div>
							{/if}
						{/if}
						<textarea
							id="task-title-input"
							name="title"
							bind:value={task.title}
							onblur={handlePropertyChange}
							required
							class="w-full text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl focus:border-blue-500/50 hover:border-zinc-300 dark:hover:border-white/20 focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 p-3 leading-tight transition-all"
							rows="2"
							placeholder="Task Title"
						></textarea>
					</div>
					<TaskDescription {task} {editor} {tiptapAction} />



					<!-- Attachments -->
					<div class="mb-8">
						<div class="flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100 font-semibold">
							<Paperclip class="w-4 h-4 text-zinc-400" /> Attachments
						</div>
						
						<div class="flex flex-col gap-3">
							{#each taskAttachments as att (att.id)}
								{@const canPreview = isVideoFile(att) || isImageFile(att) || isPdfFile(att) || isTextFile(att) || isOfficeDoc(att)}
								<div class="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-white/5">
									<div class="flex items-center gap-3 min-w-0 flex-1">
										{#if isVideoFile(att)}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<div class="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 cursor-pointer" onclick={() => openPreview(att)}>
												<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
													<polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
												</svg>
											</div>
										{:else if isImageFile(att)}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<img src={att.fileUrl} alt={att.fileName} class="w-8 h-8 rounded object-cover shrink-0 cursor-pointer" onclick={() => openPreview(att)} />
										{:else}
											<div class="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
												<FileText class="w-4 h-4 text-zinc-500" />
											</div>
										{/if}
										<div class="flex flex-col min-w-0 flex-1">
											{#if canPreview}
												<button 
													type="button" 
													onclick={() => openPreview(att)} 
													class="text-sm font-medium text-left text-blue-600 dark:text-blue-400 hover:underline truncate"
												>
													{att.fileName}
												</button>
											{:else}
												<a href={att.fileUrl} download={att.fileName} class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate">
													{att.fileName}
												</a>
											{/if}
											<span class="text-xs text-zinc-500">{new Date(att.createdAt).toLocaleDateString()}</span>
										</div>
									</div>
									<div class="flex items-center gap-1 shrink-0">
										{#if canPreview}
											<button type="button" onclick={() => openPreview(att)} class="p-2 text-zinc-400 hover:text-blue-500 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Preview">
												<Eye class="w-4 h-4" />
											</button>
										{/if}
										<a href={att.fileUrl} download={att.fileName} class="p-2 text-zinc-400 hover:text-blue-500 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Download">
											<Download class="w-4 h-4" />
										</a>
										<button type="button" onclick={() => deleteAttachment(att.id)} class="p-2 text-zinc-400 hover:text-red-500 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</div>
							{/each}

							<div class="relative">
								<input type="file" id="file-upload" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt,.json,.log,.md,.js,.ts,.mp4,.webm,.ogg,.mov,.mkv" onchange={handleFileUpload} disabled={isUploading} />
								<div class="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
									{#if isUploading}
										<div class="animate-spin w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full"></div> Uploading...
									{:else}
										<Plus class="w-4 h-4" /> Add attachment
									{/if}
								</div>
							</div>
						</div>
					</div>

					<TaskChecklists 
						{checklists}
						{toggleChecklist}
						{deleteChecklist}
						bind:newChecklistText
						{addChecklistItem}
					/>
					<TaskActivityFeed 
						bind:activeTab 
						{activityItems}
						{commentTiptapAction}
						{submitComment}
						bind:editingCommentId
						{editTiptapAction}
						{saveCommentEdit}
						{confirmDeleteComment}
						bind:replyingToId
						bind:showReactionPopupId
						{COMMON_EMOJIS}
						{EMOJI_MAP}
						{toggleReaction}
						{replyTiptapAction}
						{submitReply}
						{getOracleIconInfo}
						{formatAuditValue}
					/>
				</form>
			</div>

			<!-- Right Properties Sidebar (Linear Style) -->
			<div class="w-[300px] xl:w-[340px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-6 bg-zinc-50/50 dark:bg-[#09090b] overflow-y-auto custom-scrollbar">
				<TaskDrawerProperties bind:task groupUsers={groupUsers} stages={stages} customFields={customFields} projectTags={projectTags} {projectId} handlePropertyChange={handlePropertyChange} />
				<!-- Subtasks & Linked Tasks -->
				<div class="mt-2 space-y-8">
					<!-- Subtasks -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<div
								class="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2"
							>
								<List class="w-3.5 h-3.5" /> Subtasks
							</div>
							{#if subtasks.length > 0}
								<div
									class="text-xs font-semibold text-zinc-400"
								>
									◕ {subtasks.length}
								</div>
							{/if}
						</div>

						{#if subtasks.length > 0}
							<div class="space-y-0.5 mb-3">
								{#each subtasks as subtask}
									<div
										class="w-full text-left flex items-center gap-2.5 py-1 px-2 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
									>
										<button 
											type="button"
											onclick={() => toggleSubtask(subtask)} 
											class="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors {isSubtaskDone(subtask) ? 'bg-blue-500 border-blue-500' : 'border-zinc-300 dark:border-zinc-600'}"
										>
											{#if isSubtaskDone(subtask)}
												<Check class="w-3 h-3 text-white" />
											{/if}
										</button>
										<button 
											type="button"
											onclick={() => task = subtask} 
											class="shrink-0 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
										>
											{getTaskIdentifier(subtask)}
										</button>
										<input 
											type="text" 
											value={subtask.title} 
											onblur={(e) => updateSubtaskTitle(subtask.id, e.currentTarget.value)}
											onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
											class="flex-1 min-w-0 text-[13px] font-medium text-zinc-700 dark:text-zinc-200 bg-transparent border-none p-0 focus:ring-0 truncate hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-[#121214] rounded px-1 -ml-1 transition-colors {isSubtaskDone(subtask) ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}"
										/>
										<div class="flex items-center gap-1 shrink-0">
											<button 
												type="button"
												onclick={() => unlinkSubtask(subtask.id)} 
												class="p-1 opacity-0 group-hover:opacity-100 hover:text-zinc-500 transition-opacity"
												title="Unlink Subtask (Make it a root task)"
											>
												<Unlink class="w-3.5 h-3.5" />
											</button>
											<button 
												type="button"
												onclick={() => confirmDeleteSubtask(subtask.id)} 
												class="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
												title="Delete Subtask"
											>
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="text-xs text-zinc-500 bg-white dark:bg-white/5 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 text-center mb-3"
							>
								No subtasks yet.
							</div>
						{/if}

						{#if showSubtaskMenu}
							<div
								class="p-3 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl space-y-3 mb-3 relative animate-in fade-in slide-in-from-top-2"
							>
								<div class="flex justify-between items-center mb-1">
									<span class="text-xs font-bold text-zinc-600 dark:text-zinc-300">Add Subtask</span>
									<button type="button" onclick={() => (showSubtaskMenu = false)} class="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
										<X class="w-4 h-4" />
									</button>
								</div>

								<form
									method="POST"
									action="?/createTask"
									use:enhance={() => {
										return async ({ update }) => {
											update({ reset: true });
											showSubtaskMenu = false;
										};
									}}
								>
									<input type="hidden" name="parentTaskId" value={task.id} />
									<input type="hidden" name="stageId" value={task.stageId} />
									<input
										type="text"
										name="title"
										required
										placeholder="Create new subtask..."
										class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-zinc-500 mb-2"
									/>
									<button type="submit" class="w-full py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Create Subtask</button>
								</form>

								<div class="relative pt-2 border-t border-zinc-200 dark:border-zinc-800">
									<div class="text-xs font-semibold text-zinc-500 mb-2">Or link existing task:</div>
									<div class="relative">
										<Search class="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
										<input
											type="text"
											bind:value={subtaskSearchQuery}
											placeholder="Search tasks to link..."
											class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-zinc-500"
										/>
										{#if subtaskSearchQuery.length >= 2}
											<div class="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-1">
												{#each subtaskSearchResults as res}
													<button
														type="button"
														onclick={() => linkSubtask(res.id)}
														class="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 truncate"
													>
														<span class="text-zinc-500 mr-1.5 text-xs font-semibold">{getTaskIdentifier(res)}</span>{res.title}
													</button>
												{:else}
													<div class="px-3 py-2 text-xs text-zinc-500 text-center">No tasks found</div>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => (showSubtaskMenu = true)}
								class="w-full py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
							>
								+ Add subtask
							</button>
						{/if}
					</div>

					<!-- Sibling Tasks -->
					{#if siblingTasks.length > 0}
						<div>
							<div class="flex items-center justify-between mb-3">
								<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
									<Layers class="w-3.5 h-3.5" /> Sibling Tasks
								</div>
								<div class="text-xs font-semibold text-zinc-400">◕ {siblingTasks.length}</div>
							</div>
							<div class="space-y-0.5">
								{#each siblingTasks as sibling}
									<div class="w-full text-left flex items-center gap-2.5 py-1 px-2 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group">
										<button 
											type="button"
											onclick={() => toggleSubtask(sibling)}
											class="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors {isSubtaskDone(sibling) ? 'bg-blue-500 border-blue-500' : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer'}"
										>
											{#if isSubtaskDone(sibling)}
												<Check class="w-3 h-3 text-white" />
											{/if}
										</button>
										<button 
											type="button"
											onclick={() => task = sibling} 
											class="shrink-0 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
										>
											{getTaskIdentifier(sibling)}
										</button>
										<div class="flex-1 text-[13px] font-medium text-zinc-700 dark:text-zinc-200 truncate {isSubtaskDone(sibling) ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">
											{sibling.title}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Linked Tasks -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<div
								class="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2"
							>
								<LinkIcon class="w-3.5 h-3.5" /> Linked Tasks
							</div>
							{#if linkedTasks.length > 0}
								<div
									class="text-xs font-semibold text-zinc-400"
								>
									◕ {linkedTasks.length}
								</div>
							{/if}
						</div>

						{#if linkedTasks.length > 0}
							<div class="space-y-0.5 mb-3">
								{#each linkedTasks as link}
									<div
										class="w-full text-left flex items-center gap-2 py-1.5 px-2 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg group"
									>
										<div class="flex-1 overflow-hidden">
											<div
												class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5"
											>
												{link.linkType.replace(
													/_/g,
													" ",
												)}
												{link.direction === "in"
													? "(Incoming)"
													: ""}
											</div>
											<div
												class="text-[13px] font-medium text-zinc-700 dark:text-zinc-200 truncate"
											>
												{link.title}
											</div>
										</div>
										<button
											onclick={() => removeLink(link.id)}
											class="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all rounded-md hover:bg-white dark:hover:bg-black/20 shrink-0"
										>
											<Trash2 class="w-3.5 h-3.5" />
										</button>
									</div>
								{/each}
							</div>
						{/if}

						{#if showLinkMenu}
							<div
								class="p-3 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl space-y-3 mb-3 relative animate-in fade-in slide-in-from-top-2"
							>
								<div
									class="flex justify-between items-center mb-1"
								>
									<span
										class="text-xs font-bold text-zinc-600 dark:text-zinc-300"
										>Add Dependency</span
									>
									<button
										onclick={() => (showLinkMenu = false)}
										class="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
										><X class="w-4 h-4" /></button
									>
								</div>

								<select
									bind:value={selectedLinkType}
									class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
								>
									<option value="blocks">Blocks</option>
									<option value="is_blocked_by"
										>Is blocked by</option
									>
									<option value="relates_to"
										>Relates to</option
									>
									<option value="duplicates"
										>Duplicates</option
									>
								</select>

								<div class="relative">
									<Search
										class="w-4 h-4 absolute left-3 top-2.5 text-zinc-400"
									/>
									<input
										type="text"
										bind:value={linkSearchQuery}
										placeholder="Search tasks..."
										class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-zinc-500"
									/>

									{#if linkSearchQuery.length >= 2}
										<div
											class="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-1"
										>
											{#each linkSearchResults as res}
												<button
													onclick={() =>
														addLink(res.id)}
													class="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 truncate"
												>
													<span class="text-zinc-500 mr-1.5 text-xs font-semibold">{getTaskIdentifier(res)}</span>{res.title}
												</button>
											{:else}
												<div
													class="px-3 py-2 text-xs text-zinc-500 text-center"
												>
													No tasks found
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<button
								onclick={() => (showLinkMenu = true)}
								class="w-full py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
								>+ Add link</button
							>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if previewAttachment}
	<!-- Modal backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6"
		onclick={(e) => { if (e.target === e.currentTarget) previewAttachment = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') previewAttachment = null; }}
	>
		<!-- Modal box -->
		<div 
			class="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
		>
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-zinc-800 flex justify-between items-center text-white bg-zinc-950/40">
				<div class="flex items-center gap-3 min-w-0">
					<FileIcon class="w-5 h-5 text-blue-500 shrink-0" />
					<h3 class="font-bold text-sm truncate">{previewAttachment.fileName}</h3>
				</div>
				<div class="flex items-center gap-3">
					<a 
						href={previewAttachment.fileUrl} 
						download={previewAttachment.fileName}
						class="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors min-h-[36px]"
					>
						<Download class="w-3.5 h-3.5" />
						Download
					</a>
					<button 
						type="button" 
						onclick={() => previewAttachment = null} 
						class="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Modal Body (Preview Area) -->
			<div class="p-6 flex-1 max-h-[75vh] overflow-y-auto flex items-center justify-center bg-zinc-950/20">
				{#if loadingText}
					<div class="flex flex-col items-center gap-3 py-12 text-zinc-400">
						<div class="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
						<span class="text-xs">Loading text preview...</span>
					</div>
				{:else if isVideoFile(previewAttachment)}
					<VideoPlayer
						src={previewAttachment.fileUrl}
						mimeType={previewAttachment.mimeType || 'video/mp4'}
						fileName={previewAttachment.fileName}
					/>
				{:else if isImageFile(previewAttachment)}
					<img src={previewAttachment.fileUrl} alt={previewAttachment.fileName} class="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" />
				{:else if isPdfFile(previewAttachment)}
					<iframe sandbox="allow-scripts" src={previewAttachment.fileUrl} title={previewAttachment.fileName} class="w-full h-[65vh] border-0 rounded-lg bg-white"></iframe>
				{:else if isOfficeDoc(previewAttachment)}
					{#if isLocalhost()}
						<div class="text-center py-12 text-zinc-400 space-y-4 max-w-md mx-auto">
							<FileIcon class="w-12 h-12 mx-auto text-blue-500" />
							<p class="text-sm font-semibold text-zinc-200">Office Preview Disabled on Localhost</p>
							<p class="text-xs text-zinc-400">Microsoft Office Online requires a publicly accessible URL to download and render documents. It cannot connect to your local development server.</p>
							<a 
								href={previewAttachment.fileUrl} 
								download={previewAttachment.fileName}
								class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors min-h-[38px] shadow"
							>
								<Download class="w-4 h-4" />
								Download to View Locally
							</a>
						</div>
					{:else}
						<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src={absoluteOfficeUrl} title={previewAttachment.fileName} class="w-full h-[65vh] border-0 rounded-lg bg-white"></iframe>
					{/if}
				{:else if previewTextContent !== null}
					<pre class="w-full bg-zinc-950 text-zinc-100 p-5 rounded-xl font-mono text-xs overflow-auto max-h-[65vh] whitespace-pre-wrap select-text border border-zinc-800">{previewTextContent}</pre>
				{:else}
					<div class="text-center py-12 text-zinc-400 space-y-3">
						<FileIcon class="w-12 h-12 mx-auto text-zinc-600" />
						<p class="text-sm">Preview not supported for this file type.</p>
						<p class="text-xs text-zinc-500">Please download the file to view it locally.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
