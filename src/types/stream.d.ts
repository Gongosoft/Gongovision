import type { OwncastStatus } from '@/types/owncast.d.ts';
import type { AngelThumpStreamResponse } from '@/types/angelthump.d.ts';

export interface StreamInfoResponse {
	owncast: OwncastStatus | null;
	angelthump: AngelThumpStreamResponse | null;
}
