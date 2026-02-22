"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PatientRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import AdminPatientForm from "@/components/AdminPatientForm";

type Tab = "patients" | "walk-in" | "admin-mgmt";

interface DashboardClientProps {
  adminName: string;
}

export default function DashboardClient({ adminName }: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("patients");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin management state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName2, setAdminName2] = useState("");
  const [adminFormState, setAdminFormState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; email: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments/list");
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  function handleWalkInSuccess(patientId: string) {
    // Find the patient by patientId after refresh to get its UUID for highlighting
    fetchPatients().then(() => {
      setActiveTab("patients");
      // Find newly created patient by patientId
      setPatients((prev) => {
        const found = prev.find((p) => p.patientId === patientId);
        if (found) {
          setHighlightId(found.id);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => setHighlightId(undefined), 3000);
        }
        return prev;
      });
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminFormState({ status: "loading" });

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName2,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminFormState({
          status: "error",
          message: data.error ?? "Failed to create admin.",
        });
        return;
      }

      setAdminFormState({ status: "success", email: data.admin.email });
      setAdminEmail("");
      setAdminPassword("");
      setAdminName2("");
    } catch {
      setAdminFormState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
      activeTab === tab
        ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
        : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;

  const inputClassName =
    "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              DentalisPMS
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Welcome, {adminName}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex gap-1 border-b border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" className={tabClass("patients")} onClick={() => setActiveTab("patients")}>
            Patients
          </button>
          <button type="button" className={tabClass("walk-in")} onClick={() => setActiveTab("walk-in")}>
            Walk-in
          </button>
          <button type="button" className={tabClass("admin-mgmt")} onClick={() => setActiveTab("admin-mgmt")}>
            Admin
          </button>
        </nav>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === "patients" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Patient Records
                </h2>
                <div className="flex items-center gap-2">
                  <CSVExportButton patients={patients} />
                  <button
                    type="button"
                    onClick={() => { setLoading(true); fetchPatients(); }}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Loading patients...
                </div>
              ) : (
                <PatientTable
                  patients={patients}
                  onRefresh={fetchPatients}
                  highlightId={highlightId}
                />
              )}
            </div>
          )}

          {activeTab === "walk-in" && (
            <AdminPatientForm onSuccess={handleWalkInSuccess} />
          )}

          {activeTab === "admin-mgmt" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Add Admin User
              </h2>

              <form
                onSubmit={handleCreateAdmin}
                className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {adminFormState.status === "error" && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                    {adminFormState.message}
                  </div>
                )}

                {adminFormState.status === "success" && (
                  <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                    Admin <strong>{adminFormState.email}</strong> created successfully.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="new-admin-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Name
                  </label>
                  <input id="new-admin-name" type="text" value={adminName2} onChange={(e) => setAdminName2(e.target.value)} required maxLength={100} className={inputClassName} placeholder="Admin name" disabled={adminFormState.status === "loading"} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-admin-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email
                  </label>
                  <input id="new-admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className={inputClassName} placeholder="admin@example.com" disabled={adminFormState.status === "loading"} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-admin-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <input id="new-admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required minLength={6} className={inputClassName} placeholder="Min. 6 characters" disabled={adminFormState.status === "loading"} />
                </div>

                <button
                  type="submit"
                  disabled={adminFormState.status === "loading"}
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-900"
                >
                  {adminFormState.status === "loading" ? "Creating..." : "Create Admin"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
