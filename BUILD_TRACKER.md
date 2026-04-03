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

## Phase 2 — Client portal (target: April 25)

- [ ] `/portal/dashboard` — Full dashboard (sessions used, upcoming bookings, group session)
- [ ] `/portal/book` — Browse coaches OR "show all availability", timezone-aware slots, booking engine
  - Coach selection is optional — user can pick "Best available time" to see all slots
  - When session limit reached: button disabled with upgrade nudge
- [ ] `/portal/history` — Past sessions with notes
- [ ] `POST /api/booking` — Full booking engine (availability check, conflict check, plan limit, email confirmations)
- [ ] Monthly session reset cron job setup

---

## Phase 3 — Coach + Admin dashboards (target: May 1)

- [ ] `/coach/dashboard` — Upcoming sessions in coach's timezone
- [ ] `/coach/availability` — Set recurring weekly availability blocks
- [ ] `/admin/dashboard` — Summary stats, quick actions
- [ ] `/admin/clients` — Full client list, inactivity alerts (90/120 day flags), actions
- [ ] `/admin/codes` — Promo code generation (batch single-use + multi-use), view/revoke
- [ ] `/admin/bookings` — Full booking log, cancel/modify, attach notes
- [ ] `/admin/coaches` — Manage coach profiles
- [ ] `/admin/testimonials` — Approve/reject, approved ones show on homepage
- [ ] `/admin/group-sessions` — Create sessions, add join link, post recording
- [ ] `/admin/partners` — PM + non-profit partner directory
- [ ] Group session reminder automation (Resend, fires 3 days before)

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
