import { prisma } from "@/lib/prisma";
import BlankLetterheadTemplate, { type PatientInfo } from "@/components/BlankLetterheadTemplate";

interface PageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function BlankTemplatePage({ searchParams }: PageProps) {
  const { patientId } = await searchParams;

  let patient: PatientInfo | undefined;

  if (patientId) {
    const found = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { patientId: true, name: true, phone: true, age: true, sex: true, address: true },
    });
    if (found) {
      patient = {
        patientId: found.patientId,
        name: found.name,
        phone: found.phone,
        age: found.age,
        sex: found.sex,
        address: found.address,
      };
    }
  }

  return <BlankLetterheadTemplate patient={patient} />;
}
