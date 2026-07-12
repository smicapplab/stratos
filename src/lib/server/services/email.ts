import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { htmlEscape } from '$lib/utils';

const resend = new Resend(env.RESEND_API_KEY || 'dummy_key');

const appUrl = env.APP_URL || 'http://localhost:5173';

export async function sendProjectInviteEmail(toEmail: string, projectName: string, inviterName: string, isNewUser: boolean) {
	if (!env.RESEND_API_KEY) {
		console.warn('⚠️ RESEND_API_KEY is not set. Email invite was not sent.');
		return;
	}

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

	try {
		await resend.emails.send({
			from: 'Stratos <onboarding@resend.dev>',
			to: toEmail,
			subject,
			html
		});
		console.log(`✅ Invite email sent to ${toEmail}`);
	} catch (error) {
		console.error('Failed to send invite email:', error);
	}
}

export async function sendGroupInviteEmail(toEmail: string, groupName: string, inviterName: string) {
	if (!env.RESEND_API_KEY) {
		console.warn('⚠️ RESEND_API_KEY is not set. Email invite was not sent.');
		return;
	}

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

	try {
		await resend.emails.send({
			from: 'Stratos <onboarding@resend.dev>',
			to: toEmail,
			subject,
			html
		});
		console.log(`✅ Group Invite email sent to ${toEmail}`);
	} catch (error) {
		console.error('Failed to send group invite email:', error);
	}
}
