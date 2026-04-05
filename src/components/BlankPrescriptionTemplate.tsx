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
      age: number | null;
      sex: string | null;
      address: string | null;
    };
    doctor: {
      name: string;
      qualifications: string | null;
      registrationNumber: string | null;
    } | null;
  };
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
      <style>{`@page { size: A4; margin: 0; }`}</style>
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
        className="relative mx-auto flex min-h-[297mm] max-w-[210mm] flex-col rounded-lg border border-border-primary bg-white p-8 shadow-sm print:h-[297mm] print:max-w-full print:border-none print:shadow-none"
      >
        {/* Diagonal Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-[4rem] font-bold text-brand-100 opacity-30 select-none whitespace-nowrap" style={{
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
          }}>
            Dentalis Dental Care By Jamians
          </div>
        </div>
        {/* Header */}
        <div className="relative z-10 mb-4 border-b-2 border-gray-800 pb-2 print-avoid-break">
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
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
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
        <div className="relative z-10 mb-4 grid grid-cols-2 gap-4 text-sm print-avoid-break">
          <div>
            <p>
              <span className="font-medium text-gray-700">Patient: </span>
              <span className="text-gray-900">{patient.name}</span>
            </p>
            {(patient.age != null || patient.sex) && (
              <p>
                <span className="font-medium text-gray-700">Age/Sex: </span>
                <span className="text-gray-900">
                  {patient.age != null ? patient.age : "-"}
                  /{patient.sex ? patient.sex.charAt(0) : "-"}
                </span>
              </p>
            )}
            <p>
              <span className="font-medium text-gray-700">Phone: </span>
              <span className="text-gray-900">{patient.phone}</span>
            </p>
            {patient.address && (
              <p>
                <span className="font-medium text-gray-700">Address: </span>
                <span className="text-gray-900">{patient.address}</span>
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

        <hr className="relative z-10 mb-4 border-gray-300" />

        {/* Chief Complain */}
        <div className="relative z-10 mb-4 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Chief Complain
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Medical History */}
        <div className="relative z-10 mb-4 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Medical History
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Examinations */}
        <div className="relative z-10 mb-4 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Examinations
          </h2>
          <div className="min-h-[50px]"></div>
        </div>

        {/* Investigations */}
        <div className="relative z-10 mb-4 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Investigations
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Rx (Medications) */}
        <div className="relative z-10 mb-4 print-avoid-break">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            <span className="text-4xl leading-none">℞</span>
          </h2>
          <div className="min-h-[80px]"></div>
        </div>

        {/* Next Appointment, Signature & Footer — pushed to bottom */}
        <div className="relative z-10 mt-auto print-avoid-break">
          <div className="flex justify-between mb-4">
            {/* Next Appointment - Left side */}
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
                Next Appointment:
              </h2>
            </div>

            {/* Signature - Right side */}
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-2" />
              {appointment.doctor && (
                <>
                  <p className="text-sm font-semibold text-gray-900">
                    {appointment.doctor.name}
                  </p>
                  {appointment.doctor.qualifications && (
                    <p className="text-xs text-gray-600">
                      {appointment.doctor.qualifications}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-800 pt-3 text-center">
            <p className="text-xs text-gray-700 font-bold">
              {CLINIC_CONFIG.phones.join(" | ")}
            </p>
            <p className="text-xs text-gray-700">
              {CLINIC_CONFIG.email} | {CLINIC_CONFIG.website}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
