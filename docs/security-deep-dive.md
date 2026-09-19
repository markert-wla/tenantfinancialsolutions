# Security deep-dive — checklist & Claude Code prompt

A Web Launch Academy security audit (external scan + static review of this repo) confirmed
**strong basics**: RLS on all tables, no service-role bypass (DB access runs as
`authenticated`), server-side role gating in `middleware.ts`, Stripe webhook signature
verification, rate limiting, HSTS + security headers, no committed secrets.

Three things could **not** be checked from outside the project and are left as follow-ups:

1. **The live database** (the audit only read the migration SQL, not the deployed DB).
2. **Dependency vulnerabilities** — `npm audit` reports 1 critical / 8 high (incl. `sharp`/`libheif`).
3. **The broader CSP work** — dropping `'unsafe-eval'` and the `cdn.tailwindcss.com` /
   `jsdelivr` / `unpkg` script CDNs (all actively used, so they must be self-hosted first).

Run the prompt below from a **Claude Code session opened in this project**, which has the
live Supabase connection, CLI, and env that an outside audit does not. Make sure the
**Supabase MCP is connected to this project's database** before you start (item 1 needs it).

> **Safety:** this is a production financial site. Everything below is READ-ONLY / additive.
> Never write, delete, or mutate real data, and never run load/DoS-style traffic. Use
> throwaway test accounts for the access-control checks — never real client or admin credentials.

---

```
You are doing a security deep-dive on this project (Tenant Financial Solutions,
a live financial-services site). A prior external + static audit already confirmed
strong basics (RLS on all tables, no service-role bypass, server-side role gating
in middleware.ts, Stripe webhook signature verification, rate limiting, security
headers). It could NOT reach the things below — do those now. Be careful: this is
a production site with real customer data. Everything here is READ-ONLY / additive;
never write, delete, or mutate real data, and never run load/DoS-style traffic.

1. LIVE DATABASE (the top priority — the static audit only read the migration SQL).
   Using the Supabase MCP tools connected to THIS project's database:
   - Run get_advisors for BOTH type: "security" and type: "performance". Report every
     finding, most severe first.
   - Confirm the live schema matches supabase/migrations: list all tables and, for each,
     whether RLS is ENABLED and has at least one policy. Flag any table with RLS off, or
     enabled-but-no-policy that the app actually reads through the anon/authenticated role
     (a deny-all with no policy is fine ONLY if all access is service-role).
   - Spot-check 2-3 policies for the "uses auth.uid(), not a client-supplied id" property.

2. DEPENDENCIES (npm audit reported 1 critical / 8 high, incl. sharp/libheif).
   - Run `npm audit`; apply `npm audit fix` (non-breaking) and commit.
   - Update sharp to the fixed major (breaking) on its own commit; then run `npm run build`
     and manually test any image upload/processing path. Report what remains after.

3. CSP HARDENING (script-src currently allows 'unsafe-eval' + cdn.tailwindcss.com,
   cdn.jsdelivr.net, unpkg.com — all actively used).
   - Find every use of those three CDNs. Migrate each to a bundled/self-hosted dependency
     (Tailwind especially: replace the CDN build with the compiled/PostCSS setup so the
     runtime no longer needs 'unsafe-eval'). Then remove those origins AND 'unsafe-eval'
     from the CSP in next.config.mjs, build, and verify styling + all scripted features
     still work. Do this on a branch; do not merge without a visual QA pass.

4. AUTHENTICATED ACCESS-CONTROL (IDOR) — READ-ONLY, with THROWAWAY TEST ACCOUNTS ONLY.
   - Create two disposable test users (user A, user B) with fake data. Never use a real
     client's or admin's credentials.
   - As user A, call the app's own data APIs but substitute B's ids (in the path, query,
     or body) and confirm A gets 403/empty, never B's records. Cover the main resources
     (profiles, bookings/sessions, questionnaires, billing). GET/read attempts only.
   - As a lower-privilege role (client), attempt the /api/admin/* and /admin routes and
     confirm they reject. Report any that don't.
   - Delete the test accounts and any test rows when done.

Deliver a single findings report: each item SAFE or VULNERABLE, severity, evidence, and
a concrete fix. Open fixes as branches/PRs; do not merge to main without review.
```

---

## Results — 2026-09-19 (live deep-dive run in-project)

Branch: `security/csp-hardening`. All four items executed against the live TFS
project (Supabase MCP `wzupawwrcmmkimbelptr`, local prod build, RLS impersonation).

### 1. Live database — SAFE (matches migrations; only known/accepted advisor items)

**Schema/RLS drift:** none. All 21 public tables have RLS **enabled** and **≥1 policy**.
No table is RLS-off, and none is enabled-but-policyless on a path the app reads via
anon/authenticated.

**Security advisors (5 WARN, all previously reviewed & accepted):**
- `get_my_role()` / `get_my_promo_codes()` executable by `anon`+`authenticated` (SECURITY
  DEFINER). Intentional — RLS policies on profiles/promo_codes/etc. call them and evaluate
  as the querying role; both return only the caller's own data (null for anon). Revoking
  would turn anon reads into hard errors. Keep.
