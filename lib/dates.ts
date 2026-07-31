import { format, formatDistance, formatRelative } from "date-fns";

/** e.g. "March 2026" */
export function formatMonthYear(date: Date): string {
	return format(date, "MMMM yyyy");
}

/** e.g. "about 2 months ago" */
export function formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
	return formatDistance(date, baseDate, { addSuffix: true });
}

/** e.g. "last Friday at 2:30 PM" near the reference date */
export function formatRelativeDate(date: Date, baseDate: Date = new Date()): string {
	return formatRelative(date, baseDate);
}

/** e.g. "Jan 15, 2026" */
export function formatShortDate(date: Date): string {
	return format(date, "MMM d, yyyy");
}

/** e.g. "January 15, 2026 at 2:30 PM" */
export function formatDateTime(date: Date): string {
	return format(date, "MMMM d, yyyy 'at' h:mm a");
}

/** e.g. "2026-01-15" — useful for metadata and APIs */
export function formatIsoDate(date: Date): string {
	return format(date, "yyyy-MM-dd");
}
