# DentalisPMS — MVP Implementation Plan

Reference: `PRDs/PRD_MVP.md`

---

## Phase 0: Project Scaffolding ✅

- [x] Initialize Next.js 16 project with TypeScript and App Router
- [x] Install core dependencies: `@prisma/client @prisma/adapter-pg @supabase/supabase-js @supabase/ssr zod luxon json2csv dotenv`
- [x] Install dev dependencies: `@types/luxon @types/json2csv prisma ts-node`
- [x] Initialize Prisma (`npx prisma init --datasource-provider postgresql`)
- [x] Set up Tailwind CSS v4 (pre-configured with create-next-app)
- [x] Create `.env.example` documenting required variables (no secrets)
- [x] Add `postinstall` script for `prisma generate` (needed for Vercel deploys)
- [x] Initialize git repository

---

## Phase 1: Database Schema & ORM Setup

- [x] Define Prisma schema with `Patient`, `Admin` models and `SubmissionSource` enum
  - `Patient`: make `dateOfBirth`, `email`, `reasonForVisit` nullable (two-stage data entry: public form submits minimal fields, admin completes record later)
  - Add `isComplete` Boolean field (default false)
  - `Admin`: email (unique), name, passwordHash
- [x] Add indexes on `phone`, `createdAt`, `patientId`
- [x] Create `scripts/seed-admin.ts` to seed admin via Supabase Admin API
- [x] Create Prisma client singleton (`src/lib/prisma.ts`) with `@prisma/adapter-pg` (Prisma v7 requirement)

### 🔧 MANUAL STEP: Database Setup, Migration & Admin Seeding

