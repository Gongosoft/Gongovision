CREATE TABLE IF NOT EXISTS discord_webhooks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	url TEXT NOT NULL UNIQUE,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
	last_sent_at INTEGER,
	last_error TEXT
);
CREATE TABLE IF NOT EXISTS stream_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	status TEXT NOT NULL CHECK (status IN ('online', 'offline')),
	source TEXT NOT NULL CHECK (source IN ('ws', 'poll')),
	occurred_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
