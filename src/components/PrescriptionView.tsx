"use client";

import { CLINIC_CONFIG } from "@/lib/config/clinic";
import { formatISTDate } from "@/lib/utils/date";
import type { Medication } from "@/types/patient";

interface PrescriptionViewProps {
  prescription: {
    prescriptionId: string;
    diagnosis: string;
    medications: Medication[];
    treatmentPlan: string | null;
    nextVisitDate: string | null;
    advice: string | null;
    createdAt: string;
    prescribedBy: { name: string };
    appointment: {
      preferredDateTime: string;
      patient: {
        patientId: string;
        name: string;
        phone: string;
        email: string | null;
        dateOfBirth: string | null;
        address: string | null;
      };
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

export default function PrescriptionView({ prescription }: PrescriptionViewProps) {
  const { appointment } = prescription;
  const { patient } = appointment;
  const addr = CLINIC_CONFIG.address;

  return (
    <div>
      {/* Print / Back buttons — hidden in print */}
      <div className="mb-4 flex gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-surface-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Print
        </button>
        <a
          href="/admin/dashboard/home"
          className="rounded-lg border border-border-primary bg-surface-primary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Back to Dashboard
        </a>
      </div>

      {/* Prescription content — A4-optimized */}
      <div className="relative mx-auto max-w-[210mm] rounded-lg border border-border-primary bg-white p-8 shadow-sm print:border-none print:shadow-none print:p-0 overflow-hidden">
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
        <div className="relative z-10 border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CLINIC_CONFIG.logo}
                alt="Clinic logo"
                className="h-14 w-14 rounded object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {CLINIC_CONFIG.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {addr.line1}, {addr.line2}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  Timing: {CLINIC_CONFIG.timing}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="mt-1 text-xs text-gray-600">
                {CLINIC_CONFIG.phones.join(" | ")}
              </p>
              <p className="text-xs text-gray-600">
                {CLINIC_CONFIG.email}
              </p>
              <p className="text-xs text-gray-600">
                {CLINIC_CONFIG.website}
              </p>
            </div>
          </div>
        </div>

        {/* Patient Info + Prescription ID */}
        <div className="relative z-10 mb-6 grid grid-cols-2 gap-4 text-sm">
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
            {patient.email && (
              <p>
                <span className="font-medium text-gray-700">Email: </span>
                <span className="text-gray-900">{patient.email}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p>
              <span className="font-medium text-gray-700">Rx ID: </span>
              <span className="font-mono text-gray-900">
                {prescription.prescriptionId}
              </span>
            </p>
            <p>
              <span className="font-medium text-gray-700">Patient ID: </span>
              <span className="font-mono text-gray-900">
                {patient.patientId}
              </span>
            </p>
            <p>
              <span className="font-medium text-gray-700">Date: </span>
              <span className="text-gray-900">
                {formatISTDate(new Date(prescription.createdAt))}
              </span>
            </p>
          </div>
        </div>

        <hr className="relative z-10 mb-4 border-gray-300" />

        {/* Chief Complain */}
        <div className="relative z-10 mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Chief Complain
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Medical History */}
        <div className="relative z-10 mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Medical History
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Examinations */}
        <div className="relative z-10 mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Examinations
          </h2>
          <div className="min-h-[50px]"></div>
        </div>

        {/* Investigations */}
        <div className="relative z-10 mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Investigations
          </h2>
          <div className="min-h-[40px]"></div>
        </div>

        {/* Rx (Medications) */}
        <div className="relative z-10 mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            <span className="text-4xl leading-none">℞</span>
          </h2>
          <div className="min-h-[80px]"></div>
        </div>

        {/* Next Appointment & Signature area */}
        <div className="relative z-10 mt-8 flex justify-between">
          {/* Next Appointment - Left side */}
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
              Next Appointment:
            </h2>
          </div>

          {/* Signature - Right side */}
          <div className="text-center">
            <div className="w-48 border-b border-gray-400 mb-2" />
            <p className="text-sm font-semibold text-gray-900">
              {prescription.prescribedBy.name}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-8 border-t-2 border-gray-800 pt-3 text-center">
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
