"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, FormField, Alert } from "@/components/ui";
import { useDashboard } from "./DashboardContext";

interface AdminRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// --- Edit Modal ---
function EditAdminModal({
  admin,
  onClose,
  onSaved,
}: {
  admin: AdminRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to update admin.");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-surface-overlay/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border-primary bg-surface-primary p-6 shadow-lg">
        <h3 className="mb-4 text-base font-semibold text-text-primary">
          Edit Admin
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <FormField label="Name" htmlFor="edit-admin-name">
            <Input
              id="edit-admin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={saving}
            />
          </FormField>

          <FormField label="Email" htmlFor="edit-admin-email">
            <Input
              id="edit-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={saving}
            />
          </FormField>

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              loading={saving}
              loadingText="Saving..."
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Settings View ---
export default function SettingsView() {
  const { adminId: currentAdminId } = useDashboard();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [resetStatus, setResetStatus] = useState<{
    id: string;
    status: "loading" | "success" | "error";
    message?: string;
  } | null>(null);

  // Create admin form state
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [createState, setCreateState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; email: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const fetchAdmins = useCallback(async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch("/api/admin");
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // --- Delete admin ---
  async function handleDelete(id: string) {
    setDeleteError("");
    setDeletingId(id);

    try {
      const res = await fetch(`/api/admin/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete admin.");
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
      fetchAdmins();
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  // --- Reset password ---
  async function handleResetPassword(id: string) {
    setResetStatus({ id, status: "loading" });

    try {
      const res = await fetch(`/api/admin/${id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setResetStatus({
          id,
          status: "error",
          message: data.error ?? "Failed to send reset email.",
        });
        return;
      }

      setResetStatus({ id, status: "success", message: data.message });
      setTimeout(() => setResetStatus(null), 3000);
    } catch {
      setResetStatus({
        id,
        status: "error",
        message: "Network error.",
      });
    }
  }

  // --- Create admin ---
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreateState({ status: "loading" });

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateState({
          status: "error",
          message: data.error ?? "Failed to create admin.",
        });
        return;
      }

      setCreateState({ status: "success", email: data.admin.email });
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      fetchAdmins();
    } catch {
      setCreateState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const isCreating = createState.status === "loading";

  return (
    <div className="space-y-8">
      {/* Section 1: Admin Users List */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Admin Users
        </h2>

        {deleteError && (
          <Alert variant="error" className="mb-3">
            {deleteError}
          </Alert>
        )}

        {loadingAdmins ? (
          <div className="py-8 text-center text-sm text-text-hint">
            Loading admins...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-primary">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left font-medium text-text-secondary">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-secondary">
                    Email
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium text-text-secondary sm:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isSelf = admin.id === currentAdminId;
                  return (
                    <tr
                      key={admin.id}
                      className="border-b border-border-primary last:border-0"
                    >
                      <td className="px-4 py-2.5 text-text-primary">
                        {admin.name}
                        {isSelf && (
                          <span className="ml-2 rounded bg-surface-brand-subtle px-1.5 py-0 text-[10px] font-medium text-text-brand">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {admin.email}
                      </td>
                      <td className="hidden px-4 py-2.5 text-text-hint sm:table-cell">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingAdmin(admin)}
                            className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(admin.id)}
                            disabled={
                              resetStatus?.id === admin.id &&
                              resetStatus.status === "loading"
                            }
                            className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
                          >
                            {resetStatus?.id === admin.id &&
                            resetStatus.status === "loading"
                              ? "Sending..."
                              : resetStatus?.id === admin.id &&
                                  resetStatus.status === "success"
                                ? "Sent!"
                                : "Reset Password"}
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(admin.id)}
                              disabled={deletingId === admin.id}
                              className="rounded px-2 py-1 text-xs font-medium text-text-error hover:bg-surface-error/10 disabled:opacity-50"
                            >
                              {deletingId === admin.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </div>
                        {resetStatus?.id === admin.id &&
                          resetStatus.status === "error" && (
                            <p className="mt-1 text-right text-xs text-text-error">
                              {resetStatus.message}
                            </p>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Add Admin */}
      <div className="max-w-md">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Add Admin User
        </h2>

        <form
          onSubmit={handleCreateAdmin}
          className="space-y-4 rounded-lg border border-border-primary bg-surface-primary p-6 shadow-sm"
        >
          {createState.status === "error" && (
            <Alert variant="error">{createState.message}</Alert>
          )}

          {createState.status === "success" && (
            <Alert variant="success">
              Admin <strong>{createState.email}</strong> created successfully.
            </Alert>
          )}

          <FormField label="Name" htmlFor="new-admin-name">
            <Input
              id="new-admin-name"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              maxLength={100}
              placeholder="Admin name"
              disabled={isCreating}
            />
          </FormField>

          <FormField label="Email" htmlFor="new-admin-email">
            <Input
              id="new-admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              disabled={isCreating}
            />
          </FormField>

          <FormField label="Password" htmlFor="new-admin-password">
            <Input
              id="new-admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              disabled={isCreating}
            />
          </FormField>

          <Button
            type="submit"
            disabled={isCreating}
            fullWidth
            loading={isCreating}
            loadingText="Creating..."
          >
            Create Admin
          </Button>
        </form>
      </div>

      {/* Edit modal */}
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSaved={fetchAdmins}
        />
      )}
    </div>
  );
}
