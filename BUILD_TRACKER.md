# Tenant Financial Solutions — Build Tracker

**Client:** Michael Markert  
**Developer:** Matthew Ellis / Web Launch Academy LLC  
**Go-live target:** May 1, 2026  
**Project directory:** `/home/ellis/tenantfinancialsolutions/` (repo root = Next.js app)

---

## How to run locally

```bash
cd /home/ellis/tenantfinancialsolutions
npm run dev
# Open http://localhost:3000
```

---

## Environment setup (do this before deploying)

1. Create a Supabase project at supabase.com ✅
2. Copy `.env.local.example` → `.env.local` and fill in all values ✅
3. Run `supabase/schema.sql` in the Supabase SQL Editor ✅
4. Run `supabase/migration_phase3.sql` in the Supabase SQL Editor ✅
5. Enable Google OAuth in Supabase Dashboard → Auth → Providers → Google
6. Set `ADMIN_EMAILS` env var to comma-separated admin email(s): `markert.wla@gmail.com,mjmfinancialcoaching@gmail.com`
7. Set `CRON_SECRET` env var — any strong random string; must match Vercel cron header
8. Add all env vars to Vercel → Project Settings → Environment Variables

---

## Free Tier Rules (reference for all phases)

- **Who gets it:** Any individual or couple who signs up without a promo code (or with a free-tier code)
- **What's included:** 1 free group session + 1 free 1-on-1 coaching session
- **Window:** 30 days from signup — unused free sessions expire after this window
- **Couples:** Same free tier allowance; `client_type = 'couple'` — treated as one account, same session limits
- **Promo code:** Optional at signup. If provided and valid, overrides free tier with the code's assigned tier (bronze/silver). If not provided, defaults to free
- **Upgrade path:** When free sessions are used or window expires, booking page shows upgrade nudge — other portal features (history, group session recordings, profile, group session join links) remain accessible
- **Locked on expiry:** booking new sessions only. Dashboard, history, group sessions, profile, billing page — all still available
- **Stripe involvement:** Only triggered on upgrade. Free tier tracked entirely in DB via `free_trial_expires_at` + booking count — no card required for free signup
- **Plan tiers — backend vs frontend naming + features:**
  - `free` → "Free" (unchanged) — 1 group session + 1 individual session, 30-day window
  - `bronze` → **"Starter Plan" ($50/mo)** — 1 individual session/month + 1 complimentary group session/month
  - `silver` → **"Advantage Plan" ($100/mo)** — 2 individual sessions/month + 1 complimentary group session/month + priority scheduling + text check-ins
  - `gold` → **eliminated**; remove from all frontend UI, pricing pages, and registration paths. Backend enum value kept in DB for data integrity but never assigned to new users
  - Session limits in code already match: `bronze: 1`, `silver: 2` (booking API + portal dashboard)
- **client_type set automatically at registration:**
  - Individual path → `individual`
  - Couples path → `couple`
  - Individual path, with PM promo code → `property_tenant`
  - Non-profit path → `nonprofit_individual`
  - PM invite → `property_manager` role (not a client)

---

## Phase 1 — Public site + registration ✅ COMPLETE (target: April 18)

### Pages built
- [x] `/` — Home (hero, 3 audience CTAs, benefits, welcome copy, testimonials from DB)
- [x] `/about` — Vision statement, COACHES core values, live coach bios from DB
- [x] `/services` — All plan tiers, PM affiliate + paying, non-profit section; gold removed, Starter/Advantage renamed
- [x] `/contact` — Rate-limited form, pre-tagged by ?type= param, sends via Resend
- [x] `/register` — 4-path flow (individual / couples / PM tenant / non-profit), promo code optional, auto-sets `client_type` + `free_trial_expires_at`, gold removed, tiers renamed
- [x] `/login` — Email/password + Google OAuth

### API routes built
- [x] `POST /api/auth/register` — Creates Supabase user, increments promo code, initiates Stripe sub, sends welcome email; sets client_type + free_trial_expires_at; gold tier removed
- [x] `POST /api/codes/validate` — Validates promo code (active, not expired, not exhausted)
- [x] `POST /api/contact` — Rate-limited, sends to admin via Resend
- [x] `POST /api/stripe/webhook` — Handles subscription created/updated/deleted, payment_failed
- [x] `POST /api/subscribe` — Email subscribe stub (wire to Resend audiences when ready)
- [x] `GET  /auth/callback` — OAuth callback handler

