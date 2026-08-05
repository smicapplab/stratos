import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { htmlEscape } from '$lib/utils';
import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { globalEventEmitter } from './events';

const useSmtp = !!(env.SMTP_HOST && env.SMTP_USER);
const useSes = !useSmtp && !!(env.AWS_REGION && env.AWS_ACCESS_KEY_ID);
const useResend = !useSmtp && !useSes && !!env.RESEND_API_KEY;

const smtpTransporter = useSmtp ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || '587'),
    secure: env.SMTP_PORT === '465',
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
    }
}) : null;

const sesClient = useSes ? new SESClient({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY as string
    }
}) : null;

const resend = useResend ? new Resend(env.RESEND_API_KEY) : null;

const defaultSender = env.SMTP_FROM || env.EMAIL_FROM || env.SES_FROM || env.RESEND_FROM || 'Stratos Admin <no-reply@stratos.internal>';

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
    try {
        if (useSmtp && smtpTransporter) {
            await smtpTransporter.sendMail({
                from: defaultSender,
                to,
                subject,
                html
            });
            console.log(`✅ Email sent via SMTP to ${to}`);
        } else if (useSes && sesClient) {
            const command = new SendEmailCommand({
                Source: defaultSender,
                Destination: { ToAddresses: [to] },
                Message: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: html } }
                }
            });
            await sesClient.send(command);
            console.log(`✅ Email sent via SES to ${to}`);
        } else if (useResend && resend) {
            await resend.emails.send({
                from: defaultSender,
                to,
                subject,
                html
            });
            console.log(`✅ Email sent via Resend to ${to}`);
        } else {
            console.warn('⚠️ No email provider configured. Email suppressed.', { subject, to });
        }
    } catch (error) {
        console.error('Email dispatch failed:', error);
    }
}

const appUrl = env.APP_URL || 'http://localhost:5173';

export async function sendProjectInviteEmail(toEmail: string, projectName: string, inviterName: string, isNewUser: boolean, tempPassword?: string) {
	const safeName = htmlEscape(inviterName);
	const safeProject = htmlEscape(projectName);

	const subject = isNewUser 
		? `You've been invited to join ${projectName} on Stratos!`
		: `${inviterName} added you to ${projectName} on Stratos`;

	const html = isNewUser && tempPassword ? `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px;">
			<div style="margin-bottom: 24px; text-align: center;">
				<span style="font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">STRATOS</span>
			</div>
			
			<h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Welcome to Stratos!</h2>
			
			<p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
				<strong>${safeName}</strong> has invited you to collaborate on the project <strong>${safeProject}</strong> on Stratos.
			</p>

			<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
				<h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Your Account Credentials</h3>
				<table style="width: 100%; font-size: 14px; border-collapse: collapse;">
					<tr>
						<td style="padding: 6px 0; color: #64748b; width: 140px;">Username / Email:</td>
						<td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${toEmail}</td>
					</tr>
					<tr>
						<td style="padding: 6px 0; color: #64748b;">Temporary Password:</td>
						<td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: 700; color: #2563eb; letter-spacing: 0.5px;">${tempPassword}</td>
					</tr>
				</table>
			</div>

			<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin-bottom: 28px; border-radius: 0 6px 6px 0;">
				<p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
					<strong>Security Action Required:</strong> For your security, you will be required to change your temporary password upon your first login.
				</p>
			</div>

			<div style="text-align: center; margin-bottom: 32px;">
				<a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
					Log In to Stratos
				</a>
			</div>

			<hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
			<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
				Stratos Platform &bull; Internal Company Workspace
			</p>
		</div>
	` : `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px;">
			<div style="margin-bottom: 24px; text-align: center;">
				<span style="font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">STRATOS</span>
			</div>
			
			<h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">You've been added to ${safeProject}</h2>
			
			<p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
				Hello, <strong>${safeName}</strong> has added you to collaborate on the project <strong>${safeProject}</strong>.
			</p>

			<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; margin-bottom: 28px; border-radius: 0 6px 6px 0;">
				<p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
					You can log in directly using your existing Stratos account credentials.
				</p>
			</div>

			<div style="text-align: center; margin-bottom: 32px;">
				<a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
					Open Stratos
				</a>
			</div>

			<hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
			<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
				Stratos Platform &bull; Internal Company Workspace
			</p>
		</div>
	`;

	await sendEmail({ to: toEmail, subject, html });
}

