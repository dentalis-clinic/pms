/**
 * Business hours configuration for the clinic
 * Defines operating hours and slot duration for appointment booking
 */

export interface BusinessHoursSession {
  start: string; // HH:mm format (e.g., "10:00")
  end: string; // HH:mm format (e.g., "14:00")
}

export interface BusinessHoursConfig {
  slotDuration: number; // Duration of each appointment slot in minutes
  businessHours: BusinessHoursSession[]; // Array of time sessions (morning, evening, etc.)
  timezone: string; // IANA timezone (e.g., "Asia/Kolkata")
}

/**
 * Default clinic configuration
 * - Morning session: 10:00 AM - 2:00 PM (8 slots of 30 min each)
 * - Evening session: 4:00 PM - 10:00 PM (12 slots of 30 min each)
 * - Total: 20 slots per day
 */
export const BUSINESS_HOURS_CONFIG: BusinessHoursConfig = {
  slotDuration: 30, // 30-minute slots
  businessHours: [
    { start: "10:00", end: "14:00" }, // Morning session
    { start: "16:00", end: "22:00" }, // Evening session
  ],
  timezone: "Asia/Kolkata",
};
