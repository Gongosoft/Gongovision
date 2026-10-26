import type { OwncastStatus } from '@/types/owncast.d.ts';
import type { AngelThumpStreamResponse } from '@/types/angelthump.d.ts';

export interface StreamInfoResponse {
	owncast: OwncastStatus | null;
	angelthump: AngelThumpStreamResponse | null;
}

export type StreamSource = 'owncast' | 'angelthump';

export type StreamStatus = 'online' | 'offline';

export type StreamEventSource = 'ws' | 'poll';

/** one row of the `stream_events` [D1 table](../server/schema.sql) */
export interface StreamEvent {
	id: number;
	status: StreamStatus;
	source: StreamEventSource;
	occurredAt: number;
}