### Infrastructure built
- [x] `supabase/schema.sql` — All tables + RLS policies + triggers (run in Supabase SQL editor)
- [x] `supabase/migration_phase3.sql` — Phase 3 schema additions (run after schema.sql)
- [x] `src/middleware.ts` — Protects /portal/*, /coach/*, /admin/*, /manager/* by role
- [x] `src/lib/supabase/{client,server}.ts` — Browser + server clients
- [x] `src/lib/stripe.ts` — Lazy Stripe client (getStripe())
- [x] `src/lib/resend.ts` — Lazy Resend (no-ops until API key is set)
- [x] `src/lib/ratelimit.ts` — Upstash Redis rate limiters (no-ops until configured)
- [x] `next.config.mjs` — Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- [x] Brand assets in `public/images/` (logo, vision statement, core values)

---

## Phase 2 — Client portal ✅ COMPLETE (target: April 25)

- [x] `/portal/dashboard` — Sessions used, upcoming bookings, next group session, book CTA
- [x] `/portal/book` — Coach picker (any/specific), week navigator, 60-min slot grid, confirm step
  - Coach selection is optional — "Any Available Coach" shows all open slots
  - When session limit reached: blocked with upgrade nudge
- [x] `/portal/history` — Past + upcoming sessions with coach name, time in user's timezone, status
- [x] `POST /api/booking` — Plan limit check, availability check, conflict check, session increment, email confirmations; free trial check (blocks if expired or session used)
- [x] `GET /api/booking/slots` — Generates open 60-min slots from availability table, filtered by existing bookings
- [x] `POST /api/cron/reset-sessions` — Resets sessions_used_this_month, secured with CRON_SECRET
- [x] `vercel.json` — Cron scheduled for 1st of each month at midnight UTC
- [x] `src/app/portal/layout.tsx` — Sidebar nav (Dashboard / Book / My Sessions / Group Sessions / Profile / Share Story / Billing / Sign out)

### Notes
- All portal pages use `force-dynamic` and require authenticated session
- Slots are timezone-aware: stored in UTC, displayed in user's profile timezone
- Cron requires `CRON_SECRET` env var set in Vercel dashboard

---

## Phase 3 — Coach + Admin dashboards ✅ COMPLETE (target: May 1)

### Admin
- [x] `/admin/dashboard` — Summary stats (clients, coaches, bookings this month, inactivity flags)
- [x] `/admin/coaches` — Add coach (sends invite email via Supabase), edit profile, deactivate/reactivate
- [x] `/admin/clients` — Full client list; filter by client_type + PM group; inline `free_trial_expires_at` date picker per row
- [x] `/admin/managers` — Invite PM by email, view active managers with code counts
- [x] `/admin/codes` — Promo code creation, view, revoke
- [x] `/admin/bookings` — Full booking log, status filter, cancel (restores session credit), attach notes
- [x] `/admin/testimonials` — Approve/reject pending, remove approved, live on homepage
- [x] `/admin/group-sessions` — Schedule sessions, add/edit join link and recording URL
- [x] `/admin/partners` — Add/edit PM + non-profit partner directory
- [x] `/admin/settings` — Admin profile name, timezone, contact email

### Coach
- [x] `/coach/dashboard` — 4 stat cards, inactivity alerts, upcoming sessions list
- [x] `/coach/clients` — Clients with active bookings
- [x] `/coach/sessions` — Full session history: filter tabs, inline note editing, attended/no-show, cancel
- [x] `/coach/attendance` — Group session attendance roster
- [x] `/coach/availability` — Set recurring weekly availability blocks (timezone-aware)
- [x] `/coach/profile` — Edit display name, bio, specialty, photo URL, timezone

### Property Manager
- [x] `/manager/dashboard` — 4 stat cards, quick-generate code button
- [x] `/manager/tenants` — Tenants enrolled via PM's codes
- [x] `/manager/codes` — PM's codes with usage/expiry/status
- [x] `/manager/attendance` — Group + 1-on-1 attendance for their tenants

### Client portal additions
- [x] `/portal/group-sessions` — Join links for upcoming; recording links for past 90 days
- [x] `/portal/testimonial` — Submit quote, display name, success state
- [x] `/portal/billing` — Plan display, trial expiry, Stripe billing portal (paid) or upgrade nudge (free)
- [x] `/portal/profile` — Edit name, timezone, contact email, birthday month

---

## Phase 4/5 — Coach offboarding + advanced admin (future)

- [ ] Hard coach removal with 30-day profile + data retention
- [ ] Client redistribution UI — reassign future bookings to replacement coach, notify affected clients
- [ ] Admin role management UI — promote/demote users by role within the dashboard

---

## Phase 4 — Security + polish (ongoing)

- [ ] Full security audit pass (OWASP Top 10, RLS policy review, API auth checks)
- [x] SEO meta + OG tags per page ✅
- [ ] Stripe customer portal — self-service billing (portal button exists; needs live Stripe keys)
- [ ] Upstash Redis — production rate limiting (no-ops safely without it; add when ready)

### Lighthouse targets (90+ across all four categories)
- [ ] Run against: `/`, `/about`, `/services`, `/contact`, `/portal/dashboard`, `/coach/dashboard`, `/admin/dashboard`

### Browser testing
- [ ] Chrome (latest), Firefox (latest), Safari (latest — critical for iOS), Edge (latest)

### Device / viewport testing
- [ ] Mobile: 375px, 390px, 412px
- [ ] Tablet: 768px, 1024px
- [ ] Desktop: 1280px, 1440px, 1920px

---

## Client information status

- [x] Stripe keys — received and in .env.local ✅
- [x] Social media — Instagram: @mjmfinancialcoaching / Facebook: mjmfinancialcoaching — in footer ✅
- [x] Resend — configured; needs end-to-end email delivery test
- [x] Supabase — project live, schema applied, env vars filled ✅
- [ ] Coach info — **not needed upfront**: admin adds coaches via /admin/coaches (sends invite email); coaches fill their own bio/photo/specialty via /coach/profile
- [ ] Google OAuth — needs Client ID + Secret configured in Supabase Dashboard → Auth → Providers → Google
- [ ] Upstash Redis — not configured; rate limiting no-ops safely; add before heavy traffic
- [ ] CRON_SECRET — must be set in Vercel env vars for monthly session reset to work
