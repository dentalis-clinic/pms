# Launch Readiness Report

Date: 2026-03-04
Project: DentalisPMS
Reviewer: Codex (GPT-5)

## Verdict

Current status: **No-go for public launch**.

Build currently succeeds, but there are functional and security blockers that must be resolved before a public rollout.

## Checks Run

- `npm run build`: pass
- `npm run lint`: fail (1 error)

## Launch Blockers

### 1) Returning-patient public booking path is broken (token vs UUID validation mismatch)

- Public `phone-check` now returns opaque token IDs, not patient UUIDs.
- Public booking schema still enforces `existingPatientId` as UUID.
- Result: valid returning-patient flow can be rejected during validation.

Evidence:
- `src/app/api/phone-check/route.ts:82`
- `src/lib/validations/appointment.ts:80`
- `src/app/api/appointments/route.ts:97`

Impact:
- Core public booking journey fails for some existing patients.

Recommendation:
- Accept token format in public schema path (or preprocess before schema validation).
- Keep strict UUID validation for admin-only submission paths.

---

### 2) Confirm flow still tied to deprecated status transition model

- New booking writes `PENDING` status.
- Confirm route transition map still allows only `TENTATIVE -> CONFIRMED`.

Evidence:
- `src/app/api/appointments/route.ts:206`
- `src/app/api/appointments/confirm/route.ts:13`

Impact:
- Pending appointments may fail to confirm as expected in production workflows.

Recommendation:
- Update transition rules to include `PENDING -> CONFIRMED` (and required legacy compatibility if needed).

---

### 3) Pending detection logic still uses deprecated `TENTATIVE`

- `phone-check` pending detection and dashboard stat count still query `TENTATIVE`.

Evidence:
- `src/app/api/phone-check/route.ts:59`
- `src/app/api/dashboard/stats/route.ts:23`

Impact:
- Incorrect pending state messaging and incorrect operational dashboard metrics.

Recommendation:
- Migrate pending logic to `PENDING` consistently across all code paths.
- Keep `TENTATIVE` only where explicit backward-compatibility is required, with sunset plan.

---

### 4) Cron endpoints are publicly callable (no auth/secret verification)

- Cron routes execute state-changing jobs on unauthenticated GET requests.

Evidence:
- `src/app/api/cron/mark-overdue/route.ts:9`
- `src/app/api/cron/cancel-overdue/route.ts:18`

Impact:
- External callers can trigger operational jobs at will.

Recommendation:
- Require cron secret verification (e.g., bearer token/header check).
- Reject unauthenticated manual calls with `401/403`.

---

### 5) Lint is failing due to `set-state-in-effect` error

Evidence:
- `src/components/ui/DateSlotPicker/index.tsx:66`

Impact:
- CI quality gate failure and potential render-churn issue.

Recommendation:
- Refactor to avoid direct synchronous state updates in effect body.
- Ensure lint is clean before release branch cut.

---

### 6) Redis rate-limiter singleton can apply wrong limit values globally

- Redis limiter instance is cached once; first initialized `max` can be reused across namespaces/routes.

Evidence:
- `src/lib/utils/rate-limit.ts:30`

Impact:
- Inconsistent enforcement across endpoints (unexpected weaker/stronger limits).

Recommendation:
- Cache limiter instances by `(namespace, max, window)` or construct deterministic per-policy limiter.

## Security & Hardening Gaps To Close Before Launch

### A) Apply CSRF/origin validation consistently

- `validateOrigin` exists, but currently only applied on one route path.

Evidence:
- `src/lib/utils/csrf.ts:11`
- `src/app/api/appointments/route.ts:19`

Recommendation:
- Enforce origin checks (or anti-CSRF tokens) on all mutating authenticated routes (`POST`, `PATCH`, `DELETE`).

### B) Complete endpoint-level security regression pass

Recommendation:
- Re-verify admin-only boundaries on all write endpoints.
- Confirm no internal identifiers or sensitive metadata are leaked in public responses.

## Redundancy / Maintainability Notes

### 1) Unused component still present

- `PrescriptionForm` appears not imported anywhere in runtime paths.

Evidence:
- `src/components/PrescriptionForm.tsx:28`

Recommendation:
- Remove dead component or wire it into active flow intentionally.

### 2) Status migration not fully normalized

- New + deprecated status values coexist in operational logic.

Recommendation:
- Complete migration plan and normalize enums/usages across API, UI, jobs, and analytics.

## Recommended Launch Plan

### Phase 1: Blocker fixes (must pass)

1. Fix blocker #1 through #6.
2. Re-run:
   - `npm run lint` (must pass)
   - `npm run build` (must pass)
3. Perform focused manual QA on:
   - New patient booking
   - Returning patient booking
   - Admin confirm flow
   - Slot conflict/override flow
   - Overdue/cancel cron behavior

### Phase 2: Security readiness

1. Add cron secret enforcement.
2. Apply CSRF/origin protection uniformly.
3. Validate rate limit behavior in staging using realistic traffic.

### Phase 3: Operational readiness

1. Enable monitoring/alerts for API errors and cron outcomes.
2. Verify DB backup + restore drill.
3. Do limited pilot rollout before full public exposure.

## Launch Gate Checklist

- [ ] All launch blockers fixed
- [ ] Lint clean (`npm run lint`)
- [ ] Build green (`npm run build`)
- [ ] Security checks complete (cron auth, CSRF coverage, rate limiting)
- [ ] Core booking/confirm/cancel flows QA signed off
- [ ] Monitoring and incident response path in place
- [ ] Backup/restore validated
- [ ] Pilot rollout completed successfully

## Final Recommendation

Do not launch publicly until all blocker items are resolved and revalidated in staging. A phased rollout is recommended even after fixes.
