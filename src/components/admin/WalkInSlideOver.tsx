"use client";

import { useEffect } from "react";
import { useDashboard } from "./DashboardContext";
import AdminPatientForm from "@/components/AdminPatientForm";

export default function WalkInSlideOver() {
  const { walkInOpen, closeWalkIn, triggerRefresh } = useDashboard();

  // Close on Escape key
  useEffect(() => {
    if (!walkInOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeWalkIn();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [walkInOpen, closeWalkIn]);

  // Prevent body scroll when open
  useEffect(() => {
    if (walkInOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [walkInOpen]);

  if (!walkInOpen) return null;

  function handleSuccess(_patientId: string) {
    closeWalkIn();
    triggerRefresh();
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-brand-950/30" onClick={closeWalkIn} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-neutral-200 bg-surface-primary shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-950">
            New Walk-in Appointment
          </h2>
          <button
            type="button"
            onClick={closeWalkIn}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <AdminPatientForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
