# Product Requirements Document: Dental Clinic Appointment Booking System

## Overview
A cloud-hosted SaaS web application for collecting patient appointment requests at dental clinics, usable by both patients and clinic administrators. **Designed as a foundation for future multi-tenant SaaS expansion.**

> **Privacy commitment:** We never sell or share patient data. Data isolation is enforced at the application layer, with encryption at rest provided by the managed database.

## Core Objectives
- Enable patient self-service appointment booking (public form with minimal fields)
- Provide admin interface for walk-in patient registration and record completion
- Maintain patient database with unique identification
- Allow admin to view and export patient data
- Build architecture that supports multi-tenancy for future SaaS model

## Deployment Model
- **Hosting:** Vercel (Next.js app) + managed PostgreSQL (Neon / Supabase / Railway)
- **Public booking form:** Accessible to anyone via the app URL
- **Admin dashboard:** Protected by authentication (Supabase Auth)
- **Updates:** Centralized — push to main branch, Vercel deploys automatically

---

## User Roles

### Patient
- Access public-facing form
- Submit appointment details
- No authentication required

### Admin
- Access admin dashboard (authentication required)
- Enter patient details for walk-ins (full form)
- Complete partial records from public submissions (add DOB, email, reason)
- Create additional admin users
- View patient database
- Export data to CSV
- Full system access

---

## Features

### 1. Patient Booking Form (Public — Minimal Fields)
**Fields:**
- Full Name (required)
- Phone Number (required)
- Preferred Appointment Date/Time (required, max 3 days from today)

> **Note:** Email, DOB, and Reason for Visit are intentionally excluded from the public form to minimize friction. These are collected by the admin when the patient arrives at the clinic (see Two-Stage Data Entry below).

**Behavior:**
- Simple, accessible form design optimized for mobile
- Form validation (including 3-day limit check)
- Success confirmation on submission with patient ID displayed
- No login required
- All times in IST

### 1b. Two-Stage Data Entry
**Flow:**
1. Patient submits minimal info via public form (Name, Phone, Preferred Date/Time)
2. Record is created with a Patient ID but marked as incomplete
3. When patient arrives at clinic, admin completes the record: adds DOB, Email, Reason for Visit
4. Admin can also do full walk-in registration with all fields at once

**Admin Record Completion Fields (added later):**
- Email (optional)
- Date of Birth
- Reason for Visit (optional, textarea)

### 2. Admin Dashboard
**Components:**
- Same form as patient view for walk-in registration
- Patient database table view
- CSV export functionality

**Table Columns:**
- Patient ID (system-generated)
- Name
- Phone Number
- Email
- Date of Birth
- Preferred Appointment Date/Time (IST)
- Reason for Visit
- Submission Date/Time (IST)
- Linked Patients indicator (if phone number matches)

**Table Features:**
- Sorting by columns
- Search/filter
- Export to CSV button

### 3. Patient Management System
**Auto-generated Patient ID:**
- Format: `DDCJ-YYYYMMDD-XXXX` (e.g., DDCJ-20260126-0001)
- Sequential daily numbering based on IST timezone
- DDCJ prefix (clinic identifier, will support custom prefixes in SaaS version)

**Phone Number Grouping:**
- Visual indicator when multiple entries share same phone number
- Display count of linked records
- Expandable view to show grouped entries

---

## Data Flow & Storage Architecture (Phase 1)

### Database Structure

**Technology:** PostgreSQL with Prisma ORM (managed instance via Neon / Supabase / Railway)

**Schema Definition:**

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Patient {
  id                String           @id @default(uuid())
  patientId         String           @unique // DDCJ-YYYYMMDD-XXXX
  name              String
  phone             String           // Indexed for grouping queries
  email             String?          // Nullable: filled by admin later for public submissions
  dateOfBirth       DateTime?        @db.Date // Nullable: filled by admin later
  preferredDateTime DateTime
  reasonForVisit    String?          @db.Text // Nullable: filled by admin later
  submittedBy       SubmissionSource
  adminUserId       String?
  isComplete        Boolean          @default(false) // true when admin has filled all fields
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  admin Admin? @relation(fields: [adminUserId], references: [id])

  @@index([phone]) // For phone number grouping
  @@index([createdAt]) // For efficient sorting
  @@index([patientId]) // For lookups
  @@map("patients")
}

