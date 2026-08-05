export const READING_LOG_STATUSES = ["reading", "completed", "dnf"] as const;

export type ReadingLogStatus = (typeof READING_LOG_STATUSES)[number];

/** System shelf keys that create/update reading logs (not wishlist). */
export const LOGGABLE_SYSTEM_KEYS = ["reading", "completed", "dnf"] as const;

export type LoggableSystemKey = (typeof LOGGABLE_SYSTEM_KEYS)[number];

export function isLoggableSystemKey(key: string | null | undefined): key is LoggableSystemKey {
	return key != null && (LOGGABLE_SYSTEM_KEYS as readonly string[]).includes(key);
}

export function systemKeyToLogStatus(key: LoggableSystemKey): ReadingLogStatus {
	return key;
}
