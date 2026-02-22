"use client";

import { parse } from "json2csv";
import { DateTime } from "luxon";
import { formatISTDateTime, formatISTDate } from "@/lib/utils/date";
import type { PatientRow } from "@/types/patient";

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
    <button
      type="button"
      onClick={handleExport}
      disabled={patients.length === 0}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      Export CSV
    </button>
  );
}