model Admin {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  patients Patient[]

  @@map("admins")
}

enum SubmissionSource {
  PATIENT
  ADMIN
}
```

> **Note:** The `isComplete` flag distinguishes partial public submissions (Name + Phone + DateTime only) from fully filled records. Admin walk-in entries are created with `isComplete: true` since all fields are provided upfront.

### Data Storage Details

**Patient Record Storage:**
- **Primary Key:** UUID (auto-generated)
- **Patient ID:** Generated on insert, unique constraint enforced
- **Phone Number:** Stored as string (10 digits), indexed for fast grouping
- **Dates:** All stored in UTC, converted to IST for display
- **Timestamps:** `createdAt` auto-generated on insert, `updatedAt` auto-updated

**Indexing Strategy:**
1. `phone` - For phone number grouping queries
2. `createdAt` - For sorting and filtering by submission date
3. `patientId` - For quick lookups
4. `id` (primary key) - Automatic unique index

**Data Constraints:**
- `patientId` must be unique across all records
- `email` in Admin table must be unique
- `adminUserId` can be null (for patient submissions)
- Foreign key constraint: `adminUserId` references `Admin.id`

---

## Patient Data Entry Flow

### Flow 1: Patient Self-Submission (Public Form)

```
┌─────────────────────────────────────────────────────────┐
│ PATIENT VISITS PUBLIC URL (/)                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Form Rendered (Client-Side)                          │
│    - Load current IST date/time                          │
│    - Set max date = current date + 3 days                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Patient Fills Form (Minimal)                          │
│    - Name, Phone                                         │
│    - Preferred Date/Time (within 3 days)                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Client-Side Validation                                │
│    ✓ Required fields filled (name, phone, datetime)      │
│    ✓ Phone is 10 digits                                  │
│    ✓ Preferred date within 3 days                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. POST to /api/appointments                             │
│    Body: {                                               │
│      name, phone, preferredDateTime                      │
│    }                                                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 5. API Route Handler                                     │
│    - Validate request body (server-side)                 │
│    - Sanitize inputs                                     │
│    - Check rate limiting (prevent spam)                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Generate Patient ID                                   │
│    - Get current IST date: YYYYMMDD                      │
│    - Query: COUNT today's records (by patientId prefix)  │
│    - Serial = count + 1, padded to 4 digits              │
│    - Result: DDCJ-20260126-0001                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Database Transaction                                  │
│    BEGIN TRANSACTION                                     │
│      INSERT INTO patients (                              │
│        id: uuid(),                                       │
│        patientId: generated_id,                          │
│        name, phone, email, dateOfBirth,                  │
│        preferredDateTime,                                │
│        reasonForVisit,                                   │
│        submittedBy: 'PATIENT',                           │
│        adminUserId: null,                                │
│        createdAt: now()                                  │
│      )                                                   │
│    COMMIT                                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Return Success Response                               │
│    {                                                     │
│      success: true,                                      │
│      patientId: "DDCJ-20260126-0001",                   │
│      message: "Appointment request submitted"            │
│    }                                                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Show Success Message to Patient                       │
│    - Display patient ID                                  │
│    - Confirmation message                                │
│    - Clear form                                          │
└─────────────────────────────────────────────────────────┘
```

### Flow 2: Admin Entry (Walk-in Patient)

```
┌─────────────────────────────────────────────────────────┐
│ ADMIN VISITS /admin/dashboard                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Check Authentication                                  │
│    - NextAuth session check                              │
│    - If not authenticated → redirect to /admin/login     │
│    - If authenticated → proceed                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Dashboard Loads                                       │
│    - Render patient entry form (same as public)          │
│    - Fetch and display patient table                     │
│    - Show admin name/email                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Admin Fills Form (Walk-in Patient)                   │
│    - Collects patient info verbally                      │
│    - Enters into form                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Client-Side Validation (same as Flow 1)              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 5. POST to /api/appointments                             │
│    Body: {                                               │
│      ...patientData,                                     │
│      submittedByAdmin: true                              │
│    }                                                     │
│    Headers: {                                            │
│      Cookie: session token                               │
│    }                                                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 6. API Route Handler                                     │
│    - Validate session (get admin user ID)                │
│    - Validate request body                               │
│    - Sanitize inputs                                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Generate Patient ID (same as Flow 1)                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Database Transaction                                  │
│    BEGIN TRANSACTION                                     │
│      INSERT INTO patients (                              │
│        id: uuid(),                                       │
│        patientId: generated_id,                          │
│        ...patientData,                                   │
│        submittedBy: 'ADMIN',                             │
│        adminUserId: session.user.id,                     │
│        createdAt: now()                                  │
│      )                                                   │
│    COMMIT                                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Return Success + Refresh Table                        │
│    - Return patient ID                                   │
│    - Clear form                                          │
│    - Automatically refresh patient table                 │
│    - Highlight newly added record                        │
└─────────────────────────────────────────────────────────┘
```

### Phone Number Grouping Query Flow

```
┌─────────────────────────────────────────────────────────┐
│ Admin Views Patient Table                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ API: GET /api/appointments/list                          │
│ (Authenticated)                                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Database Query:                                          │
│                                                          │
│ SELECT                                                   │
│   p.*,                                                   │
│   COUNT(*) OVER (PARTITION BY phone) as phone_count      │
│ FROM patients p                                          │
│ ORDER BY createdAt DESC                                  │
│                                                          │
│ (Uses indexed phone column for efficiency)              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Transform Response:                                      │
│ [                                                        │
│   {                                                      │
│     ...patientData,                                      │
│     phoneCount: 3, // Number with same phone             │
│     hasLinkedPatients: true // phoneCount > 1            │
│   }                                                      │
│ ]                                                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ UI Rendering:                                            │
│ - Show badge "3 linked" if phoneCount > 1                │
│ - Clickable to expand/show all with same phone           │
└─────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Handling

