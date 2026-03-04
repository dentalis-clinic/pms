# DentalisPMS Code Review Report

Date: 2026-03-04
Reviewer: Codex (GPT-5)
Scope: `src/`, `prisma/`, `middleware.ts`, and `scripts/seed-admin.ts`
Checks run:
- `npm run lint` (failed: 1 error, 5 warnings)
- `npm run build` (passed)

## Executive Summary

- Total findings: 19
- P1 (critical/high): 4
- P2 (medium): 10
- P3 (low): 5

Primary risk areas:
- Slot booking integrity under concurrency
- Inconsistent authorization boundaries in mixed public/admin flows
- Public data exposure and weak abuse controls
- Dead/duplicate UI code paths increasing maintenance risk

## Findings

### F-01 [P1] Non-atomic slot conflict checks allow double-booking under concurrency
Category: Correctness, Data Integrity

Evidence:
- `src/app/api/appointments/route.ts:167`
- `src/app/api/appointments/route.ts:188`
- `src/app/api/appointments/confirm/route.ts:110`
- `src/app/api/appointments/confirm/route.ts:131`
- `src/app/api/appointments/confirm/route.ts:184`
- `src/app/api/appointments/confirm/route.ts:203`
- `src/app/api/appointments/confirm/route.ts:237`
- `src/app/api/appointments/confirm/route.ts:256`

Impact:
- Two requests can both pass conflict checks and write appointments for the same slot.

Recommendation:
- Enforce slot uniqueness at DB level (or transactional lock strategy) and handle conflict errors as `409`.

---

### F-02 [P1] `/api/appointments/follow-up` bypasses slot conflict validation
Category: Correctness, Data Integrity

Evidence:
- `src/app/api/appointments/follow-up/route.ts:57`

Impact:
- Follow-up flow can create conflicting appointments even when other flows block conflicts.

Recommendation:
- Reuse the same conflict guard used in create/confirm flows (with optional explicit override policy).

---

### F-03 [P1] Admin-submission branch in public appointments route lacks admin-role verification
Category: Security, Authorization

Evidence:
- `src/app/api/appointments/route.ts:23`
- `src/app/api/appointments/route.ts:26`
- `src/app/api/appointments/route.ts:191`
- `src/app/api/appointments/route.ts:195`

Impact:
- Any authenticated Supabase user (not necessarily an admin) can send `submittedByAdmin: true`, bypass public rate limiting, and create records marked as admin submissions.

Recommendation:
- Require `prisma.admin.findUnique({ id: user.id })` for admin submission path.

---

### F-04 [P1] Public phone-check endpoint supports patient enumeration and exposes internal patient UUIDs
Category: Security, Privacy

Evidence:
- `src/app/api/phone-check/route.ts:10`
- `src/app/api/phone-check/route.ts:50`
- `src/app/api/phone-check/route.ts:80`
- `src/app/api/phone-check/route.ts:97`

Impact:
- Unauthenticated callers can probe whether a phone exists and receive patient UUIDs and pending status metadata.

Recommendation:
- Return opaque short-lived tokens instead of patient UUIDs, minimize metadata, and add stronger anti-enumeration controls.

---

### F-05 [P2] Appointment PATCH route can reschedule into occupied slots
Category: Correctness

Evidence:
- `src/app/api/appointments/[id]/route.ts:90`
- `src/app/api/appointments/[id]/route.ts:93`

Impact:
- Admin edits can violate the no-double-booking rule.

Recommendation:
- Apply the same conflict check policy as create/confirm before update.

---

### F-06 [P2] Double-book override UI path is broken (booked slots are disabled before conflict callback)
Category: Correctness, UX

Evidence:
- `src/components/ui/DateSlotPicker/SlotGrid.tsx:115`
- `src/components/ui/DateSlotPicker/SlotButton.tsx:65`

Impact:
- Admin cannot trigger override dialog by clicking booked slots.

Recommendation:
- Keep booked slots clickable when `allowOverride` is enabled, and route click through `onConflict`.

---

### F-07 [P2] `document.querySelector("form")` may submit the wrong form
Category: Correctness

Evidence:
- `src/components/admin/AppointmentSlideOver.tsx:511`

Impact:
- On pages with other forms (for example Settings), override confirmation may submit unrelated forms.

Recommendation:
- Use a form ref scoped to the slide-over form (`formRef.current?.requestSubmit()`).

---

### F-08 [P2] Admin delete flow is non-atomic across Prisma and Supabase Auth
Category: Correctness, Reliability

Evidence:
- `src/app/api/admin/[id]/route.ts:194`
- `src/app/api/admin/[id]/route.ts:201`

Impact:
- Partial failure can leave orphaned auth users or inconsistent admin state.

Recommendation:
- Use compensating transaction strategy (delete auth first with rollback plan, or queue/saga-style reconciliation).

---

### F-09 [P2] Rate limiting is in-memory and keyed by untrusted forwarded IP
Category: Security, Abuse Resistance

Evidence:
- `src/lib/utils/rate-limit.ts:13`
- `src/app/api/appointments/route.ts:28`
- `src/app/api/phone-check/route.ts:14`

Impact:
- Limits reset on restart/instance changes and may be bypassed with spoofed headers.

Recommendation:
- Move to shared rate-limit backend (Redis/Upstash) and trust proxy headers only from known infrastructure.