export async function sendGroupInviteEmail(toEmail: string, groupName: string, inviterName: string, isNewUser: boolean = true, tempPassword?: string) {
	const safeName = htmlEscape(inviterName);
	const safeGroup = htmlEscape(groupName);

	const subject = isNewUser
		? `You've been invited to join ${groupName} on Stratos!`
		: `${inviterName} added you to ${groupName} on Stratos`;

	const html = isNewUser && tempPassword ? `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px;">
			<div style="margin-bottom: 24px; text-align: center;">
				<span style="font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">STRATOS</span>
			</div>
			
			<h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Welcome to Stratos!</h2>
			
			<p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
				<strong>${safeName}</strong> has invited you to join the workspace <strong>${safeGroup}</strong> on Stratos.
			</p>

			<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
				<h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Your Account Credentials</h3>
				<table style="width: 100%; font-size: 14px; border-collapse: collapse;">
					<tr>
						<td style="padding: 6px 0; color: #64748b; width: 140px;">Username / Email:</td>
						<td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${toEmail}</td>
					</tr>
					<tr>
						<td style="padding: 6px 0; color: #64748b;">Temporary Password:</td>
						<td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: 700; color: #2563eb; letter-spacing: 0.5px;">${tempPassword}</td>
					</tr>
				</table>
			</div>

			<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin-bottom: 28px; border-radius: 0 6px 6px 0;">
				<p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
					<strong>Security Action Required:</strong> For your security, you will be required to change your temporary password upon your first login.
				</p>
			</div>

			<div style="text-align: center; margin-bottom: 32px;">
				<a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
					Log In to Stratos
				</a>
			</div>

			<hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
			<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
				Stratos Platform &bull; Internal Company Workspace
			</p>
		</div>
	` : `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px;">
			<div style="margin-bottom: 24px; text-align: center;">
				<span style="font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">STRATOS</span>
			</div>
			
			<h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">You've been added to ${safeGroup}</h2>
			
			<p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
				Hello, <strong>${safeName}</strong> has added you to join the workspace <strong>${safeGroup}</strong>.
			</p>

			<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; margin-bottom: 28px; border-radius: 0 6px 6px 0;">
				<p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
					You can log in directly using your existing Stratos account credentials.
				</p>
			</div>

			<div style="text-align: center; margin-bottom: 32px;">
				<a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
					Open Stratos
				</a>
			</div>

			<hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
			<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
				Stratos Platform &bull; Internal Company Workspace
			</p>
		</div>
	`;

	await sendEmail({ to: toEmail, subject, html });
}

// -----------------------------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------------------------

globalEventEmitter.on('comment:created', async (data: { followers: { user: { id: string, email: string, name: string } }[], authorName: string, taskTitle: string, content: string, taskId: string }) => {
	const { followers, authorName, taskTitle, content, taskId } = data;
	
	// Only send emails to followers who were explicitly @mentioned in the rich text
	const mentionedFollowers = followers.filter(f => content.includes(`data-id="${f.user.id}"`));
	
	for (const f of mentionedFollowers) {
		const safeName = htmlEscape(authorName);
		const safeTitle = htmlEscape(taskTitle);
		const subject = `${safeName} mentioned you in ${safeTitle}`;
		
		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2>You were mentioned!</h2>
				<p><strong>${safeName}</strong> mentioned you in a comment on the task <strong>${safeTitle}</strong>.</p>
				
				<blockquote style="margin: 20px 0; padding-left: 15px; border-left: 4px solid #e5e7eb; color: #374151;">
					${content}
				</blockquote>
				
				<div style="margin-top: 30px;">
					<a href="${appUrl}/tasks/${taskId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
						View Task
					</a>
				</div>
			</div>
		`;
		
		sendEmail({ to: f.user.email, subject, html }).catch(err => {
			console.error('Failed to send mention email to', f.user.email, err);
		});
	}
});
