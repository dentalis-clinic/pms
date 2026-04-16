import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DateTime } from "luxon";

/**
 * GET /api/reports/payments?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 * - summary: totals for the period (billed, collected, waived, outstanding)
 * - methodBreakdown: payment amounts grouped by method
 * - outstandingBills: all appointments with balance > 0 (all-time, not date-filtered)
 * - dailyCollections: payments aggregated by day for charting
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Default: current month in IST
    const now = DateTime.now().setZone("Asia/Kolkata");
    const fromIST = fromParam
      ? DateTime.fromISO(fromParam, { zone: "Asia/Kolkata" }).startOf("day")
      : now.startOf("month");
    const toIST = toParam
      ? DateTime.fromISO(toParam, { zone: "Asia/Kolkata" }).endOf("day")
      : now.endOf("day");

    const fromUTC = fromIST.toUTC().toJSDate();
    const toUTC = toIST.toUTC().toJSDate();

    // Run all queries in parallel
    const [periodPayments, billedAppointments, allBillableAppointments] =
      await Promise.all([
        // Payments made within the date range
        prisma.payment.findMany({
          where: { paidAt: { gte: fromUTC, lte: toUTC } },
          select: { amount: true, method: true, paidAt: true, appointmentId: true },
        }),

        // Appointments confirmed/completed with a bill set, scheduled in range
        // ("billed in period" = service delivered in this period)
        prisma.appointment.findMany({
          where: {
            status: { in: ["CONFIRMED", "COMPLETED"] },
            totalAmount: { not: null },
            preferredDateTime: { gte: fromUTC, lte: toUTC },
          },
          select: { totalAmount: true },
        }),

        // All appointments with totalAmount set, for outstanding calculation
        prisma.appointment.findMany({
          where: {
            status: { in: ["CONFIRMED", "COMPLETED"] },
            totalAmount: { not: null },
          },
          select: {
            id: true,
            appointmentId: true,
            totalAmount: true,
            preferredDateTime: true,
            patient: { select: { name: true, phone: true } },
            payments: { select: { amount: true, method: true } },
          },
          orderBy: { preferredDateTime: "asc" },
        }),
      ]);

    // --- Summary ---
    const totalCollected = periodPayments
      .filter((p) => p.method !== "WAIVED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalWaived = periodPayments
      .filter((p) => p.method === "WAIVED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalBilled = billedAppointments.reduce(
      (sum, a) => sum + Number(a.totalAmount),
      0
    );

    // --- Method breakdown (period payments) ---
    const methodMap = new Map<string, { amount: number; count: number }>();
    for (const p of periodPayments) {
      const existing = methodMap.get(p.method) ?? { amount: 0, count: 0 };
      methodMap.set(p.method, {
        amount: existing.amount + Number(p.amount),
        count: existing.count + 1,
      });
    }
    const methodBreakdown = Array.from(methodMap.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // --- Outstanding bills (all-time) ---
    const outstandingBills = allBillableAppointments
      .map((a) => {
        const paid = a.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const amountDue = Number(a.totalAmount);
        const balance = amountDue - paid;
        return {
          appointmentId: a.id,
          appointmentRef: a.appointmentId,
          patientName: a.patient.name,
          phone: a.patient.phone,
          amountDue,
          totalPaid: Math.round(paid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
          preferredDateTime: a.preferredDateTime.toISOString(),
        };
      })
      .filter((b) => b.balance > 0)
      .sort((a, b) => b.balance - a.balance); // Largest balance first

    // --- Daily collections (group period payments by IST date) ---
    const dailyMap = new Map<string, { collected: number; waived: number }>();
    for (const p of periodPayments) {
      const dateKey = DateTime.fromJSDate(p.paidAt)
        .setZone("Asia/Kolkata")
        .toFormat("yyyy-MM-dd");
      const existing = dailyMap.get(dateKey) ?? { collected: 0, waived: 0 };
      if (p.method === "WAIVED") {
        existing.waived += Number(p.amount);
      } else {
        existing.collected += Number(p.amount);
      }
      dailyMap.set(dateKey, existing);
    }
    const dailyCollections = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      period: {
        from: fromIST.toFormat("yyyy-MM-dd"),
        to: toIST.toFormat("yyyy-MM-dd"),
      },
      summary: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalWaived: Math.round(totalWaived * 100) / 100,
        appointmentCount: billedAppointments.length,
        outstandingTotal: Math.round(
          outstandingBills.reduce((sum, b) => sum + b.balance, 0) * 100
        ) / 100,
        outstandingCount: outstandingBills.length,
      },
      methodBreakdown,
      outstandingBills,
      dailyCollections,
    });
  } catch (error) {
    console.error("GET /api/reports/payments error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
