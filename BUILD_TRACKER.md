# Tenant Financial Solutions — Build Tracker

**Client:** Michael Markert  
**Developer:** Matthew Ellis / Web Launch Academy LLC  
**Go-live target:** May 1, 2026  
**Project directory:** `/home/ellis/tenantfinancialsolutions/tfs-app/`

---

## How to run locally

```bash
cd /home/ellis/tenantfinancialsolutions/tfs-app
npm run dev
# Open http://localhost:3000
```

---

## Environment setup (do this before deploying)

1. Create a Supabase project at supabase.com
2. Copy `tfs-app/.env.local.example` → `tfs-app/.env.local`
3. Fill in real values for Supabase URL + keys, Stripe keys, Resend key
4. Run `supabase/schema.sql` in the Supabase SQL editor
5. Enable Google OAuth in Supabase Dashboard → Auth → Providers → Google

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
  - Individual path, no code → `individual`
  - Individual path, couple selected → `couple`
  - Individual path, with PM promo code → `property_tenant`
  - Non-profit path → `nonprofit_individual`
  - PM invite → `property_manager` role (not a client)

---

## Phase 1 — Public site + registration ✅ COMPLETE (target: April 18)

### Pages built
- [x] `/` — Home (hero, 3 audience CTAs, benefits, welcome copy, testimonials from DB)
- [x] `/about` — Vision image, COACHES core values, live coach bios from DB
- [x] `/services` — All plan tiers, PM affiliate + paying, non-profit section; gold removed, Starter/Advantage renamed
- [x] `/contact` — Rate-limited form, pre-tagged by ?type= param, sends via Resend
- [x] `/register` — 3-path flow (individual / PM tenant / non-profit), couple toggle, promo code optional, auto-sets `client_type` + `free_trial_expires_at`, gold removed, tiers renamed
- [x] `/login` — Email/password + Google OAuth

### API routes built
- [x] `POST /api/auth/register` — Creates Supabase user, increments promo code, initiates Stripe sub, sends welcome email; sets client_type + free_trial_expires_at; gold tier removed
- [x] `POST /api/codes/validate` — Validates promo code (active, not expired, not exhausted)
- [x] `POST /api/contact` — Rate-limited, sends to admin via Resend
- [x] `POST /api/stripe/webhook` — Handles subscription created/updated/deleted, payment_failed
- [x] `POST /api/subscribe` — Email subscribe stub (wire to Resend audiences when ready)
- [x] `GET  /auth/callback` — OAuth callback handler

### Infrastructure built
- [x] `supabase/schema.sql` — All 8 tables + RLS policies + triggers (paste into Supabase SQL editor)
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

### Must ship
- [x] `/admin/dashboard` — Summary stats (clients, coaches, bookings this month, inactivity flags)
- [x] `/admin/coaches` — Add coach (invite email), edit profile, deactivate (soft delete via is_active flag)
- [x] `/admin/clients` — Full client list; filter by client_type + PM group; inline `free_trial_expires_at` date picker per row (saves on blur); bulk extend trial with PM-group shortcut
- [x] `/admin/managers` — Invite PM by email, view active managers with code counts
- [x] `/admin/codes` — Promo code creation, view, revoke
- [x] `/coach/dashboard` — Upcoming sessions in coach's timezone, 4 stat cards, inactivity alerts
- [x] `/coach/availability` — Set recurring weekly availability blocks (timezone-aware, UTC stored)
- [x] `PATCH /api/admin/clients/trial` — Bulk-update `free_trial_expires_at`; accepts array of client IDs or a `pm_code` (auto-resolves to all tenants under that PM); admin-only

### Ship if time allows
- [x] `/admin/bookings` — Full booking log, status filter, cancel (restores session credit), attach notes
- [x] `/admin/testimonials` — Approve/reject pending, remove approved, live on homepage
- [x] `/admin/group-sessions` — Schedule sessions, add/edit join link and recording URL
- [x] `/admin/partners` — Add/edit PM + non-profit partner directory
- [x] Group session reminder automation — Cron runs daily at 8am UTC, emails all active paid clients 3 days before

---

## Phase 3b — Coach dashboard expansion ✅ COMPLETE (target: May 1)

