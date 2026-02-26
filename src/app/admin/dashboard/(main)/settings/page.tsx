"use client";

import { useState } from "react";
import { Button, Input, FormField, Alert } from "@/components/ui";

type AdminFormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

export default function SettingsPage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [formState, setFormState] = useState<AdminFormState>({ status: "idle" });

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormState({ status: "loading" });

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
        setFormState({
          status: "error",
          message: data.error ?? "Failed to create admin.",
        });
        return;
      }

      setFormState({ status: "success", email: data.admin.email });
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
    } catch {
      setFormState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const isLoading = formState.status === "loading";

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        Add Admin User
      </h2>

      <form
        onSubmit={handleCreateAdmin}
        className="space-y-4 rounded-lg border border-border-primary bg-surface-primary p-6 shadow-sm"
      >
        {formState.status === "error" && (
          <Alert variant="error">{formState.message}</Alert>
        )}

        {formState.status === "success" && (
          <Alert variant="success">
            Admin <strong>{formState.email}</strong> created successfully.
          </Alert>
        )}

        <FormField label="Name" htmlFor="new-admin-name">
          <Input id="new-admin-name" type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required maxLength={100} placeholder="Admin name" disabled={isLoading} />
        </FormField>

        <FormField label="Email" htmlFor="new-admin-email">
          <Input id="new-admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="admin@example.com" disabled={isLoading} />
        </FormField>

        <FormField label="Password" htmlFor="new-admin-password">
          <Input id="new-admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" disabled={isLoading} />
        </FormField>

        <Button type="submit" disabled={isLoading} fullWidth loading={isLoading} loadingText="Creating...">
          Create Admin
        </Button>
      </form>
    </div>
  );
}
