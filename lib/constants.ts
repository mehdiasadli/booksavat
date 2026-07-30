export const APP_NAME = "BookSavat";

export const DEVELOPMENT_PORT = 3456;

export const PRODUCTION_URL = "https://booksavat.vercel.app";
export const DEVELOPMENT_URL = `http://localhost:${DEVELOPMENT_PORT}`;

export const CURRENT_URL = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: DEVELOPMENT_URL;