- [x] `/coach/dashboard` — 4 stat cards (sessions this month, total clients, today's sessions, inactivity alerts), inactivity panel, upcoming sessions list
- [x] `/coach/clients` — Clients with active bookings: name, client_type badge, plan tier, last active, sessions used this month
- [x] `/coach/sessions` — Full session history: filter tabs (upcoming/past/all), inline note editing, attended/no-show toggle, cancel with confirm
- [x] `/coach/attendance` — Group session attendance roster: session picker, client roster, attended/no-show toggles, live summary
- [x] `/coach/profile` — Edit own record: display name, bio, specialty, photo URL, timezone
- [x] `GET  /api/coach/clients` — Distinct clients with non-cancelled bookings for this coach
- [x] `PATCH /api/coach/sessions/[id]` — Add/edit note, cancel session, mark attended/no-show (gated to booking's coach_id)
- [x] `PATCH /api/coach/profile` — Update coaches table for own record
- [x] `POST  /api/coach/attendance` — Mark group session attendance (upserts group_session_attendance)
- [x] Coach layout nav: Clients, Sessions, Attendance, Profile links added

---

## Phase 3c — Property Manager dashboard ✅ COMPLETE (target: May 1)

### Schema migration (applied)
- [x] `property_manager` added to `user_role` enum
- [x] `client_type` enum added to profiles
- [x] `free_trial_expires_at` timestamptz added to profiles
- [x] `group_session_attendance` table created with RLS
- [x] `attended` boolean added to `bookings`
- [x] RLS policy: PM can read profiles where `promo_code_used` matches their codes
- [x] Middleware protects `/manager/*` routes

### Admin additions
- [x] `/admin/managers` — Invite PM by email, view active managers, code counts per manager
- [x] `POST /api/admin/managers` — Invite PM via Supabase email invite, sets `property_manager` role
- [x] `POST /api/admin/codes/quick-generate` — Auto-generates TFS-XXXXXX code (unambiguous chars), 90-day expiry, unlimited uses, sets `created_by` to caller's profile ID

### PM pages
- [x] `/manager/layout.tsx` — Purple PM badge, Dashboard / My Tenants / Promo Codes / Attendance nav
- [x] `/manager/dashboard` — 4 stat cards, quick generate code button (copies to clipboard), active codes preview
- [x] `/manager/tenants` — Tenants enrolled via PM's codes: name, code used, plan, sessions/mo, last active, status
- [x] `/manager/codes` — PM's codes: usage/expiry/status + QuickGenerateButton
- [x] `/manager/attendance` — Group + 1-on-1 attendance side by side for their tenants (last 90 days)

---

## Phase 3d — Client portal expansion ✅ COMPLETE (target: May 1)

- [x] `/portal/group-sessions` — Upcoming sessions with Join link; past 90 days with Watch recording; per-session attendance badge
- [x] `/portal/testimonial` — Quote form with 500-char counter, display name, success/pending state
- [x] `/portal/billing` — Current plan display, trial expiry date, Stripe billing portal button (paid) or upgrade nudge (free)
- [x] `POST /api/portal/testimonial` — Inserts testimonial with plan_tier, approved=false
- [x] `GET  /api/portal/billing-portal` — Creates Stripe billing portal session, returns redirect URL
- [x] Portal layout nav: Group Sessions, Profile, Share Story, Billing links added

---

## Phase 4/5 — Coach offboarding + advanced admin (future)

- [ ] Hard coach removal with 30-day profile + data retention
- [ ] Client redistribution UI — reassign future bookings to replacement coach, notify affected clients
- [ ] Admin role management UI — promote/demote users by role within the dashboard

---

## Phase 4 — Security + polish (ongoing, 90-day window)

- [ ] Full security audit pass (OWASP Top 10, RLS policy review, API auth checks)
- [ ] SEO meta + OG tags per page
- [ ] Stripe customer portal for self-service billing management
- [ ] Optional: tenant unit address list upload for PM code abuse prevention

### Lighthouse (target: 90+ across all four categories)
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 90
- [ ] Best Practices ≥ 90
- [ ] SEO ≥ 90
- Run against: `/` (home), `/about`, `/services`, `/contact`, `/portal/dashboard`, `/coach/dashboard`, `/admin/dashboard`

### Browser testing
- [ ] Chrome (latest) — primary dev target
- [ ] Firefox (latest)
- [ ] Safari (latest) — critical for iOS users; test on macOS + iPhone
- [ ] Edge (latest) — Chromium-based, covers most Windows users
- [ ] Samsung Internet — covers Android default browser on Galaxy devices
- Note: Internet Explorer 11 is end-of-life and not supported

### Device / viewport testing
- [ ] Mobile — 375px (iPhone SE), 390px (iPhone 14), 412px (Pixel 7)
- [ ] Tablet — 768px (iPad Mini), 1024px (iPad Pro) — test if layout warrants it
- [ ] Desktop — 1280px, 1440px, 1920px
- Focus areas: Navbar sticky behavior, sidebar layouts (portal/coach/admin), booking slot grid, tables (overflow-x-auto on small screens)

---

## Pending client information needed

- [ ] Stripe account access — Bronze/Silver/Gold subscription price IDs + one-time session price
- [ ] Real coach names, bios, photos, specialties, timezones
- [ ] Social media URLs (Instagram, Facebook, Twitter/X handles)
- [ ] Resend account + verified sending domain
- [ ] Supabase project (URL + anon key + service role key)
- [ ] Upstash Redis (for rate limiting in production) — optional, free tier available
