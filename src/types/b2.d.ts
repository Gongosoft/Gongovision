export interface B2Object {
	name: string;
	url: string;
	size: number;
}

export interface VOD extends B2Object {
	thumbnail?: string | null;
}

export interface B2ListResponse {
	'?xml': string;
	'ListBucketResult': ListBucketResult;
}

export interface ListBucketResult {
	Contents: Content[];
	IsTruncated: boolean;
	/** defaults to 1000 */
	MaxKeys: number;
	/** bucket name */
	Name: string;
	Prefix: string;
	/** amount of items in ListBucketResult.Contents */
	KeyCount: number;
	/** for pagination */
	NextContinuationToken?: string;
}

export interface Content {
	ETag: string;
	/** eg. vods/[2025-02-20] twitch sucks !archive.mp4 */
	Key: string;
	/** eg. 2026-07-31T10:06:46.662Z */
	LastModified: Date;
	/** bytes, eg. 15291969734 */
	Size: number;
	/** STANDARD */
	StorageClass: string;
}