### 1. Patient ID Generation Edge Cases

**Edge Case 1.1: Concurrent Submissions at Same Second**
- **Scenario:** Two patients submit forms simultaneously
- **Risk:** Duplicate serial numbers for same date
- **Solution:** 
  - Use database transaction with row-level locking
  - Query with `SELECT FOR UPDATE` on daily count
  - Alternative: Use atomic increment on Redis counter
  
```typescript
// Safe Patient ID Generation
async function generatePatientId() {
  return await prisma.$transaction(async (tx) => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `DDCJ-${today}`;
    
    // Lock and count today's records
    const todayCount = await tx.patient.count({
      where: {
        patientId: {
          startsWith: prefix
        }
      }
    });
    
    const serial = (todayCount + 1).toString().padStart(4, '0');
    return `${prefix}-${serial}`;
  });
}
```

**Edge Case 1.2: Date Transition at Midnight (IST)**
- **Scenario:** Submission happens exactly at 23:59:59 IST
- **Risk:** Patient ID might use wrong date if server time differs
- **Solution:**
  - Always use IST for date calculation
  - Store server timezone in environment variable
  - Convert server time to IST before generating ID

```typescript
import { DateTime } from 'luxon';

function getCurrentISTDate() {
  return DateTime.now().setZone('Asia/Kolkata').toFormat('yyyyMMdd');
}
```

**Edge Case 1.3: Manual Clock Changes/Daylight Saving**
- **Scenario:** Server clock adjusted backward
- **Risk:** Could create duplicate IDs
- **Solution:**
  - IST doesn't observe daylight saving (stable)
  - Use database timestamp as source of truth
  - Validate generated ID doesn't exist before insert