- `delete_client_account(uuid)` executable by `authenticated` (SECURITY DEFINER). Intentional
  — has an internal admin guard; admin UI calls it user-scoped. Keep.
- Leaked-password protection (HaveIBeenPwned) **OFF**. Dashboard-only toggle, needs Pro plan;
  human decision. Enable at Auth → Providers → Email if on Pro.

**Performance advisors (INFO/WARN, non-security, not fixed this pass):**
- `auth_rls_initplan` (49 policies) — `auth.uid()` re-evaluated per row; wrap as
  `(select auth.uid())` for scale. No correctness/security impact at current row counts.
- `multiple_permissive_policies` (~31 real table+action overlaps, mostly an "admin all"
  policy stacked on role-specific ones) — extra per-query policy evaluation only.
- `unindexed_foreign_keys` (14) and `unused_index` (6) — housekeeping.
  → Optional single migration to wrap auth calls + add FK indexes if/when scale warrants.

**Policy spot-check (auth.uid, not client-supplied id):** `bookings: client read own`
uses `auth.uid() = client_id`; `profiles: own read` uses `auth.uid() = id`;
`client_documents_own` uses `auth.uid() = client_id` (USING + WITH CHECK). All correct.

### 2. Dependencies — FIXED (postcss + sharp); Next.js remains (breaking)

- `npm audit fix` (non-breaking): cleared 4 findings (PostCSS XSS + sourceMappingURL
  disclosure, postcss-selector-parser DoS). Committed.
- `sharp` 0.34.5 → 0.35.4 (libvips/libheif CVEs): committed on its own. `sharp` is not
  imported in app code — it's only Next's optional image-optimization backend — and
  `next build` passes.
- **Remaining: 5 findings, all Next.js 14 itself** (SSRF-in-rewrites, Server-Function
  disclosure, Windows RCE, AVIF image-optimization RCE). Fix = `next@16` major upgrade;
  deferred as a separate, tested migration. Note the Windows-RCE advisory is N/A (Vercel
  hosting is Linux), but the AVIF image-optimization one applies. Verified real ranges vs
  14.2.35 with `gh api /advisories` — not flattening artifacts.

### 3. CSP hardening — DONE (`'unsafe-eval'` + 3 CDNs removed)

Six coach tools used the Tailwind Play CDN (the reason for `'unsafe-eval'`) and lucide from
jsdelivr/unpkg. Migrated to precompiled per-tool stylesheets (`public/tools/css/`, built by
`scripts/build-tools-css.mjs` from each page's inline palette) and a vendored, pinned lucide
1.8.0 UMD (`public/tools/vendor/`). `script-src` now drops `'unsafe-eval'`,
`cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `unpkg.com`. Playwright QA on the prod build:
0 CSP violations / page errors across all 10 tools + home; every lucide icon renders;
per-palette styling screenshot-verified on all six migrated pages.

### 4. Access-control / IDOR — SAFE (RLS-layer live test + full route review)

**Method note:** tested at the real authorization boundary (RLS impersonation via
`set_config('request.jwt.claims', …)` + `set local role`), which is fully read-only and,
unlike the register flow, creates no Stripe customers and sends no emails on this live site.

- **Cross-client (user A reads user B):** as client A, every one of B's rows returned **0**
  — profiles, bookings, intake_responses, client_documents, portal_messages, coach_messages,
  coach_client_notes. A's own controls returned >0 (profile 1, bookings 6, intake 1) and
  `select count(*) from profiles` returned **1** (A's own only). RLS airtight.
- **Client → staff/admin data:** as client A, contact_submissions 0, coach_client_notes 0,
  promo_codes 0; bookings/intake showed own rows only.
- **Anon (logged-out):** 0 rows on profiles, bookings, intake, contacts, promo_codes,
  client_documents, coach_messages; only `public_popups` (intentionally public) returned a row.
- **`/api/admin/*` route guards:** middleware's `PROTECTED_ROUTES` gate the `/admin` **pages**
  but NOT `/api/admin/*` (those start with `/api`), so each API route must self-guard.
  Reviewed all 30 admin routes — every one does `getUser()` + `role === 'admin'` (or the
  `getAdmin()` helper) on **every** exported method. No unguarded admin route found.
- No throwaway accounts were created, so none needed cleanup.

**Two coach-side IDORs remain intentional** (unchanged from the 2026-07 audit):
`/api/coach/attendance` and `/api/coach/client-notes` POST accept any `client_id` with only
a role check, because coaches legitimately run group sessions for non-roster clients. Coaches
are 3 trusted staff. Business decision, not a bug.

---

Also outstanding (not code — decisions):

- **Repo visibility** — this repository is currently public. No secrets are committed, so
  it is not a breach, but a financial-services site usually wants it private. Toggle in
  GitHub → Settings if unintended.
- Once the deployment's firewall allows an automated scanner, a clean external re-scan will
  confirm the security headers are live (the audit read them from `next.config.mjs`).
