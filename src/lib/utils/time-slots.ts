/**
 * Time slot utilities for appointment booking
 * Handles slot generation, validation, and alignment based on business hours
 */

import { DateTime } from "luxon";
import { BUSINESS_HOURS_CONFIG } from "@/lib/config/business-hours";

export interface TimeSlot {
  time: string; // HH:mm format (e.g., "10:00")
  datetime: string; // ISO 8601 string with timezone
}

/**
 * Generate all available time slots for a given date based on business hours
 *
 * @param date - DateTime object for the target date (should be in IST timezone)
 * @returns Array of TimeSlot objects for all slots on that date
 *
 * @example
 * const today = DateTime.now().setZone('Asia/Kolkata');
 * const slots = generateSlotsForDate(today);
 * // Returns: [{ time: "10:00", datetime: "2026-02-27T10:00:00+05:30" }, ...]
 */
export function generateSlotsForDate(date: DateTime): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { slotDuration, businessHours, timezone } = BUSINESS_HOURS_CONFIG;

  // Ensure we're working in the correct timezone
  const dateInTimezone = date.setZone(timezone);

  // Iterate through each business hours session (morning, evening, etc.)
  for (const session of businessHours) {
    // Parse start and end times for this session
    const [startHour, startMinute] = session.start.split(":").map(Number);
    const [endHour, endMinute] = session.end.split(":").map(Number);

    // Create DateTime objects for session start and end
    let currentSlot = dateInTimezone.set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });

    const sessionEnd = dateInTimezone.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });

    // Generate slots until we reach the session end time
    while (currentSlot < sessionEnd) {
      slots.push({
        time: currentSlot.toFormat("HH:mm"),
        datetime: currentSlot.toISO()!,
      });

      // Move to next slot
      currentSlot = currentSlot.plus({ minutes: slotDuration });
    }
  }

  return slots;
}

/**
 * Check if a given datetime falls within configured business hours
 *
 * @param datetime - DateTime object to validate (should be in IST timezone)
 * @returns true if the time is within business hours, false otherwise
 *
 * @example
 * const time = DateTime.fromISO("2026-02-27T10:30:00+05:30");
 * isSlotWithinBusinessHours(time); // true
 *
 * const lateNight = DateTime.fromISO("2026-02-27T23:00:00+05:30");
 * isSlotWithinBusinessHours(lateNight); // false
 */
export function isSlotWithinBusinessHours(datetime: DateTime): boolean {
  const { businessHours, timezone } = BUSINESS_HOURS_CONFIG;

  // Ensure we're working in the correct timezone
  const timeInTimezone = datetime.setZone(timezone);
  const timeString = timeInTimezone.toFormat("HH:mm");

  // Convert time string to minutes since midnight for comparison
  const [hour, minute] = timeString.split(":").map(Number);
  const minutesSinceMidnight = hour * 60 + minute;

  // Check if time falls within any business hours session
  for (const session of businessHours) {
    const [startHour, startMinute] = session.start.split(":").map(Number);
    const [endHour, endMinute] = session.end.split(":").map(Number);

    const sessionStartMinutes = startHour * 60 + startMinute;
    const sessionEndMinutes = endHour * 60 + endMinute;

    // Time is within this session if it's >= start and < end
    if (
      minutesSinceMidnight >= sessionStartMinutes &&
      minutesSinceMidnight < sessionEndMinutes
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Round a datetime to the nearest appointment slot boundary
 *
 * @param datetime - DateTime object to round (should be in IST timezone)
 * @returns DateTime object rounded to nearest slot boundary
 *
 * @example
 * const time = DateTime.fromISO("2026-02-27T10:17:00+05:30");
 * const rounded = roundToNearestSlot(time);
 * // Returns: DateTime for "2026-02-27T10:30:00+05:30" (rounds to nearest 30 min)
 */
export function roundToNearestSlot(datetime: DateTime): DateTime {
  const { slotDuration, timezone } = BUSINESS_HOURS_CONFIG;

  // Ensure we're working in the correct timezone
  const timeInTimezone = datetime.setZone(timezone);

  // Calculate minutes since midnight
  const minutesSinceMidnight = timeInTimezone.hour * 60 + timeInTimezone.minute;

  // Round to nearest slot boundary
  const roundedMinutes =
    Math.round(minutesSinceMidnight / slotDuration) * slotDuration;

  // Convert back to hours and minutes
  const hour = Math.floor(roundedMinutes / 60);
  const minute = roundedMinutes % 60;

  // Return new DateTime with rounded time
  return timeInTimezone.set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
}

/**
 * Check if a datetime is aligned with slot boundaries
 *
 * @param datetime - DateTime object to check
 * @returns true if aligned with slot boundary, false otherwise
 *
 * @example
 * const aligned = DateTime.fromISO("2026-02-27T10:30:00+05:30");
 * isSlotAligned(aligned); // true
 *
 * const notAligned = DateTime.fromISO("2026-02-27T10:17:00+05:30");
 * isSlotAligned(notAligned); // false
 */
export function isSlotAligned(datetime: DateTime): boolean {
  const rounded = roundToNearestSlot(datetime);
  return datetime.equals(rounded);
}