### 2. Phone Number Edge Cases

**Edge Case 2.1: Phone Number Formatting Variations**
- **Scenario:** User enters `+91-98765-43210` or `9876543210` or `(987) 654-3210`
- **Risk:** Same number stored differently, grouping fails
- **Solution:**
  - Normalize on server: strip all non-digits
  - Store only 10 digits (last 10 if includes country code)
  - Validate length = 10 before save

```typescript
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, ''); // Remove non-digits
  
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2); // Remove country code
  }
  
  throw new Error('Invalid phone number format');
}
```

**Edge Case 2.2: Duplicate Phone with Different People**
- **Scenario:** Family members share a phone number
- **Risk:** Incorrectly assuming they're the same person
- **Solution:**
  - Show grouping as "linked by phone number"
  - Don't auto-merge records
  - Display all fields in expanded view for admin to decide
  - In future: Add "relationship" field

**Edge Case 2.3: Invalid Phone Numbers**
- **Scenario:** Patient enters `0000000000` or `1111111111`
- **Risk:** Storing clearly fake numbers
- **Solution:**
  - Add regex validation: must start with 6-9 (valid Indian mobile)
  - Block repeated digits (all same)
  - Optional: Add warning for suspicious patterns

```typescript
function validateIndianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(normalized)) return false;
  
  // Block repeated digits
  if (/^(\d)\1{9}$/.test(normalized)) return false;
  
  return true;
}
```

### 3. Date/Time Edge Cases

**Edge Case 3.1: Preferred Date Exactly 3 Days Away**
- **Scenario:** Today is Jan 26, user selects Jan 29 at 11:59 PM
- **Risk:** Ambiguity - is it within 3 days?
- **Solution:**
  - Clarify: "3 days" means up to 72 hours from now
  - Validation: `preferredDateTime <= now() + 72 hours`
  - UI shows helper text: "Select within next 3 days"

**Edge Case 3.2: Past Date Selection**
- **Scenario:** User's device clock is wrong, allows past date
- **Risk:** Booking appointment in the past
- **Solution:**
  - Server-side validation: `preferredDateTime > now()`
  - Return clear error: "Selected time is in the past"
  - Client-side: disable past dates in picker

**Edge Case 3.3: Clinic Closed Days**
- **Scenario:** User selects Sunday (if clinic closed)
- **Risk:** Booking when clinic isn't open
- **Solution (Future):**
  - Current: Allow any date/time
  - Phase 2: Add clinic hours configuration
  - Block selection of closed days/hours

### 4. Form Submission Edge Cases

**Edge Case 4.1: Double Submit (User Clicks Twice)**
- **Scenario:** Form submits twice due to double-click
- **Risk:** Duplicate patient records
- **Solution:**
  - Disable submit button after first click
  - Show loading state
  - Optional: Idempotency key (hash of form data)
  - Check for duplicate within last 5 minutes (same phone + name + DOB)

```typescript
// API route idempotency check
async function checkDuplicate(data: PatientInput) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const existing = await prisma.patient.findFirst({
    where: {
      phone: data.phone,
      name: data.name,
      dateOfBirth: data.dateOfBirth,
      createdAt: { gte: fiveMinutesAgo }
    }
  });
  
  if (existing) {
    throw new Error('Duplicate submission detected');
  }
}
```

**Edge Case 4.2: Network Failure Mid-Submit**
- **Scenario:** Request sent but response not received
- **Risk:** User resubmits, creates duplicate
- **Solution:**
  - Use idempotency check above
  - Show "Submitting..." state with timeout
  - After timeout: "Submission may be processing. Check your patient ID or contact clinic."

**Edge Case 4.3: Browser Auto-fill Wrong Data**
- **Scenario:** Browser fills email/phone from different person
- **Risk:** Wrong contact info stored
- **Solution:**
  - Disable autocomplete on sensitive fields
  - Show confirmation summary before submit
  - Allow admin to edit records (Phase 2)

