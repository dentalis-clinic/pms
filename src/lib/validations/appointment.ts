import { z } from "zod/v4";
import { DateTime } from "luxon";
import {
  isSlotWithinBusinessHours,
  isSlotAligned,
} from "@/lib/utils/time-slots";
import { BUSINESS_HOURS_CONFIG } from "@/lib/config/business-hours";

// --- New Enums (matching Prisma schema) ---

export const bookingChannelEnum = z.enum([
  "ONLINE",
  "PHONE",
  "WALK_IN",
  "SMS",
  "WHATSAPP",
]);

export const visitTypeEnum = z.enum(["NEW_CONSULTATION", "FOLLOW_UP"]);

export const priorityEnum = z.enum(["ROUTINE", "URGENT", "EMERGENCY"]);

export const appointmentStatusEnum = z.enum([
  "PENDING",
  "OVERDUE",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

// --- Phone check (public progressive form) ---

export const phoneCheckSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
});

// --- Public booking base fields (shared by public + walk-in) ---

const publicBookingBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine(
      (date) => date > new Date(),
      "Preferred time must be in the future"
    )
    .refine((date) => {
      const maxDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      return date <= maxDate;
    }, "Preferred time must be within the next 3 days")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot"),
  existingPatientId: z.string().min(1, "Invalid patient ID").optional(),
});

// --- Public booking (patient self-service) ---
// Returning patients submit existingPatientId (no name needed).
// New patients must provide a name.

export const publicBookingSchema = publicBookingBaseSchema.refine(
  (data) => data.existingPatientId || data.name,
  { message: "Name is required for new patients", path: ["name"] }
);

// --- Walk-in registration (admin, full form) ---

export const walkInSchema = publicBookingBaseSchema.extend({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(0, "Age must be 0 or greater")
    .max(120, "Age must be 120 or less")
    .optional(),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  submittedByAdmin: z.literal(true).optional(),
  // NEW: Separate booking channel and visit type
  isPhoneBooking: z.boolean().optional(), // If true, bookingChannel = PHONE; else WALK_IN
  visitType: visitTypeEnum.optional(),    // NEW_CONSULTATION or FOLLOW_UP
  priority: priorityEnum.optional(),      // ROUTINE, URGENT, or EMERGENCY
});

// --- Follow-up appointment (admin, existing patient) ---

export const followUpSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine(
      (date) => date > new Date(),
      "Preferred time must be in the future"
    )
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot"),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  // NEW: Booking method and priority
  isPhoneBooking: z.boolean().optional(), // If true, bookingChannel = PHONE; else WALK_IN
  priority: priorityEnum.optional(),      // ROUTINE, URGENT, or EMERGENCY
});

// --- Patch appointment (admin updates) ---

export const patchAppointmentSchema = z.object({
  status: appointmentStatusEnum.optional(), // PENDING, OVERDUE, CONFIRMED, COMPLETED, CANCELLED
  bookingChannel: bookingChannelEnum.optional(), // ONLINE, PHONE, WALK_IN, SMS, WHATSAPP
  visitType: visitTypeEnum.optional(), // NEW_CONSULTATION, FOLLOW_UP
  priority: priorityEnum.optional(), // ROUTINE, URGENT, EMERGENCY
  doctorId: z.string().uuid("Invalid doctor ID").optional().nullable(),
  totalAmount: z.number().min(0, "Total amount must be 0 or greater").optional().nullable(),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or less")
    .optional()
    .or(z.literal("")),
  // Admin edits are not subject to business-hours or slot-alignment rules —
  // those constraints only apply to public/walk-in bookings.
  preferredDateTime: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .optional(),
});

// --- Unified confirm/new appointment (admin, slide-over form) ---

export const confirmAppointmentSchema = z.object({
  // Patient fields
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(0, "Age must be 0 or greater")
    .max(120, "Age must be 120 or less")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  // Appointment fields — admin is unrestricted (no business-hours or slot-alignment checks)
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format"),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  // Context: which flow are we in?
  existingAppointmentId: z.string().uuid().optional(),
  existingPatientId: z.string().uuid().optional(),
  // Visit type for returning patients (new appointment mode only)
  visitType: visitTypeEnum.optional(), // NEW_CONSULTATION or FOLLOW_UP
  // NEW: Priority flag
  priority: priorityEnum.optional(), // ROUTINE, URGENT, or EMERGENCY
  // Booking method
  isPhoneBooking: z.boolean().optional(),
  // Doctor selection (required — must select a treating doctor)
  doctorId: z.string().uuid("Invalid doctor ID"),
  // Payment — only amountDue set at confirmation; individual payments via /api/payments
  totalAmount: z.number().min(0, "Total amount must be 0 or greater").optional(),
});

export type ConfirmAppointmentInput = z.input<typeof confirmAppointmentSchema>;

// --- Patch patient demographics (admin updates) ---

export const patchPatientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(0, "Age must be 0 or greater")
    .max(120, "Age must be 120 or less")
    .optional(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

// --- Bulk action schemas ---

export const bulkCancelSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid appointment ID"))
    .min(1, "Select at least one appointment")
    .max(50, "Maximum 50 appointments at a time"),
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid appointment ID"))
    .min(1, "Select at least one appointment")
    .max(50, "Maximum 50 appointments at a time"),
});

// --- Inferred types ---

export type PublicBookingInput = z.input<typeof publicBookingSchema>;
export type WalkInInput = z.input<typeof walkInSchema>;
export type FollowUpInput = z.input<typeof followUpSchema>;
export type PatchAppointmentInput = z.input<typeof patchAppointmentSchema>;
export type PatchPatientInput = z.input<typeof patchPatientSchema>;
export type BulkCancelInput = z.input<typeof bulkCancelSchema>;
export type BulkDeleteInput = z.input<typeof bulkDeleteSchema>;
