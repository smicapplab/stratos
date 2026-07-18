import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUploadedFile } from './fileValidation';
import { generateFileToken } from './generateFileToken';
import { redis } from './redis';

// Mock Redis client
vi.mock('./redis', () => ({
	redis: {
		set: vi.fn().mockResolvedValue('OK'),
		get: vi.fn()
	}
}));

// Mock fs module for pre-signed file downloads testing
vi.mock('fs', () => ({
	default: {
		existsSync: () => true,
		promises: {
			readFile: () => Promise.resolve(Buffer.from('mock pdf data'))
		}
	}
}));

describe('File Upload Security & Pre-Signed URLs (TDD Suite)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateUploadedFile()', () => {
		it('should reject file types outside allowed MIME type set (e.g. .exe)', () => {
			const mockFile = {
				name: 'malware.exe',
				type: 'application/x-msdownload',
				size: 5000
			} as File;
			const res = validateUploadedFile(mockFile);
			expect(res.valid).toBe(false);
			if (!res.valid) {
				expect(res.error).toContain('is not allowed');
			}
		});

		it('should reject files exceeding the 20MB limit', () => {
			const mockFile = {
				name: 'giant_video.mp4',
				type: 'image/png',
				size: 21 * 1024 * 1024 // 21MB
			} as File;
			const res = validateUploadedFile(mockFile);
			expect(res.valid).toBe(false);
			if (!res.valid) {
				expect(res.error).toContain('exceeds the maximum limit');
			}
		});

		it('should accept allowed MIME types (e.g. .docx) under 20MB limit', () => {
			const mockFile = {
				name: 'requirements.docx',
				type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				size: 2 * 1024 * 1024 // 2MB
			} as File;
			const res = validateUploadedFile(mockFile);
			expect(res.valid).toBe(true);
		});
	});

	describe('generateFileToken()', () => {
		it('should set details in Redis with exact TTL of 7200 seconds', async () => {
			const mockActor = { id: 'user-1', role: 'Member' as const, groupId: 'group-1' };
			const path = 'uploads/doc.pdf';
			const mime = 'application/pdf';
			const name = 'doc.pdf';

			const token = await generateFileToken(mockActor, path, mime, name);
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(redis.set).toHaveBeenCalledWith(
				`preview:token:${token}`,
				expect.stringContaining('"filePath":"uploads/doc.pdf"'),
				'EX',
				7200
			);
		});
	});

	describe('GET /api/files/[token] endpoint', () => {
		it('should return 401 when the user is not authenticated', async () => {
			const { GET } = await import('../../routes/api/files/[token]/+server');

			const mockEvent = {
				params: { token: 'some-token' },
				locals: {}
			} as any;

			const response = await GET(mockEvent);
			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
		});

		it('should return 403 when the token userId or groupId mismatch the authenticated user', async () => {
			const { GET } = await import('../../routes/api/files/[token]/+server');

			vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify({
				filePath: 'uploads/sensitive.pdf',
				mimeType: 'application/pdf',
				fileName: 'sensitive.pdf',
				userId: 'user-b', // mismatched user
				groupId: 'group-1'
			}));

			const mockEvent = {
				params: { token: 'some-token' },
				locals: {
					user: { id: 'user-a', role: 'Member' as const, groupId: 'group-1' }
				}
			} as any;

			const response = await GET(mockEvent);
			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe('Forbidden');
		});

		it('should allow access and fetch file details if the token is valid and matches the user session', async () => {
			const { GET } = await import('../../routes/api/files/[token]/+server');

			vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify({
				filePath: 'uploads/sensitive.pdf',
				mimeType: 'application/pdf',
				fileName: 'sensitive.pdf',
				userId: 'user-a',
				groupId: 'group-1'
			}));

			const mockEvent = {
				params: { token: 'some-token' },
				locals: {
					user: { id: 'user-a', role: 'Member' as const, groupId: 'group-1' }
				}
			} as any;

			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const text = await response.text();
			expect(text).toBe('mock pdf data');
		});

		it('should return 404 when the preview token is not found in Redis', async () => {
			const { GET } = await import('../../routes/api/files/[token]/+server');

			vi.mocked(redis.get).mockResolvedValueOnce(null);

			const mockEvent = {
				params: { token: 'invalid-token' },
				locals: {
					user: { id: 'user-a', role: 'Member' as const, groupId: 'group-1' }
				}
			} as any;

			const response = await GET(mockEvent);
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe('Preview link expired or invalid');
		});
	});
});