### 5. Database Edge Cases

**Edge Case 5.1: Database Connection Lost During Transaction**
- **Scenario:** DB connection drops while inserting
- **Risk:** Partial data or failed insert
- **Solution:**
  - Prisma handles transaction rollback automatically
  - Return 500 error to user
  - Log error for admin review
  - User sees: "Submission failed, please try again"

**Edge Case 5.2: Disk Space Full**
- **Scenario:** Database can't write due to full disk
- **Risk:** Application crashes or data loss
- **Solution:**
  - Set up disk space monitoring alerts (>80% usage)
  - Implement database size limits (quotas)
  - Archive old records (if retention policy added)

**Edge Case 5.3: Unique Constraint Violation (Patient ID)**
- **Scenario:** Generated ID already exists (race condition)
- **Risk:** Insert fails
- **Solution:**
  - Retry generation up to 3 times with incremented serial
  - If still fails after 3 tries: use UUID fallback
  - Log incident for investigation

### 6. CSV Export Edge Cases

**Edge Case 6.1: Special Characters in Patient Data**
- **Scenario:** Name contains comma: "Kumar, Rajesh"
- **Risk:** CSV breaks into extra columns
- **Solution:**
  - Properly escape fields with commas/quotes
  - Use CSV library (e.g., `json2csv`) not manual string concat
  - Enclose all fields in quotes

**Edge Case 6.2: Large Dataset (10,000+ Records)**
- **Scenario:** Admin exports all records
- **Risk:** Server timeout or memory overflow
- **Solution:**
  - Implement streaming CSV generation
  - Or limit export to 1000 records at a time
  - Add date range filter for exports

**Edge Case 6.3: No Records to Export**
- **Scenario:** Fresh system, zero patients
- **Risk:** Empty file confuses admin
- **Solution:**
  - Return CSV with headers only
  - Or show message: "No records to export"

### 7. Authentication Edge Cases

**Edge Case 7.1: Session Expires During Form Fill**
- **Scenario:** Admin fills form for 10 minutes, session times out
- **Risk:** Submit fails, data lost
- **Solution:**
  - Set session timeout to 24 hours (for admin)
  - Show warning 5 minutes before expiry
  - Save form state to localStorage (auto-recovery)

**Edge Case 7.2: Concurrent Admin Logins**
- **Scenario:** Same admin email logged in from 2 devices
- **Risk:** Unclear if this should be allowed
- **Solution:**
  - Allow multiple sessions (Phase 1)
  - Track session devices (Phase 2 security enhancement)

**Edge Case 7.3: Forgot Password (No Email System)**
- **Scenario:** Admin forgets password
- **Risk:** Locked out of system
- **Solution:**
  - Manual password reset via database
  - Or provide password reset CLI script
  - Phase 2: Implement email-based reset

### 8. UI/UX Edge Cases

**Edge Case 8.1: Very Long Names**
- **Scenario:** Patient name: "Dr. Srinivasa Ramanujan Iyengar Krishnan Subramanian"
- **Risk:** UI layout breaks
- **Solution:**
  - Set max length: 100 characters (validation)
  - Truncate in table view with tooltip
  - Show full name on hover/click

**Edge Case 8.2: Mobile Keyboard Covers Date Picker**
- **Scenario:** User on mobile can't see date picker
- **Risk:** Poor UX, abandonment
- **Solution:**
  - Use native date/time inputs on mobile
  - Ensure page scrolls when keyboard opens
  - Test on iOS Safari and Chrome Android

**Edge Case 8.3: Slow Network (Form Takes 10s to Submit)**
- **Scenario:** Patient on 2G network
- **Risk:** User thinks form is broken
- **Solution:**
  - Show clear loading spinner
  - Disable form during submission
  - Add progress indicator or estimated time

### 9. Data Integrity Edge Cases