---

### F-10 [P2] Public availability endpoint exposes per-slot booking counts
Category: Security, Information Disclosure

Evidence:
- `src/app/api/appointments/availability/route.ts:19`
- `src/app/api/appointments/availability/route.ts:29`
- `src/app/api/appointments/availability/route.ts:116`

Impact:
- External users can scrape occupancy density and operational patterns.

Recommendation:
- Return boolean availability for public callers; reserve counts for authenticated admin endpoints.

---

### F-11 [P2] Default admin seed script contains hardcoded default credentials
Category: Security

Evidence:
- `scripts/seed-admin.ts:26`
- `scripts/seed-admin.ts:27`

Impact:
- Risk of weak/default credentials being used in non-dev environments.

Recommendation:
- Require credentials via environment variables and block execution unless explicitly in local/dev mode.

---

### F-12 [P2] Lint gate currently fails due setState-in-effect rule violation
Category: Quality, Maintainability

Evidence:
- `src/components/ui/DateSlotPicker/index.tsx:65`

Impact:
- CI/lint-gated merges can fail; also indicates render-churn pattern.

Recommendation:
- Derive state from props where possible or guard updates to avoid synchronous setState in effect body.

---

### F-13 [P3] No explicit CSRF/origin validation on cookie-authenticated mutating admin routes
Category: Security

Evidence:
- `src/app/api/admin/route.ts:59`
- `src/app/api/admin/[id]/route.ts:14`
- `src/app/api/admin/[id]/route.ts:124`
- `src/app/api/admin/[id]/reset-password/route.ts:7`

Impact:
- Depends on cookie `SameSite` behavior; explicit origin checks are absent.

Recommendation:
- Add Origin/Referer validation middleware for state-changing routes, or require explicit anti-CSRF token.

---

### F-14 [P3] Auth provider error messages are reflected directly to clients
Category: Security, Information Disclosure

Evidence:
- `src/app/api/admin/route.ts:123`
- `src/app/api/admin/[id]/route.ts:92`
- `src/app/api/admin/[id]/reset-password/route.ts:56`

Impact:
- Internal auth error details may leak implementation behavior.

Recommendation:
- Return generic client messages; log provider details server-side.

---

### F-15 [P3] Legacy duplicate public booking component is unused and diverges from active flow
Category: Redundancy, Maintainability

Evidence:
- `src/components/PublicBookingForm.tsx:25`
- Active import uses: `src/app/page.tsx:3` (`@/components/booking/PublicBookingForm`)
- Legacy file calls admin-only endpoint: `src/components/PublicBookingForm.tsx:64` vs admin guard at `src/app/api/patients/lookup/route.ts:8`

Impact:
- Confusing parallel implementations increase bug risk and future regressions.

Recommendation:
- Remove legacy file or move to archived examples with explicit deprecation note.

---

### F-16 [P3] `PrescriptionForm` component appears unused
Category: Redundancy

Evidence:
- Definition: `src/components/PrescriptionForm.tsx:28`
- Repository search found no runtime imports beyond self-definition.

Impact:
- Dead code increases maintenance and review surface.

Recommendation:
- Remove or rewire into active prescription flow.

---

### F-17 [P3] `PatientListView` component appears unused
Category: Redundancy

Evidence:
- Definition: `src/components/admin/PatientListView.tsx:15`
- Repository search found no runtime imports beyond self-definition.

Impact:
- Dead component duplicates appointment listing behavior already handled by `AppointmentsView`.

Recommendation:
- Remove to reduce maintenance burden.

---

### F-18 [P3] `excludeAppointmentId` support is partially dead in DateSlotPicker
Category: Redundancy, Correctness

Evidence:
- Consumed in grid: `src/components/ui/DateSlotPicker/SlotGrid.tsx:26`
- Type exists in grid props: `src/components/ui/DateSlotPicker/types.ts:41`
- Not exposed by top-level picker props: `src/components/ui/DateSlotPicker/types.ts:17`

Impact:
- Intended self-conflict exclusion cannot be used through the top-level component API.

Recommendation:
- Expose and pass through `excludeAppointmentId` at `DateSlotPicker` API boundary or remove dead parameter path.

---

### F-19 [P3] Repeated auth/admin guard and serialization logic across route handlers
Category: Redundancy, Maintainability

Evidence:
- Repeated auth+admin checks across many routes, e.g.:
  - `src/app/api/appointments/list/route.ts:13`
  - `src/app/api/prescriptions/route.ts:11`
  - `src/app/api/patients/[id]/route.ts:16`
- Repeated date serialization blocks in list/get handlers.

Impact:
- Higher chance of drift and inconsistent security behavior between endpoints.

Recommendation:
- Extract shared helpers (`requireAdmin()`, serializer utilities) and reuse uniformly.

## Additional Notes

- `npm run build` succeeds, so no current compile-time blockers.
- `npm run lint` fails (1 error) and should be fixed before enforcing lint-gated CI.

## Suggested Remediation Order

1. Fix P1 findings first: F-01, F-02, F-03, F-04.
2. Resolve booking/admin flow correctness issues: F-05, F-06, F-07, F-08.
3. Harden abuse/security controls: F-09, F-10, F-11, F-13, F-14.
4. Remove dead/duplicate code and refactor shared logic: F-15 through F-19.
