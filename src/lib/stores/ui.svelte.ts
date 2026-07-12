export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

// Svelte 5 rune-based store using $state for global reactivity
export const toastStore = $state({
	toasts: [] as Toast[],
	add(message: string, type: ToastType = 'info', durationMs: number = 3000) {
		const id = crypto.randomUUID();
		this.toasts.push({ id, type, message });
		setTimeout(() => {
			this.remove(id);
		}, durationMs);
	},
	error(message: string) {
		this.add(message, 'error', 5000);
	},
	success(message: string) {
		this.add(message, 'success', 3000);
	},
	remove(id: string) {
		this.toasts = this.toasts.filter(t => t.id !== id);
	}
});

export interface ConfirmModalProps {
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	destructive?: boolean;
	onConfirm: () => void;
	onCancel?: () => void;
}

export const modalStore = $state({
	activeModal: null as ConfirmModalProps | null,
	show(props: ConfirmModalProps) {
		this.activeModal = props;
	},
	close() {
		this.activeModal = null;
	}
});