**Edge Case 9.1: Age Validation (DOB)**
- **Scenario:** DOB entered as Jan 1, 2030 (future)
- **Risk:** Invalid age stored
- **Solution:**
  - Validate: `dateOfBirth < today`
  - Optional: Validate reasonable range (e.g., < 120 years old)
  - Show age on form for verification

**Edge Case 9.2: Minors (Under 18)**
- **Scenario:** Patient is 10 years old
- **Risk:** May need guardian consent (legal)
- **Solution:**
  - Phase 1: Allow all ages
  - Phase 2: Add guardian info field if age < 18
  - Check local regulations

**Edge Case 9.3: Email Format Edge Cases**
- **Scenario:** Email like `test@localhost` or `user@domain`
- **Risk:** Invalid email stored
- **Solution:**
  - Use robust email regex validation
  - Require TLD (`.com`, `.in`, etc.)
  - Optional: Send verification email (Phase 2)

### 10. Rate Limiting & Security

**Edge Case 10.1: Spam Submissions**
- **Scenario:** Bot submits 1000 forms in 1 minute
- **Risk:** Database flooded, legitimate users affected
- **Solution:**
  - Implement rate limiting: 3 submissions per IP per hour
  - Use CAPTCHA for public form (optional)
  - Block IPs with suspicious patterns

**Edge Case 10.2: SQL Injection Attempts**
- **Scenario:** User enters: `'; DROP TABLE patients; --`
- **Risk:** Database compromised
- **Solution:**
  - Prisma ORM prevents SQL injection (parameterized queries)
  - Still sanitize inputs (trim whitespace, remove control characters)
  - Validate all inputs server-side

**Edge Case 10.3: XSS in Reason for Visit**
- **Scenario:** User enters: `<script>alert('hack')</script>`
- **Risk:** Executed when admin views table
- **Solution:**
  - Sanitize HTML on output (React does this by default)
  - Store raw text, escape when rendering
  - Use `DOMPurify` for extra safety

---

## Technical Requirements

### Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (managed — Neon / Supabase / Railway)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth (email/password for admin; future magic link/OTP for patients)
- **Date/Time:** Luxon (for timezone handling)
- **CSV Export:** `json2csv` library
- **Form Validation:** Zod (for type-safe validation)
- **Rate Limiting:** Upstash Redis or Vercel KV (serverless-compatible)
- **Deployment:** Vercel (auto-deploy from GitHub)

### Business Rules
- **Timezone:** IST (Indian Standard Time) for all date/time operations
- **Appointment Date Range:** Maximum 3 days from current date/time
- **Authentication:** Single admin role with full access
- **Data Retention:** Records stored indefinitely
- **Patient ID Prefix:** DDCJ (hardcoded for now, configurable in future)
- **Phone Number Format:** 10 digits, Indian mobile (starts with 6-9)
- **Rate Limiting:** 3 submissions per IP per hour (public form)

### Environment Variables
```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/dental_clinic"

# Supabase Auth & API
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Timezone
TZ="Asia/Kolkata"

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_URL="https://..."
UPSTASH_REDIS_TOKEN="..."
RATE_LIMIT_MAX=3
RATE_LIMIT_WINDOW_MS=3600000 # 1 hour
```

---

## Success Criteria
- Patients can successfully submit appointments without barriers
- Admin can log in and access dashboard
- Patient ID generation works correctly with DDCJ prefix (IST-based)
- No duplicate Patient IDs even under concurrent load
- Phone number grouping displays accurately
- CSV export contains all relevant data
- Forms validate properly (including 3-day limit)
- All timestamps correctly display in IST
- Edge cases handled gracefully with clear error messages
- System handles 100 concurrent submissions without issues

---

## Current Scope (Phase 1)
- Single clinic deployment (DDCJ)
- Basic appointment collection
- Admin dashboard with export
- Patient ID generation
- Phone number grouping
- Basic form validation
- Error handling for all edge cases

---

## Out of Scope (Future Phases)

