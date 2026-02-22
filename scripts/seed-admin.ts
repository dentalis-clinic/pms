import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@dentalis.com";
  const password = "admin123"; // Change this before production!
  const name = "Admin";

  // Check if admin already exists in our table
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin with email "${email}" already exists. Skipping.`);
    return;
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

  if (authError) {
    throw new Error(`Supabase Auth error: ${authError.message}`);
  }

  // Create matching admin record in our database
  const admin = await prisma.admin.create({
    data: {
      id: authData.user.id, // Same UUID as Supabase auth.users
      email,
      name,
    },
  });

  console.log(`Admin created successfully:`);
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Name:  ${admin.name}`);
  console.log(
    `\n⚠️  Default password is "admin123" — change it in Supabase dashboard before production!`
  );
}

main()
  .catch((e) => {
    console.error("Failed to seed admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
