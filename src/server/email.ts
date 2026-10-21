import picBust from '@/assets/images/emotes/bttv/picBust.webp';
import { env } from 'cloudflare:workers';

type EmailOpts = Omit<EmailMessageBuilder, 'from' | 'to'> & { to: string };

export async function sendEmail(opts: EmailOpts): Promise<boolean> {
	console.log('sendEmail:', { from: env.FROM_EMAIL, to: opts.to, subject: opts.subject });

	try {
		const result = await env.EMAIL.send({
			from: env.FROM_EMAIL,
			...opts
		});
		console.log('sendEmail ok:', result.messageId);
		return true;
	} catch (error) {
		console.error('sendEmail failed:', (error as Error).message ?? error);
		return false;
	}
}

export function confirmationEmail(email: string, token: string): EmailOpts {
	const confirmURL = `${BASE_URL}/notification/email/confirm?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

	return {
		to: email,
		subject: 'become faithful get notified',
		html: `
			<p>Click the <img src="${BASE_URL}${picBust}" alt="picBust" title="picBust" style="width:1.42em;height:1.42em;vertical-align:middle;" /> to get notifications when Gongo is summoned.</p>
			<p><a href="${confirmURL}"><img src="${BASE_URL}${picBust}" alt="Confirm" title="Confirm" /></a></p>
		`.trim()
	};
}

export function liveNotificationEmail(email: string, token: string): EmailOpts {
	const unsubscribeURL = `${BASE_URL}/notification/email/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

	return {
		to: email,
		subject: 'the pull of the gongo compels you',
		headers: {
			'List-Unsubscribe': `<${unsubscribeURL}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		},
		html: `
			<p>GreatSphynx just started streaming!</p>
			<br />
			<p><a href="${BASE_URL}/stream">WATCH NOW</a></p>
			<br />
			<p><small><a href="${unsubscribeURL}">unsubscribe</a></small></p>
		`.trim()
	};
}