### Phase 2 - Enhanced Features
- **Patient authentication** (optional): magic link or OTP via Auth.js v5, allowing patients to view their prescriptions, appointment history, and treatment details
- Appointment confirmation/scheduling workflow
- Email/SMS notifications
- Calendar integration
- Appointment status tracking
- Appointment modification/cancellation
- Record editing by admin
- Guardian info for minors

### Phase 3 - SaaS Transformation
- Multi-clinic support
- Clinic onboarding flow
- Subscription management
- Custom clinic codes/branding
- Clinic-specific admin roles
- Per-clinic data isolation
- Billing and payment integration

---

## Security Considerations
- Admin authentication required for dashboard access
- API routes protected with authentication middleware
- Input sanitization to prevent SQL injection (Prisma handles this)
- Rate limiting on form submissions (prevent spam)
- HTTPS required in production
- XSS prevention (React automatic escaping + DOMPurify)
- CSRF protection (Supabase Auth built-in)
- Session security (httpOnly cookies, secure flag in prod, Supabase manages JWT refresh)
- Database supports Supabase RLS (Row-Level Security) for future multi-tenant data isolation

---

## Testing Checklist

### Patient Form (Public)
- [ ] Submit with all valid data
- [ ] Submit with missing required fields
- [ ] Submit with invalid phone (9 digits, starts with 5, etc.)
- [ ] Submit with invalid email format
- [ ] Submit with DOB in future
- [ ] Submit with preferred date > 3 days away
- [ ] Submit with preferred date in past
- [ ] Double-click submit button rapidly
- [ ] Submit on slow network
- [ ] Submit from mobile device

### Admin Dashboard
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Session timeout handling
- [ ] Submit walk-in patient (all fields valid)
- [ ] View patient table with sorting
- [ ] View patient table with phone grouping
- [ ] Export CSV with records
- [ ] Export CSV with zero records
- [ ] Search/filter patients

### Patient ID Generation
- [ ] Generate first ID of the day (serial 0001)
- [ ] Generate sequential IDs (0001, 0002, 0003)
- [ ] Generate ID at midnight transition
- [ ] Generate IDs concurrently (load test)
- [ ] Verify no duplicates across 1000 records

### Phone Number Grouping
- [ ] Insert 3 patients with same phone
- [ ] Verify grouping count shows "3"
- [ ] Expand grouped view
- [ ] Insert patient with unique phone (count = 1)
- [ ] Test with phone formatted differently

---

## Technical Debt & Migration Notes
When converting to multi-tenant SaaS:
1. Add `Clinic` model and `clinicId` foreign key to Patient and Admin tables
2. Update Patient ID generation to accept dynamic clinic code prefixes
3. Implement tenant isolation middleware (filter all queries by `clinicId`)
4. Add clinic onboarding and management UI
5. Implement clinic-scoped authentication (admin belongs to a clinic)
6. Migrate existing DDCJ records to a new clinic entity
7. Add row-level security or application-level enforcement for data isolation

---

## Performance Benchmarks (Phase 1)

- **Form Submission Response Time:** < 500ms (p95)
- **Dashboard Load Time:** < 1s (p95)
- **CSV Export (1000 records):** < 3s
- **Patient Table Load:** < 500ms (p95)
- **Concurrent Submissions:** Support 100 req/sec without errors
- **Database Query Time:** < 100ms for indexed queries

---

## Monitoring & Logging

### Key Metrics to Track
- Form submission success/failure rate
- Patient ID generation failures
- Duplicate submission attempts
- API response times
- Database query performance
- Admin login attempts (success/failure)
- CSV export frequency
- Phone number grouping query performance

### Error Logging
- All unhandled exceptions
- Patient ID generation failures
- Database connection errors
- Authentication failures
- Rate limit violations

---

**Document Status:** Approved
**Version:** 3.0
**Last Updated:** 2026-02-21
**Timezone:** IST (UTC+5:30)
**Architecture:** Cloud SaaS (Vercel + managed PostgreSQL)
**Future Vision:** Multi-tenant SaaS platform