"use client";

import { parse } from "json2csv";
import { DateTime } from "luxon";
import { formatISTDateTime, formatISTDate } from "@/lib/utils/date";
import type { PatientRow } from "@/types/patient";
import { Button } from "@/components/ui";

interface CSVExportButtonProps {
  patients: PatientRow[];
}

const CSV_FIELDS = [
  { label: "Patient ID", value: "patientId" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "Email", value: "email" },
  { label: "Date of Birth", value: "dateOfBirth" },
  { label: "Preferred Date/Time", value: "preferredDateTime" },
  { label: "Reason for Visit", value: "reasonForVisit" },
  { label: "Submitted By", value: "submittedBy" },
  { label: "Complete", value: "isComplete" },
  { label: "Created At", value: "createdAt" },
];

export default function CSVExportButton({ patients }: CSVExportButtonProps) {
  function handleExport() {
    // Format dates for CSV using IST
    const formatted = patients.map((p) => ({
      ...p,
      preferredDateTime: formatISTDateTime(new Date(p.preferredDateTime)),
      createdAt: formatISTDateTime(new Date(p.createdAt)),
      dateOfBirth: p.dateOfBirth
        ? formatISTDate(new Date(p.dateOfBirth))
        : "",
      email: p.email ?? "",
      reasonForVisit: p.reasonForVisit ?? "",
      isComplete: p.isComplete ? "Yes" : "No",
    }));

    const csv = parse(formatted, { fields: CSV_FIELDS });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("yyyyMMdd");
    a.href = url;
    a.download = `patients-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      disabled={patients.length === 0}
    >
      Export CSV
    </Button>
  );
}
