export const ALLOWED_MIME_TYPES = new Set<string>([
	// Images
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	// PDFs
	'application/pdf',
	// Word documents
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	// Excel spreadsheets
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-excel',
	'text/csv',
	// PowerPoint presentations
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.ms-powerpoint',
	// Plain text / Logs / Configs / Scripts / Web
	'text/plain',
	'text/log',
	'application/json',
	'text/markdown',
	'text/html',
	'text/css',
	'application/javascript',
	'application/x-typescript'
]);

export const ALLOWED_EXTENSIONS = new Set<string>([
	'.png', '.jpeg', '.jpg', '.gif', '.webp', '.svg',
	'.pdf',
	'.docx', '.doc',
	'.xlsx', '.xls', '.csv',
	'.pptx', '.ppt',
	'.txt', '.log', '.json', '.env', '.md', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.sh', '.py', '.ini', '.conf'
]);

export function validateUploadedFile(file: File): { valid: true } | { valid: false; error: string } {
	const hasMime = ALLOWED_MIME_TYPES.has(file.type);

	// Get extension from filename
	const lastDot = file.name.lastIndexOf('.');
	const ext = lastDot !== -1 ? file.name.substring(lastDot).toLowerCase() : '';
	const hasExt = ALLOWED_EXTENSIONS.has(ext);

	if (!hasMime && !hasExt) {
		return { valid: false, error: `File type "${ext || file.type || 'unknown'}" is not allowed. Only images, PDFs, Office documents, CSV, and text/log files are supported.` };
	}

	const maxBytes = 20 * 1024 * 1024; // 20MB
	if (file.size > maxBytes) {
		return { valid: false, error: 'File size exceeds the maximum limit of 20MB.' };
	}

	return { valid: true };
}
