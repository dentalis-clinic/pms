"use client";

import { parse } from "json2csv";
import { DateTime } from "luxon";
import { formatISTDateTime, formatISTDate } from "@/lib/utils/date";
import type { AppointmentRow } from "@/types/patient";
import { Button } from "@/components/ui";

interface CSVExportButtonProps {
  appointments: AppointmentRow[];
}

const CSV_FIELDS = [
  { label: "Patient ID", value: "patientId" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "Email", value: "email" },
  { label: "DOB", value: "dateOfBirth" },
  { label: "Type", value: "type" },
  { label: "Status", value: "status" },
  { label: "Scheduled Date/Time", value: "preferredDateTime" },
  { label: "Reason for Visit", value: "reasonForVisit" },
  { label: "Submitted By", value: "submittedBy" },
  { label: "Created At", value: "createdAt" },
];

export default function CSVExportButton({ appointments }: CSVExportButtonProps) {
  function handleExport() {
    const formatted = appointments.map((a) => ({
      patientId: a.patient.patientId,
      name: a.patient.name,
      phone: a.patient.phone,
      email: a.patient.email ?? "",
      dateOfBirth: a.patient.dateOfBirth
        ? formatISTDate(new Date(a.patient.dateOfBirth))
        : "",
      type: a.type,
      status: a.status,
      preferredDateTime: formatISTDateTime(new Date(a.preferredDateTime)),
      reasonForVisit: a.reasonForVisit ?? "",
      submittedBy: a.submittedBy,
      createdAt: formatISTDateTime(new Date(a.createdAt)),
    }));

    const csv = parse(formatted, { fields: CSV_FIELDS });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const dateStr = DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("yyyyMMdd");
    anchor.href = url;
    anchor.download = `appointments-${dateStr}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      disabled={appointments.length === 0}
    >
      Export CSV
    </Button>
  );
}
