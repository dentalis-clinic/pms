import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function main() {
  const patients = await prisma.patient.findMany({
    select: { id: true, patientId: true, name: true },
  });

  console.log(`Found ${patients.length} patient records.\n`);

  let updated = 0;
  for (const patient of patients) {
    const normalized = toTitleCase(patient.name);
    if (normalized !== patient.name) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { name: normalized },
      });
      console.log(`  [${patient.patientId}] "${patient.name}" → "${normalized}"`);
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} of ${patients.length} records.`);
}

main()
  .catch((e) => {
    console.error("Failed to normalize patient names:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
