import { DateTime } from "luxon";

const IST_ZONE = "Asia/Kolkata";

/** Current IST date as YYYYMMDD string (for patient ID generation). */
export function getCurrentISTDate(): string {
  return DateTime.now().setZone(IST_ZONE).toFormat("yyyyMMdd");
}

/** Convert a JS Date (UTC) to a Luxon DateTime in IST. */
export function toIST(date: Date): DateTime {
  return DateTime.fromJSDate(date).setZone(IST_ZONE);
}

/** Format a JS Date as a human-readable IST string: "26 Jan 2026, 02:30 PM" */
export function formatISTDateTime(date: Date): string {
  return toIST(date).toFormat("dd MMM yyyy, hh:mm a");
}

/** Format a JS Date as IST date only: "26 Jan 2026" */
export function formatISTDate(date: Date): string {
  return toIST(date).toFormat("dd MMM yyyy");
}

/** Get current IST DateTime (for server-side "now" comparisons). */
export function nowIST(): DateTime {
  return DateTime.now().setZone(IST_ZONE);
}
