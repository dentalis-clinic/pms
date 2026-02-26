"use client";

import { CLINIC_CONFIG } from "@/lib/config/clinic";
import { formatISTDate, formatISTDateTime } from "@/lib/utils/date";
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
      <div className="mx-auto max-w-[210mm] rounded-lg border border-border-primary bg-white p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
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
                <p className="text-sm text-gray-600">
                  Timing: {CLINIC_CONFIG.timing}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {CLINIC_CONFIG.doctorName}
              </p>
              <p className="text-xs text-gray-600">
                {CLINIC_CONFIG.doctorQualifications}
              </p>
              <p className="text-xs text-gray-600">
                Reg. No: {CLINIC_CONFIG.registrationNumber}
              </p>
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
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
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

        <hr className="mb-4 border-gray-300" />

        {/* Diagnosis */}
        <div className="mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
            Diagnosis
          </h2>
          <p className="text-sm text-gray-900">{prescription.diagnosis}</p>
        </div>

        {/* Medications table */}
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">
            Medications
          </h2>
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-1.5 text-left font-medium text-gray-700">
                  #
                </th>
                <th className="border border-gray-400 px-3 py-1.5 text-left font-medium text-gray-700">
                  Drug Name
                </th>
                <th className="border border-gray-400 px-3 py-1.5 text-left font-medium text-gray-700">
                  Dosage
                </th>
                <th className="border border-gray-400 px-3 py-1.5 text-left font-medium text-gray-700">
                  Frequency
                </th>
                <th className="border border-gray-400 px-3 py-1.5 text-left font-medium text-gray-700">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {prescription.medications.map((med, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 px-3 py-1.5 text-gray-600">
                    {i + 1}
                  </td>
                  <td className="border border-gray-400 px-3 py-1.5 text-gray-900">
                    {med.drugName}
                  </td>
                  <td className="border border-gray-400 px-3 py-1.5 text-gray-900">
                    {med.dosage}
                  </td>
                  <td className="border border-gray-400 px-3 py-1.5 text-gray-900">
                    {med.frequency}
                  </td>
                  <td className="border border-gray-400 px-3 py-1.5 text-gray-900">
                    {med.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Treatment Plan */}
        {prescription.treatmentPlan && (
          <div className="mb-4">
            <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
              Treatment Plan
            </h2>
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {prescription.treatmentPlan}
            </p>
          </div>
        )}

        {/* Next Visit */}
        {prescription.nextVisitDate && (
          <div className="mb-4">
            <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
              Next Visit
            </h2>
            <p className="text-sm text-gray-900">
              {formatISTDate(new Date(prescription.nextVisitDate))}
            </p>
          </div>
        )}

        {/* Advice */}
        {prescription.advice && (
          <div className="mb-4">
            <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">
              Advice / Instructions
            </h2>
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {prescription.advice}
            </p>
          </div>
        )}

        {/* Footer — Doctor signature */}
        <div className="mt-12 flex justify-end">
          <div className="text-center">
            <div className="mb-8 w-48 border-b border-gray-400" />
            <p className="text-sm font-semibold text-gray-900">
              {prescription.prescribedBy.name}
            </p>
            <p className="text-xs text-gray-600">
              {CLINIC_CONFIG.doctorQualifications}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
