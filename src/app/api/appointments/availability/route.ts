/**
 * Appointment Availability API
 * GET /api/appointments/availability?date=YYYY-MM-DD&excludeAppointmentId=UUID
 *
 * Returns available and booked time slots for a given date
 */

import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@/generated/prisma/client";
import { generateSlotsForDate } from "@/lib/utils/time-slots";
import { BUSINESS_HOURS_CONFIG } from "@/lib/config/business-hours";
import { createClient } from "@/lib/supabase/server";

export interface TimeSlotAvailability {
  time: string; // HH:mm format (e.g., "10:00")
  datetime: string; // ISO 8601 string
  available: boolean; // true if slot is available, false if booked
  count: number; // Number of appointments at this slot
}

export interface AvailabilityResponse {
  success: boolean;
  date: string; // YYYY-MM-DD
  slots: TimeSlotAvailability[];
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check if caller is admin (for count visibility)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user
      ? !!(await prisma.admin.findUnique({ where: { id: user.id } }))
      : false;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId");

    // Validate required date parameter
    if (!dateParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Date parameter is required (format: YYYY-MM-DD)",
        } as AvailabilityResponse,
        { status: 400 }
      );
    }

    // Parse and validate date in IST timezone
    const date = DateTime.fromISO(dateParam, {
      zone: BUSINESS_HOURS_CONFIG.timezone,
    });

    if (!date.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid date format. Expected YYYY-MM-DD, got: ${dateParam}`,
        } as AvailabilityResponse,
        { status: 400 }
      );
    }

    // Generate all possible slots for this date
    const slots = generateSlotsForDate(date);

    // Query appointments for this date range
    const startOfDay = date.startOf("day").toJSDate();
    const endOfDay = date.endOf("day").toJSDate();

    const whereClause: {
      preferredDateTime: { gte: Date; lte: Date };
      status: { in: AppointmentStatus[] };
      id?: { not: string };
    } = {
      preferredDateTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["PENDING", "OVERDUE", "CONFIRMED", "COMPLETED"],
      },
    };

    // Exclude specific appointment if editing (prevents self-conflict)
    if (excludeAppointmentId) {
      whereClause.id = { not: excludeAppointmentId };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        preferredDateTime: true,
      },
    });

    // Count appointments per slot time
    const slotCountMap = new Map<string, number>();

    for (const appointment of appointments) {
      const appointmentTime = DateTime.fromJSDate(appointment.preferredDateTime, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      }).toFormat("HH:mm");

      slotCountMap.set(
        appointmentTime,
        (slotCountMap.get(appointmentTime) || 0) + 1
      );
    }

    // Build response with availability information
    // Strip counts for unauthenticated callers (F-10)
    const slotsWithAvailability: TimeSlotAvailability[] = slots.map((slot) => {
      const count = slotCountMap.get(slot.time) || 0;
      return {
        time: slot.time,
        datetime: slot.datetime,
        count: isAdmin ? count : 0,
        available: count === 0,
      };
    });

    return NextResponse.json({
      success: true,
      date: dateParam,
      slots: slotsWithAvailability,
    } as AvailabilityResponse);
  } catch (error) {
    console.error("Error fetching appointment availability:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch appointment availability. Please try again.",
      } as AvailabilityResponse,
      { status: 500 }
    );
  }
}
