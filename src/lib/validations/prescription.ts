import { z } from "zod/v4";

export const medicationSchema = z.object({
  drugName: z.string().trim().min(1, "Drug name is required"),
  dosage: z.string().trim().min(1, "Dosage is required"),
  frequency: z.string().trim().min(1, "Frequency is required"),
  duration: z.string().trim().min(1, "Duration is required"),
});

export const prescriptionSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  diagnosis: z.string().trim().min(1, "Diagnosis is required"),
  medications: z
    .array(medicationSchema)
    .min(1, "At least one medication is required"),
  treatmentPlan: z.string().trim().optional().or(z.literal("")),
  nextVisitDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => !date || !isNaN(date.getTime()),
      "Invalid date"
    )
    .refine(
      (date) => !date || date > new Date(),
      "Next visit must be in the future"
    ),
  advice: z.string().trim().optional().or(z.literal("")),
});

export type PrescriptionInput = z.input<typeof prescriptionSchema>;
export type MedicationInput = z.input<typeof medicationSchema>;
