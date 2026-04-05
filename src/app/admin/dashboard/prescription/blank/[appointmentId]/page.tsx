import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BlankPrescriptionTemplate from "@/components/BlankPrescriptionTemplate";

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export default async function BlankPrescriptionPage({ params }: PageProps) {
  const { appointmentId } = await params;

  // Fetch appointment with patient data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true },
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
      age: appointment.patient.age,
      sex: appointment.patient.sex,
      address: appointment.patient.address,
    },
    doctor: appointment.doctor
      ? {
          name: appointment.doctor.name,
          qualifications: appointment.doctor.qualifications,
          registrationNumber: appointment.doctor.registrationNumber,
        }
      : null,
  };

  return <BlankPrescriptionTemplate appointment={serialized} />;
}
