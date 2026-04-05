import { prisma } from "@/lib/prisma";
import PatientsView from "@/components/admin/PatientsView";

async function fetchPatients() {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      patientId: true,
      name: true,
      phone: true,
      email: true,
      age: true,
      sex: true,
      address: true,
      createdAt: true,
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { preferredDateTime: "desc" },
        take: 1,
        select: { preferredDateTime: true },
      },
    },
  });

  return patients.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    name: p.name,
    phone: p.phone,
    email: p.email,
    age: p.age,
    sex: p.sex,
    address: p.address,
    createdAt: p.createdAt.toISOString(),
    totalVisits: p._count.appointments,
    lastVisit:
      p.appointments.length > 0
        ? p.appointments[0].preferredDateTime.toISOString()
        : null,
  }));
}

export default async function PatientsPage() {
  const patients = await fetchPatients();
  return <PatientsView initialPatients={patients} />;
}
