import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSendMail } = vi.hoisted(() => ({ mockSendMail: vi.fn() }));
const { mockSesSend } = vi.hoisted(() => ({ mockSesSend: vi.fn() }));
const { mockResendSend } = vi.hoisted(() => ({ mockResendSend: vi.fn() }));

vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn().mockImplementation(() => ({
			sendMail: mockSendMail
		}))
	}
}));

vi.mock('@aws-sdk/client-ses', () => ({
	SESClient: class { send = mockSesSend; },
	SendEmailCommand: class { constructor(args: any) { Object.assign(this, args); } }
}));

vi.mock('resend', () => ({
	Resend: class { emails = { send: mockResendSend }; }
}));

describe('Email Service', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});
	
	afterEach(() => {
		vi.doUnmock('$env/dynamic/private');
	});

	describe('Provider Selection', () => {
		it('should send email using SMTP when configured', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: { SMTP_HOST: 'test', SMTP_USER: 'user', SMTP_PASS: 'pass' }
			}));
			const { sendEmail } = await import('./email');
			
			await sendEmail({ to: 'test@example.com', subject: 'Test SMTP', html: '<p>Hi</p>' });
			
			expect(mockSendMail).toHaveBeenCalled();
			expect(mockSesSend).not.toHaveBeenCalled();
			expect(mockResendSend).not.toHaveBeenCalled();
		});

		it('should send email using AWS SES when configured and SMTP is absent', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: { AWS_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'key', AWS_SECRET_ACCESS_KEY: 'secret' }
			}));
			const { sendEmail } = await import('./email');
			
			await sendEmail({ to: 'ses@example.com', subject: 'Test SES', html: '<p>Hi</p>' });
			
			expect(mockSesSend).toHaveBeenCalled();
			expect(mockSendMail).not.toHaveBeenCalled();
			expect(mockResendSend).not.toHaveBeenCalled();
		});

		it('should send email using Resend when configured and others are absent', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: { RESEND_API_KEY: 'resend_key' }
			}));
			const { sendEmail } = await import('./email');
			
			await sendEmail({ to: 'resend@example.com', subject: 'Test Resend', html: '<p>Hi</p>' });
			
			expect(mockResendSend).toHaveBeenCalled();
			expect(mockSendMail).not.toHaveBeenCalled();
			expect(mockSesSend).not.toHaveBeenCalled();
		});

		it('should suppress email when no provider is configured', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: {}
			}));
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { sendEmail } = await import('./email');
			
			await sendEmail({ to: 'none@example.com', subject: 'Test None', html: '<p>Hi</p>' });
			
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No email provider configured'), expect.anything());
			expect(mockSendMail).not.toHaveBeenCalled();
			expect(mockSesSend).not.toHaveBeenCalled();
			expect(mockResendSend).not.toHaveBeenCalled();
			
			consoleWarnSpy.mockRestore();
		});
	});

	describe('Invite Formats', () => {
		it('should format and send the project invite', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: { SMTP_HOST: 'test', SMTP_USER: 'user', SMTP_PASS: 'pass' }
			}));
			const { sendProjectInviteEmail } = await import('./email');
			
			await sendProjectInviteEmail('test@example.com', 'My Project', 'Alice', true);
			expect(mockSendMail).toHaveBeenCalled();
			expect(mockSendMail.mock.calls[0][0].subject).toContain("You've been invited to join My Project");
		});

		it('should format and send the group invite', async () => {
			vi.doMock('$env/dynamic/private', () => ({
				env: { SMTP_HOST: 'test', SMTP_USER: 'user', SMTP_PASS: 'pass' }
			}));
			const { sendGroupInviteEmail } = await import('./email');
			
			await sendGroupInviteEmail('test@example.com', 'My Group', 'Bob');
			expect(mockSendMail).toHaveBeenCalled();
			expect(mockSendMail.mock.calls[0][0].subject).toContain("You've been invited to join My Group");
		});
	});
});
