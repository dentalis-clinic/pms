"use client";

import { useState, useMemo } from "react";
import { formatISTDateTime, formatISTDate } from "@/lib/utils/date";
import type { PatientRow } from "@/types/patient";
import CompleteRecordForm from "./CompleteRecordForm";
import { Input, Badge } from "@/components/ui";

interface PatientTableProps {
  patients: PatientRow[];
  onRefresh: () => void;
  highlightId?: string;
}

type SortKey =
  | "patientId"
  | "name"
  | "phone"
  | "preferredDateTime"
  | "createdAt"
  | "isComplete";

export default function PatientTable({
  patients,
  onRefresh,
  highlightId,
}: PatientTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedPhones, setExpandedPhones] = useState<Set<string>>(new Set());
  const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.patientId.toLowerCase().includes(q)
    );
  }, [patients, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "patientId":
          cmp = a.patientId.localeCompare(b.patientId);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "phone":
          cmp = a.phone.localeCompare(b.phone);
          break;
        case "preferredDateTime":
          cmp = a.preferredDateTime.localeCompare(b.preferredDateTime);
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case "isComplete":
          cmp = Number(a.isComplete) - Number(b.isComplete);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  // Group by phone for display
  const { displayRows, phoneGroups } = useMemo(() => {
    const groups = new Map<string, PatientRow[]>();
    for (const p of sorted) {
      if (p.phoneCount > 1) {
        const existing = groups.get(p.phone) ?? [];
        existing.push(p);
        groups.set(p.phone, existing);
      }
    }

    // Show first record per phone group; expand to show rest if toggled
    const seen = new Set<string>();
    const rows: PatientRow[] = [];
    for (const p of sorted) {
      if (p.phoneCount <= 1) {
        rows.push(p);
      } else if (!seen.has(p.phone)) {
        seen.add(p.phone);
        rows.push(p); // primary row
        if (expandedPhones.has(p.phone)) {
          const group = groups.get(p.phone) ?? [];
          for (const g of group) {
            if (g.id !== p.id) rows.push(g);
          }
        }
      } else if (expandedPhones.has(p.phone)) {
        // Already added via expansion
      }
    }

    return { displayRows: rows, phoneGroups: groups };
  }, [sorted, expandedPhones]);

  function togglePhone(phone: string) {
    setExpandedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleEditSuccess(updated: PatientRow) {
    setEditingPatient(null);
    onRefresh();
    // preserve phoneCount from original since PATCH doesn't return it
    void updated;
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  const thClass =
    "px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer select-none hover:text-neutral-700";

  if (patients.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-surface-primary p-8 text-center">
        <p className="text-sm text-neutral-500">
          No patient records yet. Use the Walk-in tab to register a patient or share the public booking link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, or patient ID..."
        className="max-w-sm"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-surface-secondary">
            <tr>
              <th className={thClass} onClick={() => handleSort("patientId")}>
                ID{sortIndicator("patientId")}
              </th>
              <th className={thClass} onClick={() => handleSort("name")}>
                Name{sortIndicator("name")}
              </th>
              <th className={thClass} onClick={() => handleSort("phone")}>
                Phone{sortIndicator("phone")}
              </th>
              <th className={thClass}>Email</th>
              <th className={thClass}>DOB</th>
              <th className={thClass} onClick={() => handleSort("preferredDateTime")}>
                Preferred{sortIndicator("preferredDateTime")}
              </th>
              <th className={thClass}>Reason</th>
              <th className={thClass} onClick={() => handleSort("createdAt")}>
                Created{sortIndicator("createdAt")}
              </th>
              <th className={thClass} onClick={() => handleSort("isComplete")}>
                Status{sortIndicator("isComplete")}
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-surface-primary">
            {displayRows.map((p) => {
              const isHighlighted = highlightId === p.id;
              const isGrouped = p.phoneCount > 1;
              const isGroupPrimary = isGrouped && (phoneGroups.get(p.phone)?.[0]?.id === p.id || !expandedPhones.has(p.phone));

              return (
                <tr
                  key={p.id}
                  className={`text-sm ${
                    isHighlighted
                      ? "animate-pulse bg-warning-50"
                      : ""
                  } ${
                    isGrouped && expandedPhones.has(p.phone) && !isGroupPrimary
                      ? "bg-surface-secondary"
                      : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-neutral-700">
                    {p.patientId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-950">
                    {p.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                    {p.phone}
                    {isGrouped && isGroupPrimary && (
                      <Badge variant="info" interactive onClick={() => togglePhone(p.phone)} className="ml-1.5">
                        {p.phoneCount}
                        <span className="ml-0.5">
                          {expandedPhones.has(p.phone) ? "\u25B4" : "\u25BE"}
                        </span>
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                    {p.email ?? <span className="text-neutral-300">&mdash;</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                    {p.dateOfBirth ? formatISTDate(new Date(p.dateOfBirth)) : <span className="text-neutral-300">&mdash;</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                    {formatISTDateTime(new Date(p.preferredDateTime))}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-neutral-600" title={p.reasonForVisit ?? undefined}>
                    {p.reasonForVisit ?? <span className="text-neutral-300">&mdash;</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500 text-xs">
                    {formatISTDateTime(new Date(p.createdAt))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {p.isComplete ? (
                      <Badge variant="success">Complete</Badge>
                    ) : (
                      <Badge variant="warning" interactive onClick={() => setEditingPatient(p)}>
                        Incomplete
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setEditingPatient(p)}
                      className="text-xs text-neutral-500 hover:text-neutral-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>

      {/* Complete Record Modal */}
      {editingPatient && (
        <CompleteRecordForm
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
