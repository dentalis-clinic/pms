import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CustomTemplateView from "@/components/CustomTemplateView";
import SurveyTemplateView from "@/components/SurveyTemplateView";
import type { PatientInfo } from "@/components/BlankLetterheadTemplate";

interface PageProps {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ patientId?: string }>;
}

export default async function CustomTemplatePrintPage({ params, searchParams }: PageProps) {
  const { templateId } = await params;
  const { patientId } = await searchParams;

  const template = await prisma.printable_templates.findUnique({
    where: { id: templateId },
    select: { title: true, templateType: true, showPatientDetails: true, content: true },
  });

  if (!template) notFound();

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

  if (template.templateType === "SURVEY") {
    return <SurveyTemplateView template={template} patient={patient} />;
  }

  return <CustomTemplateView template={template} patient={patient} />;
}
