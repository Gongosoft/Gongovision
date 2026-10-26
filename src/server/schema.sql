CREATE TABLE IF NOT EXISTS stream_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	status TEXT NOT NULL CHECK (status IN ('online', 'offline')),
	source TEXT NOT NULL CHECK (source IN ('ws', 'poll')),
	occurred_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
