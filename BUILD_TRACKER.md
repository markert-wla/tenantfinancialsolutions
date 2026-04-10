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

## Phase 1 — Public site + registration ✅ COMPLETE (target: April 18)

### Pages built
- [x] `/` — Home (hero, 3 audience CTAs, benefits, welcome copy, testimonials from DB)
- [x] `/about` — Vision image, COACHES core values, live coach bios from DB
- [x] `/services` — All 4 individual tiers, PM affiliate + paying, non-profit section
- [x] `/contact` — Rate-limited form, pre-tagged by ?type= param, sends via Resend
- [x] `/register` — 3-path flow (individual / PM tenant / non-profit), promo code validation
- [x] `/login` — Email/password + Google OAuth

### API routes built
- [x] `POST /api/auth/register` — Creates Supabase user, increments promo code, initiates Stripe sub, sends welcome email
- [x] `POST /api/codes/validate` — Validates promo code (active, not expired, not exhausted)
- [x] `POST /api/contact` — Rate-limited, sends to admin via Resend
- [x] `POST /api/stripe/webhook` — Handles subscription created/updated/deleted, payment_failed
- [x] `POST /api/subscribe` — Email subscribe stub (wire to Resend audiences when ready)
- [x] `GET  /auth/callback` — OAuth callback handler

### Infrastructure built
- [x] `supabase/schema.sql` — All 8 tables + RLS policies + triggers (paste into Supabase SQL editor)
- [x] `src/middleware.ts` — Protects /portal/*, /coach/*, /admin/* by role
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
- [x] `POST /api/booking` — Plan limit check, availability check, conflict check, session increment, email confirmations
- [x] `GET /api/booking/slots` — Generates open 60-min slots from availability table, filtered by existing bookings
- [x] `POST /api/cron/reset-sessions` — Resets sessions_used_this_month, secured with CRON_SECRET
- [x] `vercel.json` — Cron scheduled for 1st of each month at midnight UTC
- [x] `src/app/portal/layout.tsx` — Sidebar nav (Dashboard / Book / My Sessions / Sign out)

### Notes
- All portal pages use `force-dynamic` and require authenticated session
- Slots are timezone-aware: stored in UTC, displayed in user's profile timezone
- Cron requires `CRON_SECRET` env var set in Vercel dashboard

---

## Phase 3 — Coach + Admin dashboards (target: May 1)

### Must ship
- [x] `/admin/dashboard` — Summary stats (clients, coaches, bookings this month, inactivity flags)
- [x] `/admin/coaches` — Add coach (invite email), edit profile, deactivate (soft delete via is_active flag)
- [x] `/admin/clients` — Full client list, 90/120-day inactivity flags, plan tier display
- [x] `/admin/codes` — Promo code creation, view, revoke
- [x] `/coach/dashboard` — Upcoming sessions in coach's timezone
- [x] `/coach/availability` — Set recurring weekly availability blocks (timezone-aware, UTC stored)

### Ship if time allows
- [x] `/admin/bookings` — Full booking log, status filter, cancel (restores session credit), attach notes
- [x] `/admin/testimonials` — Approve/reject pending, remove approved, live on homepage
- [x] `/admin/group-sessions` — Schedule sessions, add/edit join link and recording URL
- [x] `/admin/partners` — Add/edit PM + non-profit partner directory
- [x] Group session reminder automation — Cron runs daily at 8am UTC, emails all active paid clients 3 days before

### Notes
- Coach deactivation sets `is_active = false` — data fully preserved, coach hidden from booking
- Hard delete + client redistribution workflow deferred to Phase 4/5 (see below)

---

## Phase 4/5 — Coach offboarding + advanced admin (future)

- [ ] Hard coach removal with 30-day profile + data retention
- [ ] Client redistribution UI — reassign future bookings to replacement coach, notify affected clients
- [ ] Admin role management UI — promote/demote users by role within the dashboard

---

## Phase 4 — Security + polish (ongoing, 90-day window)

- [ ] Full vibe-security audit pass
- [ ] Mobile responsiveness review
- [ ] SEO meta + OG tags per page
- [ ] Lighthouse performance pass
- [ ] Stripe customer portal for self-service billing management
- [ ] Optional: tenant unit address list upload for PM code abuse prevention

---

## Pending client information needed

- [ ] Stripe account access — Bronze/Silver/Gold subscription price IDs + one-time session price
- [ ] Real coach names, bios, photos, specialties, timezones
- [ ] Social media URLs (Instagram, Facebook, Twitter/X handles)
- [ ] Resend account + verified sending domain
- [ ] Supabase project (URL + anon key + service role key)
- [ ] Upstash Redis (for rate limiting in production) — optional, free tier available
