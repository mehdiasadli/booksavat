import "server-only";

import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { assertValue } from "@/lib/assert-value";
import { isPublicKey } from "@/lib/storage/keys";

type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	endpoint: string;
	publicBaseUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function readConfig(): R2Config {
	if (cachedConfig) {
		return cachedConfig;
	}

	const accountId = process.env.R2_ACCOUNT_ID;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
	const bucket = process.env.R2_BUCKET;
	const endpointRaw = process.env.R2_ENDPOINT;
	const publicBaseUrlRaw = process.env.R2_PUBLIC_BASE_URL;

	assertValue(accountId, "R2_ACCOUNT_ID is not set");
	assertValue(accessKeyId, "R2_ACCESS_KEY_ID is not set");
	assertValue(secretAccessKey, "R2_SECRET_ACCESS_KEY is not set");
	assertValue(bucket, "R2_BUCKET is not set");
	assertValue(endpointRaw, "R2_ENDPOINT is not set");
	assertValue(publicBaseUrlRaw, "R2_PUBLIC_BASE_URL is not set");

	cachedConfig = {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucket,
		endpoint: endpointRaw.replace(/\/+$/, ""),
		publicBaseUrl: publicBaseUrlRaw.replace(/\/+$/, ""),
	};

	return cachedConfig;
}

function getClient(): S3Client {
	if (cachedClient) {
		return cachedClient;
	}

	const config = readConfig();
	cachedClient = new S3Client({
		region: "auto",
		endpoint: config.endpoint,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});

	return cachedClient;
}

export function isR2DevPingEnabled(): boolean {
	return process.env.R2_DEV_PING_ENABLED === "true";
}

export function getPublicBaseUrl(): string {
	return readConfig().publicBaseUrl;
}

export function publicUrlForKey(key: string): string {
	if (!isPublicKey(key)) {
		throw new Error("Only public/ keys have a stable public URL");
	}

	const { publicBaseUrl } = readConfig();
	return `${publicBaseUrl}/${key}`;
}

export async function presignPutObject(options: {
	key: string;
	contentType: string;
	contentLength: number;
	expiresIn?: number;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string | null }> {
	const config = readConfig();
	const client = getClient();
	const expiresIn = options.expiresIn ?? 60 * 5;

	const command = new PutObjectCommand({
		Bucket: config.bucket,
		Key: options.key,
		ContentType: options.contentType,
		ContentLength: options.contentLength,
	});

	const uploadUrl = await getSignedUrl(client, command, { expiresIn });

	return {
		uploadUrl,
		key: options.key,
		publicUrl: isPublicKey(options.key) ? publicUrlForKey(options.key) : null,
	};
}

export async function presignGetObject(options: {
	key: string;
	expiresIn?: number;
	fileName?: string;
}): Promise<{ downloadUrl: string; key: string }> {
	const config = readConfig();
	const client = getClient();
	const expiresIn = options.expiresIn ?? 60 * 10;

	const command = new GetObjectCommand({
		Bucket: config.bucket,
		Key: options.key,
		ResponseContentDisposition: options.fileName
			? `attachment; filename="${options.fileName.replace(/"/g, "")}"`
			: undefined,
	});

	const downloadUrl = await getSignedUrl(client, command, { expiresIn });
	return { downloadUrl, key: options.key };
}

export async function deleteObject(key: string): Promise<void> {
	const config = readConfig();
	const client = getClient();

	await client.send(
		new DeleteObjectCommand({
			Bucket: config.bucket,
			Key: key,
		}),
	);
}

export async function headObject(key: string): Promise<{
	contentType: string | null;
	contentLength: number | null;
}> {
	const config = readConfig();
	const client = getClient();

	const result = await client.send(
		new HeadObjectCommand({
			Bucket: config.bucket,
			Key: key,
		}),
	);

	return {
		contentType: result.ContentType ?? null,
		contentLength: result.ContentLength ?? null,
	};
}

/** Test helper — clears cached client/config between unit tests. */
export function resetR2ClientForTests(): void {
	cachedClient = null;
	cachedConfig = null;
}
