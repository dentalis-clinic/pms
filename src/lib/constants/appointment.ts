import type {
  AppointmentStatus,
  AppointmentType,
} from "@/generated/prisma/client";

export const STATUS_BADGE: Record<
  AppointmentStatus,
  { variant: "warning" | "info" | "success" | "error"; label: string }
> = {
  TENTATIVE: { variant: "warning", label: "Tentative" },
  CONFIRMED: { variant: "info", label: "Confirmed" },
  COMPLETED: { variant: "success", label: "Completed" },
  CANCELLED: { variant: "error", label: "Cancelled" },
};

export const TYPE_LABEL: Record<AppointmentType, string> = {
  PATIENT_BOOKING: "Booking",
  WALK_IN: "Walk-in",
  FOLLOW_UP: "Follow-up",
};
