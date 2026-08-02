import nodemailer from 'nodemailer';
import picBust from '@/assets/images/emotes/bttv/picBust.webp';
import { env } from 'cloudflare:workers';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (transporter) {
		return transporter;
	}

	transporter = nodemailer.createTransport({
		host: env.SMTP_SERVER,
		port: env.SMTP_PORT,
		secure: false,
		requireTLS: true,
		auth: {
			user: env.SMTP_USERNAME,
			pass: env.SMTP_PASSWORD
		}
	});

	return transporter;
}

export interface EmailOpts {
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail(opts: EmailOpts): Promise<boolean> {
	console.log('sendEmail:', { from: env.SMTP_USERNAME, to: opts.to, subject: opts.subject });

	try {
		const transport = getTransporter();
		await transport.sendMail({
			from: env.SMTP_USERNAME,
			to: opts.to,
			subject: opts.subject,
			html: opts.html
		});
		console.log('sendEmail ok');
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
		html: `
			<p>GreatSphynx just started streaming!</p>
			<br />
			<p><a href="${BASE_URL}/stream">WATCH NOW</a></p>
			<br />
			<p><small><a href="${unsubscribeURL}">unsubscribe</a></small></p>
		`.trim()
	};
}
