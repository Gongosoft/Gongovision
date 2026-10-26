/** a notification message awaiting its one retry */
export interface DiscordRetryPayload {
	webhookId: number;
	/** the original detection time */
	occurredAt: number;
	/** wait in seconds provided by Discord's 429 response */
	delay: number;
}
