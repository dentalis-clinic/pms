"use client";

import { useRef, useState } from "react";
import { CLINIC_CONFIG } from "@/lib/config/clinic";
import { formatISTDate } from "@/lib/utils/date";
import { Button } from "@/components/ui";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface BlankPrescriptionTemplateProps {
  appointment: {
    id: string;
    preferredDateTime: string;
    reasonForVisit: string | null;
    patient: {
      patientId: string;
      name: string;
      phone: string;
      email: string | null;
      dateOfBirth: string | null;
      sex: string | null;
    };
  };
}

function calculateAge(dob: string): string {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} yrs`;
}

export default function BlankPrescriptionTemplate({
  appointment,
}: BlankPrescriptionTemplateProps) {
  const { patient } = appointment;
  const addr = CLINIC_CONFIG.address;
  const currentDate = formatISTDate(new Date());
  const prescriptionRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!prescriptionRef.current) return;
    setIsDownloading(true);

    try {
      const element = prescriptionRef.current;

      // Capture at high quality (3x) to ensure crisp text
      // We use the style option to resolve any layout shifts during capture
      const imgData = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        style: {
          margin: "0",
          left: "0",
          top: "0",
          transform: "none",
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      const pdfImgHeight = pdfWidth / ratio;

      // Add image to the top of the A4 page
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfImgHeight);

      pdf.save(`prescription-${patient.name.toLowerCase().replace(/\s+/g, "-")}-${currentDate}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try printing instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      {/* Custom Header — hidden in print */}
      <div className="sticky top-0 z-10 mb-6 flex items-center justify-between border-b border-border-primary bg-white px-6 py-4 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <a
            href="/admin/dashboard/home"
            className="group flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transition-transform group-hover:-translate-x-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Dashboard
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleDownloadPDF}
            loading={isDownloading}
            loadingText="Downloading..."
          >
            Download
          </Button>
          <Button
            variant="primary"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Prescription content — A4-optimized */}
      <div
        ref={prescriptionRef}
        className="print-avoid-break mx-auto max-w-[210mm] rounded-lg border border-border-primary bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none"
      >
        {/* Header */}
        <div className="mb-4 border-b-2 border-gray-800 pb-2 print-avoid-break">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CLINIC_CONFIG.logo}
                alt="Clinic logo"
                className="h-16 w-32 rounded object-contain"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {addr.line1}
              </p>
              <p className="text-sm text-gray-600">
                {addr.line2}
              </p>
              <p className="text-sm text-gray-600">
                {addr.city}, {addr.state} - {addr.pincode}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">Timing: <span className="text-gray-900">{CLINIC_CONFIG.timing}</span></span>
              </p>
            </div>
          </div>
          <div className="w-full text-left">
            <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">
              {CLINIC_CONFIG.name}
            </h1>
          </div>
        </div>

        {/* Patient Info (auto-filled) */}
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm print-avoid-break">
          <div>
            <p>
              <span className="font-medium text-gray-700">Patient: </span>
              <span className="text-gray-900">{patient.name}</span>
            </p>
            {patient.dateOfBirth && (
              <p>
                <span className="font-medium text-gray-700">Age: </span>
                <span className="text-gray-900">
                  {calculateAge(patient.dateOfBirth)}
                </span>
              </p>
            )}
            {patient.sex && (
              <p>
                <span className="font-medium text-gray-700">Sex: </span>
                <span className="text-gray-900">
                  {patient.sex.charAt(0) + patient.sex.slice(1).toLowerCase()}
                </span>
              </p>
            )}
            <p>
              <span className="font-medium text-gray-700">Phone: </span>
              <span className="text-gray-900">{patient.phone}</span>
            </p>
            {patient.email && (
              <p>
                <span className="font-medium text-gray-700">Email: </span>
                <span className="text-gray-900">{patient.email}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p>
              <span className="font-medium text-gray-700">Patient ID: </span>
              <span className="font-mono text-gray-900">
                {patient.patientId}
              </span>
            </p>
            <p>
              <span className="font-medium text-gray-700">Date: </span>
              <span className="text-gray-900">{currentDate}</span>
            </p>
          </div>
        </div>

        <hr className="mb-4 border-gray-300" />

        {/* Chief Complaint (auto-filled from appointment.reasonForVisit) */}
        <div className="mb-6 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Chief Complaint
          </h2>
          <p className="text-sm text-gray-900">
            {appointment.reasonForVisit || "Not specified"}
          </p>
        </div>

        {/* Diagnosis (BLANK with dotted underlines) */}
        <div className="mb-6 print-avoid-break">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
            Diagnosis
          </h2>
          <div className="space-y-3">
            <div className="h-5 border-b border-dotted border-gray-400"></div>
            <div className="h-5 border-b border-dotted border-gray-400"></div>
          </div>
        </div>

        {/* Medications (BLANK table with 5 pre-printed rows) */}
        <div className="mb-6 print-avoid-break">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
            Medications
          </h2>
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1.5 text-left font-medium text-gray-700 w-10">
                  #
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-medium text-gray-700">
                  Drug Name
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-medium text-gray-700 w-24">
                  Dosage
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-medium text-gray-700 w-32">
                  Frequency
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-medium text-gray-700 w-24">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((num) => (
                <tr key={num}>
                  <td className="border border-gray-400 px-2 py-3 text-center text-gray-400">
                    {num}
                  </td>
                  <td className="border border-gray-400 px-2 py-3"></td>
                  <td className="border border-gray-400 px-2 py-3"></td>
                  <td className="border border-gray-400 px-2 py-3"></td>
                  <td className="border border-gray-400 px-2 py-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Treatment Plan / Procedures (BLANK) */}
        <div className="mb-6 print-avoid-break">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
            Treatment Plan / Procedures
          </h2>
          <div className="space-y-3">
            <div className="h-5 border-b border-dotted border-gray-400"></div>
            <div className="h-5 border-b border-dotted border-gray-400"></div>
            <div className="h-5 border-b border-dotted border-gray-400"></div>
          </div>
        </div>

        {/* Advice / Instructions (BLANK) */}
        <div className="mb-8 print-avoid-break">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
            Advice / Instructions
          </h2>
          <div className="space-y-3">
            <div className="h-5 border-b border-dotted border-gray-400"></div>
            <div className="h-5 border-b border-dotted border-gray-400"></div>
          </div>
        </div>

        {/* Signature area (BLANK) */}
        <div className="mt-12 flex justify-end print-avoid-break">
          <div className="text-center">
            <div className="mb-12 w-48 border-b border-gray-400" />
            <p className="text-sm font-semibold text-gray-900">
              {CLINIC_CONFIG.doctorName}
            </p>
            <p className="text-xs text-gray-600">
              {CLINIC_CONFIG.doctorQualifications}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t-2 border-gray-800 pt-3 text-center print-avoid-break">
          <p className="text-xs text-gray-700 font-bold">
            {CLINIC_CONFIG.phones.join(" | ")}
          </p>
          <p className="text-xs text-gray-700">
            {CLINIC_CONFIG.email} | {CLINIC_CONFIG.website}
          </p>
        </div>
      </div>
    </div>
  );
}
