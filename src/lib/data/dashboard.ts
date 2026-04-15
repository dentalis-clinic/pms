import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@/generated/prisma/client";

/**
 * Server-side data fetchers for the dashboard.
 * Called directly from Server Components — no HTTP overhead, no re-auth.
 *
 * Status transitions (PENDING→OVERDUE, CONFIRMED→COMPLETED) are handled by
 * Supabase pg_cron (scripts/setup-pg-cron.sql) — not on the read path.
 */

interface StatsRow {
  today_appointments: bigint;
  pending_confirmations: bigint;
  patients_seen_today: bigint;
  total_patients: bigint;
}

export interface DashboardStatsData {
  todayAppointments: number;
  pendingConfirmations: number;
  patientsSeenToday: number;
  totalPatients: number;
}

function getTodayBounds() {
  const now = DateTime.now().setZone("Asia/Kolkata");
  return {
    todayStart: now.startOf("day").toJSDate(),
    tomorrowStart: now.plus({ days: 1 }).startOf("day").toJSDate(),
  };
}

export async function fetchDashboardStats(): Promise<DashboardStatsData> {
  const { todayStart, tomorrowStart } = getTodayBounds();

  const [stats] = await prisma.$queryRaw<StatsRow[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE "preferredDateTime" >= ${todayStart}
          AND "preferredDateTime" < ${tomorrowStart}
      ) AS today_appointments,
      COUNT(*) FILTER (
        WHERE status IN ('PENDING', 'OVERDUE')
      ) AS pending_confirmations,
      COUNT(*) FILTER (
        WHERE status = 'COMPLETED'
          AND "preferredDateTime" >= ${todayStart}
          AND "preferredDateTime" < ${tomorrowStart}
      ) AS patients_seen_today,
      (SELECT COUNT(*) FROM patients) AS total_patients
    FROM appointments
  `;

  return {
    todayAppointments: Number(stats.today_appointments),
    pendingConfirmations: Number(stats.pending_confirmations),
    patientsSeenToday: Number(stats.patients_seen_today),
    totalPatients: Number(stats.total_patients),
  };
}

type DateFilter = "today" | "upcoming" | "all";

export async function fetchAppointments(dateFilter: DateFilter = "today") {
  const where: Record<string, unknown> = {};

  if (dateFilter === "today" || dateFilter === "upcoming") {
    const { todayStart, tomorrowStart } = getTodayBounds();

    if (dateFilter === "today") {
      where.preferredDateTime = { gte: todayStart, lt: tomorrowStart };
    } else {
      where.preferredDateTime = { gte: tomorrowStart };
      where.status = { not: "CANCELLED" as AppointmentStatus };
    }
  }

  const orderBy =
    dateFilter === "today"
      ? { preferredDateTime: "asc" as const }
      : { createdAt: "desc" as const };

  const include = {
    patient: true,
    prescription: { select: { id: true, prescriptionId: true } },
    doctor: { select: { id: true, name: true, qualifications: true } },
  } as const;

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({ where, include, orderBy, take: 30, skip: 0 }),
  ]);

  const serialized = appointments.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    preferredDateTime: a.preferredDateTime.toISOString(),
    totalAmount: a.totalAmount != null ? Number(a.totalAmount) : null,
    paidAmount: a.paidAmount != null ? Number(a.paidAmount) : null,
    patient: {
      ...a.patient,
      createdAt: a.patient.createdAt.toISOString(),
      updatedAt: a.patient.updatedAt.toISOString(),
    },
    prescription: a.prescription ?? null,
    doctor: a.doctor ?? null,
  }));

  return { appointments: serialized, total };
}
