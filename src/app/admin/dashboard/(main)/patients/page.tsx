import { prisma } from "@/lib/prisma";
import PatientsView from "@/components/admin/PatientsView";

const PAGE_SIZE = 30;

async function fetchPatients() {
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
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
    }),
    prisma.patient.count(),
  ]);

  return {
    patients: patients.map((p) => ({
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
    })),
    total,
  };
}

export default async function PatientsPage() {
  const { patients, total } = await fetchPatients();
  return <PatientsView initialPatients={patients} initialTotal={total} />;
}
