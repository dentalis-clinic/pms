import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import BlankPrescriptionTemplate from "@/components/BlankPrescriptionTemplate";

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export default async function BlankPrescriptionPage({ params }: PageProps) {
  const { appointmentId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = await prisma.admin.findUnique({ where: { id: user.id } });
  if (!admin) {
    redirect("/admin/login");
  }

  // Fetch appointment with patient data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appointment) {
    notFound();
  }

  // Serialize dates
  const serialized = {
    id: appointment.id,
    preferredDateTime: appointment.preferredDateTime.toISOString(),
    reasonForVisit: appointment.reasonForVisit,
    patient: {
      patientId: appointment.patient.patientId,
      name: appointment.patient.name,
      phone: appointment.patient.phone,
      email: appointment.patient.email,
      dateOfBirth: appointment.patient.dateOfBirth?.toISOString() ?? null,
      sex: appointment.patient.sex,
    },
  };

  return <BlankPrescriptionTemplate appointment={serialized} />;
}