**Prerequisites:** A Supabase project (free tier at [supabase.com](https://supabase.com)).

#### Step 1: Add Supabase credentials to `.env`

1. Go to **Supabase Dashboard** → your project → **Project Settings** → **API**
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

#### Step 2: Add database connection strings to `.env`

1. Go to **Project Settings** → **Database** → **Connection String**
2. Copy **Transaction mode** (port `6543`) → `DATABASE_URL`
   - Append `?pgbouncer=true&connection_limit=1` to the URL
3. Copy **Session mode** (port `5432`) → `DIRECT_URL`
4. Replace `[YOUR-PASSWORD]` with your database password in both strings

#### Step 3: Run the initial migration

This creates the `patients` and `admins` tables:
```bash
npx prisma migrate dev --name init
```

#### Step 4: Seed the admin user

This creates a user in Supabase Auth **and** a matching row in the `admins` table:
```bash
npx tsx scripts/seed-admin.ts
```

Default credentials: `admin@dentalis.com` / `admin123` — change before production!

#### Step 5: Verify

1. `npm run dev` → go to `http://localhost:3000/admin/login`
2. Sign in with `admin@dentalis.com` / `admin123`
3. Optionally inspect data: `npx prisma studio`

---

## Phase 2: Shared Utilities ✅

- [x] **Zod schemas** (`src/lib/validations/appointment.ts`):
  - `publicBookingSchema`: name, phone, preferredDateTime (within 72h)
  - `fullPatientSchema`: extends public + email, DOB, reasonForVisit
  - `patchPatientSchema`: all optional, for admin record completion
  - Shared between client and server (Zod v4 via `zod/v4`)
- [x] **Phone normalization** (`src/lib/utils/phone.ts`):
  - `normalizePhoneNumber(input)` — strip non-digits, handle +91 prefix
  - `isValidIndianPhone(phone)` — starts with 6-9, no all-same digits
- [x] **Patient ID generator** (`src/lib/utils/patient-id.ts`):
  - `generatePatientId(tx, retryOffset)` — IST date via Luxon, serializable transaction
  - `createPatientWithId(prisma, data)` — full wrapper with 3-retry on P2002
- [x] **IST date helpers** (`src/lib/utils/date.ts`):
  - `getCurrentISTDate()`, `toIST()`, `formatISTDateTime()`, `formatISTDate()`, `nowIST()`
- [x] **Prisma client singleton** (`src/lib/prisma.ts`) — with `@prisma/adapter-pg` (Prisma v7)

---

## Phase 3: Authentication (Supabase Auth) ✅

- [x] Create Supabase client utilities:
  - `src/lib/supabase/server.ts` — server-side client using `@supabase/ssr` (cookie-based sessions)
  - `src/lib/supabase/client.ts` — browser client using `@supabase/ssr` `createBrowserClient()`
- [x] Create `middleware.ts` at project root:
  - Refresh Supabase session cookies on every request
  - Protect `/admin/*` routes: check session via `getUser()` (server-verified)
  - Redirect unauthenticated requests to `/admin/login`
  - Redirect authenticated users from `/admin/login` → `/admin/dashboard`
  - Note: Does NOT query `admins` table (Edge runtime can't use Prisma). Admin-table authorization happens in dashboard pages/API routes.
- [x] Create auth callback route (`app/api/auth/callback/route.ts`):
  - Exchange auth code for session (Supabase PKCE flow)
- [x] Build admin login page (`app/admin/login/page.tsx`):
  - Email + password form using `supabase.auth.signInWithPassword()`
  - Error display for invalid credentials and callback errors
  - Redirect to `/admin/dashboard` on success
- [x] Update seed script (`scripts/seed-admin.ts`):
  - Uses Supabase Admin API (`supabase.auth.admin.createUser()`) to create auth user
  - Creates matching row in `admins` table with same UUID
  - Requires `SUPABASE_SERVICE_ROLE_KEY`
- [x] Create `src/env.ts`: Zod-based env validation (server + client vars)

> **Why Supabase Auth?** Already using Supabase PostgreSQL — single vendor, single dashboard. Built-in magic link/OTP for future patient auth. RLS integration for future multi-tenant data isolation. No bcrypt, no custom session management. Admin API for user creation via service role key.

---

## Phase 4: Public Patient Booking Form ✅

- [x] Build minimal public form component (`components/PublicBookingForm.tsx`):
  - Fields: Full Name (required), Phone (required), Preferred Date/Time (required)
  - Date picker constrained to next 72 hours (via Luxon IST min/max)
  - Client-side validation using public Zod schema from Phase 2
  - Loading state: disable submit button, show spinner
  - Success state: display generated patient ID + confirmation message
  - Error state: display server errors
  - Mobile-responsive design (patients will use phones)
- [x] Create public page (`app/page.tsx`):
  - Render `PublicBookingForm` with clean, accessible layout
- [x] Implement API route (`app/api/appointments/route.ts` — POST):
  - Detect submission type: if session exists and `submittedByAdmin: true` → admin flow, else → public flow
  - Server-side Zod validation (public schema for patients, full schema for admins)
  - Phone normalization
  - Duplicate detection (same phone + name within 5 min)
  - Rate limiting for public submissions (3/IP/hour via in-memory Map; Upstash Redis swap in Phase 6)
  - Patient ID generation in Prisma transaction
  - Return `{ success, patientId, message }`
- [x] Create rate limiter utility (`src/lib/utils/rate-limit.ts`):
  - In-memory Map-based rate limiter for dev/MVP
  - Cleans expired entries on each check to prevent memory leaks
  - Same interface as future Upstash Redis implementation

---

## Phase 5: Admin Dashboard ✅

- [x] Build full patient form component (`components/AdminPatientForm.tsx`):
  - All fields: Name, Phone, Email, DOB, Preferred Date/Time, Reason for Visit
  - Used for walk-in registration (all fields at once)
  - Client-side validation using full Zod schema
- [x] Build patient data table component (`components/PatientTable.tsx`):
  - Columns: Patient ID, Name, Phone, Email, DOB, Preferred Date/Time (IST), Reason, Submitted Date (IST), Status (Complete/Incomplete)
  - Visual indicator for incomplete records — clickable "Incomplete" badge opens edit modal
  - Column sorting (click to toggle asc/desc)
  - Search/filter input (name, phone, patientId)
  - Phone grouping: badge showing count when > 1, expandable to show grouped records
  - Highlight newly added records (3s animation via parent)
- [x] Build record completion form (`components/CompleteRecordForm.tsx`):
  - Modal form to edit all fields (name, phone, email, DOB, reason)
  - Missing fields highlighted with amber "(missing)" labels
  - Calls `PATCH /api/appointments/[id]`
  - Escape key + backdrop click to close
- [x] Build CSV export button (`components/CSVExportButton.tsx`):
  - Generates CSV client-side using json2csv with explicit fields array
  - Downloads file as `patients-YYYYMMDD.csv` with IST-formatted dates
  - Disabled when no patients
- [x] Build admin management section:
  - "Add Admin" form (name, email, password) in dashboard Admin tab
  - Calls `POST /api/admin` (authenticated)
  - Success/error feedback inline
- [x] Create dashboard page (`app/admin/dashboard/page.tsx` + `DashboardClient.tsx`):
  - Server component: auth check (Supabase session + admins table) → redirect if not admin
  - Client component: tabs (Patients / Walk-in / Admin), patient list fetch, sign out
  - Auto-refresh table after walk-in registration, highlight new record
- [x] Create shared type (`src/types/patient.ts`):
  - `PatientRow` interface with `phoneCount` from SQL window function
- [x] Implement APIs:
  - `GET /api/appointments/list` — authenticated, `$queryRaw` with `COUNT(*) OVER (PARTITION BY phone)::int`, search + sort params, whitelisted sort columns
  - `PATCH /api/appointments/[id]` — authenticated, validates with `patchPatientSchema`, normalizes phone, recalculates `isComplete`
  - `POST /api/admin` — authenticated, creates Supabase auth user + admins record, cleans up on failure

---

## Phase 6: Rate Limiting & Security Hardening

- [ ] Implement rate limiter for `POST /api/appointments` (public submissions only):
  - Use Upstash Redis (`@upstash/ratelimit`) or Vercel KV — serverless-compatible
  - 3 requests per IP per hour
  - Return 429 with clear message on limit
  - Skip rate limiting for authenticated admin sessions
- [ ] Input sanitization: trim whitespace, remove control characters on all text fields
- [ ] Verify React's default XSS escaping is not bypassed (no `dangerouslySetInnerHTML`)
- [ ] Set secure cookie flags in production NextAuth config
- [ ] Ensure HTTPS in production (Vercel handles this automatically)

---

## Phase 7: Deployment (Vercel)

- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables in Vercel dashboard
- [ ] Provision managed PostgreSQL (Neon free tier or Vercel Postgres)
- [ ] Set `DATABASE_URL` to the managed PostgreSQL connection string
- [ ] Configure Prisma for serverless: add `?pgbouncer=true` to connection string if needed
- [ ] Add `postinstall` script to `package.json`: `"postinstall": "prisma generate"`
- [ ] Run `prisma migrate deploy` as part of build or via Vercel CLI
- [ ] Seed initial admin user on first deployment
- [ ] Verify production deployment works end-to-end
- [ ] Set up custom domain (optional)

---

## Phase 8: Polish & Edge Cases

- [ ] Form UX:
  - Disable autocomplete on phone/email fields
  - Native date/time inputs on mobile
  - Max length on name field (100 chars)
  - Truncate long names in table with tooltip
- [ ] Error handling:
  - Prisma transaction failure → user-friendly "try again" message
  - Network timeout → "submission may be processing" message
  - Patient ID unique constraint retry logic (up to 3 attempts)
- [ ] Empty states:
  - Dashboard with zero patients → helpful message
  - CSV export with zero records → headers-only file or message
- [ ] Loading states for all async operations

---

## Phase 9: Testing

- [ ] Patient form: valid submission, missing required fields, invalid phone, date > 72h, past date, double submit
- [ ] Admin: login valid/invalid, session timeout, walk-in entry, complete a partial record, add new admin
- [ ] Patient ID: first of day (0001), sequential IDs, midnight IST transition
- [ ] Phone grouping: multiple patients same phone, unique phone, formatting variations
- [ ] CSV export: with records, zero records, special characters in data
- [ ] Rate limiting: exceed limit, different IPs, admin bypasses limit
- [ ] Two-stage flow: patient submits minimal → admin completes record → verify data integrity
- [ ] Production: verify Vercel deployment, check cold start times, test with production DB

---

## File Structure (Target)

```
src/
  app/
    page.tsx                            # Public booking form (minimal fields)
    layout.tsx                          # Root layout
    admin/
      login/page.tsx                    # Admin login
      dashboard/page.tsx                # Admin dashboard
    api/
      appointments/
        route.ts                        # POST: create patient record
        [id]/route.ts                   # PATCH: update/complete patient record
        list/route.ts                   # GET: patient list (admin)
      admin/route.ts                    # POST: create admin user
      auth/
        callback/route.ts               # Supabase auth callback (code exchange)
  components/
    PublicBookingForm.tsx                # Minimal public form (Name, Phone, DateTime)
    AdminPatientForm.tsx                # Full patient form for walk-ins
    CompleteRecordForm.tsx              # Form to fill in missing fields
    PatientTable.tsx                    # Admin data table with phone grouping
    CSVExportButton.tsx                 # CSV export
  lib/
    prisma.ts                           # Prisma client singleton
    supabase/
      server.ts                         # Server-side Supabase client (cookie sessions)
      client.ts                         # Browser-side Supabase client
    validations/
      appointment.ts                    # Zod schemas (public + full)
    utils/
      phone.ts                          # Phone normalization + validation
      patient-id.ts                     # Patient ID generation
      date.ts                           # IST date helpers
      rate-limit.ts                     # Upstash Redis rate limiter
scripts/
  seed-admin.ts                         # Seed initial admin
prisma/
  schema.prisma                         # Database schema
middleware.ts                           # Supabase session refresh + admin route protection
```

---

## Implementation Order

Start with Phases 0–2 (foundation), then Phase 3 (auth), then Phase 4 (core: public form), then Phase 5 (admin dashboard). Phase 6 (security) can happen in parallel with Phase 5. Phase 7 (Vercel deploy) once core features work. Phase 8 (polish) and Phase 9 (testing) follow.
