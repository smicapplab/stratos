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

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
    try {
        if (useSmtp && smtpTransporter) {
            await smtpTransporter.sendMail({
                from: env.SMTP_FROM || env.SMTP_USER || 'Stratos <noreply@stratos.local>',
                to,
                subject,
                html
            });
            console.log(`✅ Email sent via SMTP to ${to}`);
        } else if (useSes && sesClient) {
            const command = new SendEmailCommand({
                Source: env.SES_FROM || 'Stratos <noreply@stratos.local>',
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
                from: env.EMAIL_FROM || env.RESEND_FROM || 'Stratos <onboarding@resend.dev>',
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

export async function sendProjectInviteEmail(toEmail: string, projectName: string, inviterName: string, isNewUser: boolean) {
	const safeName = htmlEscape(inviterName);
	const safeProject = htmlEscape(projectName);

	const subject = isNewUser 
		? `You've been invited to join ${projectName} on Stratos!`
		: `${inviterName} added you to ${projectName}`;

	const html = `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2>Hello,</h2>
			<p><strong>${safeName}</strong> has invited you to collaborate on the project <strong>${safeProject}</strong> in Stratos.</p>
			
			${isNewUser ? `
				<p>Since you are new to Stratos, you will need to create a password to access your account. Please log in using this email address.</p>
			` : `
				<p>You can view the project and start collaborating immediately.</p>
			`}
			
			<div style="margin-top: 30px;">
				<a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
					Open Stratos
				</a>
			</div>
		</div>
	`;

	await sendEmail({ to: toEmail, subject, html });
}

export async function sendGroupInviteEmail(toEmail: string, groupName: string, inviterName: string) {
	const safeName = htmlEscape(inviterName);
	const safeGroup = htmlEscape(groupName);

	const subject = `You've been invited to join ${groupName} on Stratos!`;

	const html = `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2>Hello,</h2>
			<p><strong>${safeName}</strong> has invited you to join the workspace <strong>${safeGroup}</strong> in Stratos.</p>
			
			<p>Since you are new to Stratos, you will need to create a password to access your account. Please log in using this email address.</p>
			
			<div style="margin-top: 30px;">
				<a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
					Open Stratos
				</a>
			</div>
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
