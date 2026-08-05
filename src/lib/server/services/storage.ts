import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Validates image files for workspace logo uploads.
 */
export function validateLogoImage(file: File): { valid: true } | { valid: false; error: string } {
	const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']);
	const lastDot = file.name.lastIndexOf('.');
	const ext = lastDot !== -1 ? file.name.substring(lastDot).toLowerCase() : '';
	const allowedExts = new Set(['.png', '.jpeg', '.jpg', '.gif', '.webp', '.svg']);

	if (!allowedTypes.has(file.type) && !allowedExts.has(ext)) {
		return { valid: false, error: `Invalid image format "${ext || file.type}". Allowed formats: PNG, JPG, WEBP, GIF, SVG.` };
	}

	const maxBytes = 10 * 1024 * 1024; // 10MB limit for logos
	if (file.size > maxBytes) {
		return { valid: false, error: 'Logo file size exceeds the 10MB limit.' };
	}

	return { valid: true };
}

/**
 * Saves a workspace logo image file.
 * Automatically handles local disk ('static/uploads/logos') or S3 cloud bucket storage based on env configuration.
 */
export async function saveLogoImage(file: File): Promise<string> {
	const storageProvider = env.STORAGE_PROVIDER || (env.S3_BUCKET ? 's3' : 'local');

	const uniqueId = crypto.randomUUID();
	const extension = path.extname(file.name) || '.png';
	const uniqueFileName = `${uniqueId}${extension}`;

	if (storageProvider === 's3' && env.S3_BUCKET) {
		// When S3 bucket is configured, build S3 key and domain
		const s3Domain = env.S3_PUBLIC_DOMAIN || `https://${env.S3_BUCKET}.s3.${env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
		return `${s3Domain}/logos/${uniqueFileName}`;
	}

	// Default Local Disk Storage
	const uploadDir = path.resolve('static/uploads/logos');
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}

	const filePath = path.join(uploadDir, uniqueFileName);
	const buffer = Buffer.from(await file.arrayBuffer());
	fs.writeFileSync(filePath, buffer);

	return `/uploads/logos/${uniqueFileName}`;
}
