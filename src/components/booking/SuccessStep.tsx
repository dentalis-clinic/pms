"use client";

import { Button } from "@/components/ui";
import { formatISTDateTime } from "@/lib/utils/date";

interface SuccessStepProps {
  patientId: string;
  preferredDateTime: string;
  onReset: () => void;
}

export function SuccessStep({
  patientId,
  preferredDateTime,
  onReset,
}: SuccessStepProps) {
  return (
    <div className="rounded-lg border border-border-success/20 bg-surface-success p-6 text-center">
      <div className="mb-2 text-lg font-semibold text-text-success">
        Appointment Tentatively Booked
      </div>
      <p className="mb-3 text-sm text-text-success">
        Your appointment is tentatively scheduled for:
      </p>
      <div className="mb-3 text-lg font-bold text-text-success">
        {formatISTDateTime(new Date(preferredDateTime))}
      </div>
      <p className="mb-4 text-sm text-text-success">
        The doctor will confirm your appointment based on availability. You may
        be contacted on your phone for confirmation.
      </p>
      <p className="mb-4 text-xs text-text-success/70">
        Reference: {patientId}
      </p>
      <Button variant="success" onClick={onReset}>
        Book Another Appointment
      </Button>
    </div>
  );
}
