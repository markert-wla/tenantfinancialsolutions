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

Also outstanding (not code — decisions):

- **Repo visibility** — this repository is currently public. No secrets are committed, so
  it is not a breach, but a financial-services site usually wants it private. Toggle in
  GitHub → Settings if unintended.
- Once the deployment's firewall allows an automated scanner, a clean external re-scan will
  confirm the security headers are live (the audit read them from `next.config.mjs`).
