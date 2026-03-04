import type {
  SubmissionSource,
  AppointmentType,
  AppointmentStatus,
  BookingChannel,
  VisitType,
  AppointmentPriority,
  Sex,
} from "@/generated/prisma/client";

// --- Patient (person) ---

export interface PatientRow {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  sex: Sex | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientMatch {
  id: string;
  patientId: string;
  name: string;
  sex: Sex | null;
  email: string | null;
  dateOfBirth: string | null;
  lastVisitDate: string | null;
}

// --- Appointment (visit) ---

export interface AppointmentRow {
  id: string;
  patientId: string;
  type: AppointmentType; // DEPRECATED: Use bookingChannel + visitType instead
  bookingChannel: BookingChannel;
  visitType: VisitType;
  priority: AppointmentPriority | null;
  status: AppointmentStatus;
  preferredDateTime: string;
  reasonForVisit: string | null;
  submittedBy: SubmissionSource;
  adminUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  patient: PatientRow;
  prescription?: PrescriptionSummary | null;
}

// Lightweight prescription info returned by the list endpoint (avoids transferring full JSONB)
export interface PrescriptionSummary {
  id: string;
  prescriptionId: string;
}

// --- Prescription ---

export interface Medication {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionRow {
  id: string;
  prescriptionId: string;
  appointmentId: string;
  diagnosis: string;
  medications: Medication[];
  treatmentPlan: string | null;
  nextVisitDate: string | null;
  advice: string | null;
  prescribedById: string;
  createdAt: string;
  updatedAt: string;
}

// --- Phone check (public booking flow) ---

export type PhoneCheckStatus = "new" | "existing" | "has_pending";

export interface MaskedPatient {
  id: string;
  maskedName: string;
  hasPending: boolean;
  pendingDate: string | null;
}

export interface PhoneCheckResponse {
  success: boolean;
  status: PhoneCheckStatus;
  patients: MaskedPatient[];
}
