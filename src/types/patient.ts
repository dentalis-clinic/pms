import type { SubmissionSource } from "@/generated/prisma/client";

/**
 * Patient row as returned by the list API.
 * Dates are ISO strings (JSON-serialized from the server).
 * Includes `phoneCount` from the SQL window function.
 */
export interface PatientRow {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  preferredDateTime: string;
  reasonForVisit: string | null;
  submittedBy: SubmissionSource;
  adminUserId: string | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  phoneCount: number;
}
