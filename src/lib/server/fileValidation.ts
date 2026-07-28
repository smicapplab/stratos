const VIDEO_MIME_TYPES = new Set<string>([
	'video/mp4',
	'video/webm',
	'video/ogg',
	'video/quicktime',
	'video/x-matroska'
]);

const VIDEO_EXTENSIONS = new Set<string>([
	'.mp4', '.webm', '.ogg', '.mov', '.mkv'
]);

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
	'application/x-typescript',
	// Video
	...VIDEO_MIME_TYPES
]);

export const ALLOWED_EXTENSIONS = new Set<string>([
	'.png', '.jpeg', '.jpg', '.gif', '.webp', '.svg',
	'.pdf',
	'.docx', '.doc',
	'.xlsx', '.xls', '.csv',
	'.pptx', '.ppt',
	'.txt', '.log', '.json', '.env', '.md', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.sh', '.py', '.ini', '.conf',
	// Video
	'.mp4', '.webm', '.ogg', '.mov', '.mkv'
]);

const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;  // 20MB

export function isVideoFile(mimeType: string, fileName: string): boolean {
	if (VIDEO_MIME_TYPES.has(mimeType)) return true;
	const lastDot = fileName.lastIndexOf('.');
	const ext = lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : '';
	return VIDEO_EXTENSIONS.has(ext);
}

export function validateUploadedFile(file: File): { valid: true } | { valid: false; error: string } {
	const hasMime = ALLOWED_MIME_TYPES.has(file.type);

	const lastDot = file.name.lastIndexOf('.');
	const ext = lastDot !== -1 ? file.name.substring(lastDot).toLowerCase() : '';
	const hasExt = ALLOWED_EXTENSIONS.has(ext);

	if (!hasMime && !hasExt) {
		return { valid: false, error: `File type "${ext || file.type || 'unknown'}" is not allowed. Only images, PDFs, Office documents, CSV, text/log files, and video files are supported.` };
	}

	const isVideo = isVideoFile(file.type, file.name);
	const maxBytes = isVideo ? VIDEO_MAX_BYTES : DEFAULT_MAX_BYTES;
	const limitLabel = isVideo ? '100MB' : '20MB';

	if (file.size > maxBytes) {
		return { valid: false, error: `File size exceeds the maximum limit of ${limitLabel}.` };
	}

	return { valid: true };
}
