# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DentalisPMS is a dental clinic appointment booking system deployed as a cloud SaaS. Patients submit minimal appointment requests via a public form; clinic admins complete patient records and manage data through a protected dashboard. Architecture supports multi-tenancy for future expansion; Phase 1 targets a single clinic (prefix `DDCJ`).

**Privacy commitment:** We never sell or share patient data. Data isolation is enforced at the application layer (row-level `clinicId` filtering in future phases).

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript (strict)
- **Database:** Supabase PostgreSQL with Prisma ORM (v7, @prisma/adapter-pg)
- **Auth:** Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`) — email/password for admin. Future: magic link/OTP for patient portal.
- **Styling:** Tailwind CSS v4
- **Validation:** Zod v4 (shared schemas for client + server)
- **Date/Time:** Luxon — all IST operations must use `DateTime.now().setZone('Asia/Kolkata')`
- **CSV Export:** json2csv library
- **Deployment:** Vercel (app) + Supabase (database + auth)
- **Rate Limiting:** Upstash Redis (serverless-compatible) or Vercel KV

## Token Efficiency
- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..."  Just do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.

## Coding
- Always use Typescript
- Never use "any"
- Use Luxon for all date/time operations (DateTime.now().setZone('Asia/Kolkata'))

## Database
- Prisma ORM with PostgreSQL via @prisma/adapter-pg + pg driver
- Supabase PostgreSQL with connection pooling (pgBouncer)
- Two connection strings: DATABASE_URL (pooled, port 6543) and DIRECT_URL (direct, port 5432)
- Schema at prisma/schema.prisma
- Generated client outputs to src/generated/prisma/
- Database client singleton in src/lib/prisma.ts
- Model names should always be plural, lowercase and snake_case. Never use CamelCase.
- Environment uses .env for database connection

## Auth (Supabase)
- Supabase Auth handles user creation, login, sessions, and password management
- Admin model in Prisma links to Supabase `auth.users` via shared UUID (`Admin.id` = `auth.users.id`)
- Auth check pattern: authenticate via Supabase → check if user exists in `admins` table → authorize
- Server-side: use `createClient` from `@supabase/ssr` for cookie-based sessions
- Client-side: use `createBrowserClient` from `@supabase/ssr`
- Middleware: refresh session cookies on every request to `/admin/*`
- Seed admin via `scripts/seed-admin.ts` (uses Supabase Admin API with service role key)

## Environment Variables
- Server vars: no prefix required
- Client vars: must use `NEXT_PUBLIC_` prefix (Next.js convention)
- Validated at startup via Zod schemas in `src/env.ts`
- Import as `import { env } from "@/env"`

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npx tsc --noEmit     # Type-check without emitting

# Database
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma db push                      # Push schema to DB (prototyping)
npx prisma generate                     # Regenerate Prisma client
npx prisma studio                       # Visual DB browser

# Seed
npx tsx scripts/seed-admin.ts           # Create initial admin user (requires SUPABASE_SERVICE_ROLE_KEY)
```

## Architecture

### Two-Stage Data Entry

Public form collects **minimal fields** (Name, Phone, Preferred Date/Time). When the patient arrives at the clinic, the admin **completes the record** with remaining data (DOB, Email, Reason for Visit). This means several fields in the Patient model are nullable despite being important for a complete record.

### Route Structure (App Router)

```
app/
  page.tsx                          — Public patient booking form (no auth, minimal fields)
  admin/
    login/page.tsx                  — Admin login (Supabase Auth)
    dashboard/page.tsx              — Protected: full patient form + data table + CSV export
  api/
    appointments/route.ts           — POST: create patient record (public + admin)
    appointments/[id]/route.ts      — PATCH: admin completes/updates a patient record
    appointments/list/route.ts      — GET: patient list (admin only)
    admin/route.ts                  — POST: create additional admin users (admin only)
    auth/callback/route.ts          — Supabase auth callback (code exchange)
middleware.ts                        — Supabase session refresh + protect /admin/* routes
```

### Key Data Flows

**Patient self-submission (public form, minimal fields):**
Form (Name, Phone, Preferred Date/Time) → client Zod validation → `POST /api/appointments` → server Zod validation → normalize phone → generate patient ID in transaction → insert with `submittedBy: PATIENT` → return patientId

**Admin completes record (clinic visit):**
Admin finds patient by ID or phone → edits record → `PATCH /api/appointments/[id]` → adds DOB, Email, Reason → record now complete

**Admin walk-in entry (full form):**
Same as patient flow but with all fields filled, `submittedBy: ADMIN`, `adminUserId` set from session

### Patient ID Generation

Format: `DDCJ-YYYYMMDD-XXXX` where date is IST and XXXX is a zero-padded daily serial.

- Generated inside a Prisma `$transaction()` with serializable isolation to prevent race conditions
- Uses `DateTime.now().setZone('Asia/Kolkata').toFormat('yyyyMMdd')` for the date component
- On unique constraint violation, retry up to 3 times with incremented serial

### Phone Number Normalization

Strip non-digits → if 12 digits starting with `91`, drop the `91` → validate exactly 10 digits starting with 6-9 → reject all-same-digit patterns. Normalization happens server-side before storage.

## Database

**PostgreSQL** via Prisma + Supabase.

Two models: `Patient` and `Admin`, plus a `SubmissionSource` enum (`PATIENT | ADMIN`).

- `Patient.id` is a UUID primary key; `Patient.patientId` is the human-readable ID (unique)
- `Patient.adminUserId` is nullable (null for patient self-submissions)
- `Patient.dateOfBirth`, `Patient.email`, `Patient.reasonForVisit` are nullable (filled in later by admin for public submissions)
- `Patient.isComplete` boolean flag — false for partial public submissions, true when admin completes all fields
- `Admin.id` matches Supabase `auth.users.id` (no `@default(uuid())` — set from Supabase)
- `Admin` has no `passwordHash` — Supabase Auth manages credentials
- Indexes on `phone`, `createdAt`, `patientId`
- All timestamps stored in UTC; converted to IST for display only
- Phone grouping uses `COUNT(*) OVER (PARTITION BY phone)` window function

## Critical Business Rules

- **Timezone:** Always IST (`Asia/Kolkata`) via Luxon. Never use raw `new Date()` for IST calculations.
- **Appointment window:** `preferredDateTime` must be after now and within 72 hours (server-enforced).
- **Rate limiting:** 3 submissions per IP per hour on the public endpoint. Use Upstash Redis or Vercel KV (serverless-safe).
- **Duplicate detection:** Same phone + name within 5 minutes → reject as duplicate.
- **CSV export:** Always use json2csv (handles commas/quotes in data correctly).

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key (safe for client-side)
SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key (server-only, for admin operations like user creation)
DATABASE_URL               — Supabase pooled connection (Transaction mode, port 6543) with ?pgbouncer=true
DIRECT_URL                 — Supabase direct connection (Session mode, port 5432) for migrations
TZ                         — Asia/Kolkata
RATE_LIMIT_MAX             — Max submissions per window (default 3)
RATE_LIMIT_WINDOW_MS       — Rate limit window in ms (default 3600000)
UPSTASH_REDIS_URL          — (optional) Upstash Redis for rate limiting
UPSTASH_REDIS_TOKEN        — (optional) Upstash Redis token
```

**Getting Supabase credentials:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
5. Go to Project Settings → Database → Connection String
6. Transaction mode (port 6543) → `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1`)
7. Session mode (port 5432) → `DIRECT_URL`

## Future Considerations

**Patient Authentication (Phase 2):** Supabase Auth natively supports magic link and OTP. Patients will authenticate to view prescriptions and appointment history. Add a `patient_accounts` table linking to `auth.users`, or match by phone number. No auth restructuring needed.

**Multi-Tenant SaaS (Phase 3):** The schema is designed so that adding `clinicId` to Patient/Admin tables and making the `DDCJ` prefix configurable per clinic is the primary migration path. Supabase RLS (Row-Level Security) can enforce data isolation at the database level. See `PRDs/PRD_MVP.md` § "Technical Debt & Migration Notes" for the full checklist.
