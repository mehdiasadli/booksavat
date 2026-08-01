export const APP_NAME = "BookSavat";

export const DEVELOPMENT_PORT = 3456;

export const PRODUCTION_DOMAIN = "booksavat.com";

export const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;
export const DEVELOPMENT_URL = `http://localhost:${DEVELOPMENT_PORT}`;

export const CURRENT_URL = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: DEVELOPMENT_URL;

export const TRUSTED_ORIGINS = [
	PRODUCTION_URL,
	DEVELOPMENT_URL,
	`https://www.${PRODUCTION_DOMAIN}`,
];
