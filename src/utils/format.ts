/** formats a byte count to be human readable */
export function formatBytes(bytes: number): string {
	if (!bytes) {
		return '';
	}
	return bytes / 1e9 >= 0.1 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
}

/** parses `1h2m3s`, `2m3s`, `45s` and plain seconds into seconds */
export function parseTimestamp(value: string | undefined): number {
	if (!value) {
		return 0;
	}
	if (/^\d+(?:\.\d+)?$/.test(value)) {
		return Number(value);
	}
	const match = /^(?:(?<h>\d+)h)?(?:(?<m>\d+)m)?(?:(?<s>\d+)s)?$/.exec(value);
	if (!match?.groups) {
		return 0;
	}
	const { h = 0, m = 0, s = 0 } = match.groups;
	return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** left-pads a unit so `1:02:03` reads correctly */
function pad(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * `stopwatch` returns `1:02:03` or `2:03`
 *
 * `labeled` returns `1h2m3s`
 */
export function formatTimestamp(seconds: number, style: 'stopwatch' | 'labeled' = 'stopwatch'): string {
	const whole = Math.floor(seconds);
	const h = Math.floor(whole / 3600);
	const m = Math.floor((whole % 3600) / 60);
	const s = whole % 60;
	if (style === 'labeled') {
		return `${h ? `${h}h` : ''}${h || m ? `${m}m` : ''}${s}s`;
	}
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
