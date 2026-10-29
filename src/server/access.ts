import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

const keySets = new Map<string, JWTVerifyGetKey>();

function keysFor(teamDomain: string): JWTVerifyGetKey {
	let keys = keySets.get(teamDomain);
	if (!keys) {
		keys = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
		keySets.set(teamDomain, keys);
	}
	return keys;
}

interface AccessConfig {
	/** `https://<team-name>.cloudflareaccess.com` */
	teamDomain: string;
	/** The Access application's AUD tag */
	audience: string;
}

export async function verifyAccessToken(
	token: string,
	{ teamDomain, audience }: AccessConfig,
	keys?: JWTVerifyGetKey
): Promise<boolean> {
	try {
		const { payload } = await jwtVerify(token, keys ?? keysFor(teamDomain), { issuer: teamDomain, audience });
		console.info('EmoteWall Access sign-in:', typeof payload.email === 'string' ? payload.email : 'unknown');
		return true;
	} catch (error) {
		console.warn('EmoteWall Access token rejected:', error instanceof Error ? error.message : error);
		return false;
	}
}
