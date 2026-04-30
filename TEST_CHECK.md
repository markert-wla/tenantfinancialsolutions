# TFS — End-to-End Test Checklist

**Tester:** Matthew Ellis  
**Purpose:** Verify every user-facing flow before go-live.  
**Test environment:** localhost:3000 (or Vercel preview URL)  
**DB queries:** run in Supabase Dashboard → SQL Editor

Use `markert.wla@gmail.com` (your admin account) for admin tests.  
Create fresh test accounts for client and coach flows.

---

## 0 · Pre-flight Checks

Before anything else:

- [x] `npm run dev` starts without errors
- [x] No TypeScript errors: `npx tsc --noEmit`
- [x] In Supabase Dashboard → Table Editor: confirm these tables exist:
  `profiles`, `coaches`, `availability`, `bookings`, `promo_codes`,
  `testimonials`, `group_sessions`, `group_session_attendance`, `partners`
- [x] Confirm `ADMIN_EMAILS` env var contains both admin emails
- [x] Confirm Stripe keys are filled in `.env.local`
- [x] Confirm Resend key is filled in `.env.local`

**Verify DB baseline (run in SQL Editor):**
```sql
SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- Should show at least: admin = 2 (markert.wla + mjmfinancialcoaching)
```

---

## 1 · Public Pages

### 1.1 Home Page `/`
- [x] Loads without errors
- [x] Hero shows "Your residents want clarity..." heading (not "Our Vision")
- [x] Three audience cards render (Individual and/or Couple, I Manage Properties, Non-Profit)
- [x] "How It Works" section shows "3 Simple Steps towards your desired future."
- [x] Step 3 title reads "Create Change with Your Coach"
- [x] Benefits section shows "Coaching that lightens the load on management by:" (not "Management benefits through:")
- [x] Scroll past the hero CTA button → "Session" button slides into the navbar
- [x] Testimonials section only appears if there are approved testimonials in DB

### 1.2 About Page `/about`
- [x] "Our Vision" label + vision statement at the TOP of the hero (before "Welcome to TFS")
- [x] "Your residents want clarity..." paragraph is GONE from this page
- [x] "Coaching That Lightens the Load on Management" card is GONE
- [x] COACHES core values section renders (C-O-A-C-H-E-S cards with gold letters)
- [x] Lighthouse image visible behind core values section
- [x] Coach cards section shows either live coach profiles or "coming soon" message
- [x] Scroll past hero CTA → "Session" button slides into navbar

### 1.3 Services Page `/services`
- [x] Hero loads with "Services & Plans" title
- [x] Scroll past hero CTA → "Session" button slides into navbar ← was broken, now fixed
- [x] Free plan shows $0 with correct features
- [x] Starter Plan shows $50/mo
- [x] Advantage Plan shows $100/mo with "Most Popular" badge
- [x] No "Gold" plan anywhere on the page
- [x] Property Management section shows Affiliate Model + Tenant Partner Membership
- [x] Non-Profit section shows eligible organizations + "What Your Residents Get"

### 1.4 Contact Page `/contact`
- [x] Scroll past hero CTA → "Session" button slides into navbar ← was broken, now fixed
- [x] Form submits successfully → success message shown
- [x] **Email check:** Admin inbox (markert.wla@gmail.com) receives the contact form email
- [x] Rate limit: submitting 6+ times quickly should return a "too many requests" error

### 1.5 Footer
- [x] Instagram icon links to `https://www.instagram.com/mjmfinancialcoaching/`
- [x] Facebook icon links to `https://www.facebook.com/profile.php?id=61578631015293`
- [x] Email address `tenantfinancialsolutions@gmail.com` is clickable (mailto)
- [x] Copyright year shows current year

---

## 2 · Registration Flows

Use a fresh email for each test (e.g. `testuser+individual@gmail.com`). Delete test profiles from Supabase between runs if repeating.

### 2.1 Individual Registration (Free tier)
1. Go to `/register` → click **Individual** button
2. Select **Free** plan
3. Fill: First Name, Last Name, Email, Password (8+ chars), Timezone, Birthday Month (optional)
4. Click **Create Account**

**Expected:**
- [x] Redirected to `/portal/dashboard`
- [x] Dashboard shows "Free" plan, 0/1 sessions used
- [x] Welcome email arrives at the registered address

**DB check:**
```sql
SELECT email, role, plan_tier, client_type, free_trial_expires_at
FROM profiles WHERE email = 'your-test-email@gmail.com';
-- role = 'client', plan_tier = 'free', client_type = 'individual'
-- free_trial_expires_at = ~30 days from now
```

### 2.2 Couples Registration
1. Go to `/register` → click **Couples** button
2. Select **Free** plan, fill form, submit

**DB check:**
```sql
SELECT client_type FROM profiles WHERE email = 'your-test-email@gmail.com';
-- client_type = 'couple'
```

### 2.3 Paid Tier Registration (Starter Plan — bronze)
1. Go to `/register` → click **Individual**
2. Select **Starter Plan ($50/mo)**
3. Fill form → click **Create Account & Continue to Payment**
4. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC → Pay

**Expected:**
- [x] Account created, redirected to Stripe Checkout for payment
- [x] After payment → redirected to `/portal/dashboard` with green success banner
- [x] Dashboard shows "Starter Plan"
- [x] Stripe customer created (Stripe Dashboard → Customers)
- [x] Stripe subscription created with status `active`

**DB check:**
```sql
SELECT email, plan_tier, stripe_customer_id, stripe_subscription_id
FROM profiles WHERE email = 'your-test-email@gmail.com';
-- plan_tier = 'bronze', stripe_customer_id and stripe_subscription_id should be populated
```

### 2.4 Promo Code Registration (Property Tenant)

First, **create a promo code** (see Section 5.3), then:

1. Go to `/register` → click **Property Tenant**
2. Enter the promo code → click **Validate**
3. Confirm code shows as valid with assigned tier
4. Enter unit number, fill form, submit

**DB check:**
```sql
SELECT email, plan_tier, client_type, promo_code_used
FROM profiles WHERE email = 'your-test-email@gmail.com';
-- client_type = 'property_tenant', promo_code_used = your code
```

**Promo code usage check:**
```sql
SELECT code, uses_count FROM promo_codes WHERE code = 'YOUR-CODE';
-- uses_count should have incremented by 1
```

### 2.5 Non-Profit Resident Registration
Same as 2.4 but click **Non-Profit Resident**. No unit number required.

**DB check:**
```sql
SELECT client_type FROM profiles WHERE email = 'your-test-email@gmail.com';
-- client_type = 'nonprofit_individual'
```

### 2.6 Registration Error Cases
- [x] Duplicate email → shows "An account with this email already exists."
- [x] Password < 8 chars → form prevents submission
- [x] Invalid/expired promo code → shows error message; "Continue as individual" link appears
- [x] Property Tenant path without unit number → blocked with error

---

## 3 · Login & Role Routing

### 3.1 Email / Password Login
1. Go to `/login`
2. Log in with each role:

| Email | Expected redirect |
|-------|-------------------|
| `markert.wla@gmail.com` (admin) | `/admin/dashboard` |
| `mjmfinancialcoaching@gmail.com` (admin) | `/admin/dashboard` |
| A coach email | `/coach/dashboard` |
| A client email | `/portal/dashboard` |

- [x] Wrong password → shows error message
- [x] Non-existent email → shows error message

### 3.2 Google OAuth
> Requires Google OAuth configured in Supabase Dashboard → Auth → Providers → Google.
- [x] Click "Continue with Google" → Google consent screen appears
- [x] After consent → redirected to correct dashboard based on role

### 3.3 Auth Guard
- [x] Try visiting `/admin/dashboard` while logged out → redirected to `/login`
- [x] Try visiting `/portal/dashboard` while logged out → redirected to `/login`
- [x] Try visiting `/portal/dashboard` while logged in as admin → redirected to login (not a client)

---

## 4 · Client Portal

Log in as a free-tier client created in Section 2.1.

### 4.1 Dashboard `/portal/dashboard`
- [x] Shows correct plan tier badge
- [x] Shows sessions used this month (should be 0)
- [x] Shows free trial expiry date
- [x] "Book a Session" button is present
- [x] If no upcoming bookings → "No upcoming sessions" state shown

### 4.2 Booking `/portal/book`

**Pre-condition:** At least one coach must have availability set (see Section 6.2).

1. Click **Book a Session** from dashboard
2. Select "Any Available Coach" (or a specific coach)
3. Navigate weeks using arrows
4. Click an available time slot
5. Confirm the booking

**Expected:**
- [x] Booking appears in dashboard "Upcoming Sessions"
- [x] Confirmation email sent to client
- [x] Confirmation email sent to coach
- [x] sessions_used_this_month incremented to 1

**DB check:**
```sql
SELECT b.start_time_utc, b.status, b.coach_id, p.sessions_used_this_month
FROM bookings b
JOIN profiles p ON p.id = b.client_id
WHERE p.email = 'your-test-client@gmail.com'
ORDER BY b.created_at DESC LIMIT 1;
-- status = 'confirmed', sessions_used_this_month = 1
```

### 4.3 Booking Limit Enforcement
Free tier allows 1 individual session. After booking once:
- [x] Try to book again → blocked with "session limit reached" nudge and upgrade prompt
- [x] Upgrade nudge shows "Starter Plan" and "Advantage Plan" options

### 4.4 Session History `/portal/history`
- [x] Upcoming session shows with correct date/time in client's timezone
- [x] Status badge shows "Confirmed"
- [x] After a session date passes, it moves to "Past Sessions"

### 4.5 Group Sessions `/portal/group-sessions`
**Pre-condition:** Admin must have scheduled a group session (see Section 5.6).
- [x] Upcoming group session shows with date and Join link
- [x] Past sessions show with "Watch Recording" link (if recording URL set)
- [x] Attendance badge shows if admin/coach marked them attended

### 4.6 Profile `/portal/profile`
1. Go to Profile → update First Name, Timezone
2. Click Save

- [x] Success toast/message shown
- [x] Page reload reflects updated name

**DB check:**
```sql
SELECT first_name, timezone, contact_email FROM profiles
WHERE email = 'your-test-client@gmail.com';
```

### 4.7 Submit Testimonial `/portal/testimonial`
1. Write a quote (up to 500 characters)
2. Enter display name
3. Submit

**Expected:**
- [x] Success message shown
- [x] Testimonial does NOT appear on home page yet (needs admin approval)

**DB check:**
```sql
SELECT client_name, quote, approved FROM testimonials
ORDER BY submitted_at DESC LIMIT 1;
-- approved = false
```

### 4.8 Billing Page `/portal/billing`
**Free tier client:**
- [x] Shows "Free" plan
- [x] Shows trial expiry date
- [x] Shows upgrade options (Starter / Advantage)
- [x] No "Manage Billing" button

**Paid tier client:**
- [x] Shows plan name (Starter Plan / Advantage Plan)
- [x] "Manage Billing" button opens Stripe Customer Portal
- [x] Upgrade buttons (Starter / Advantage) visible and redirect to Stripe Checkout
- [x] Upgrade completes → plan_tier updated, dashboard reflects new tier

---

## 5 · Admin Dashboard

Log in as `mjmfinancialcoaching@gmail.com` (or `markert.wla@gmail.com`).

### 5.1 Dashboard `/admin/dashboard`
- [x] Stat cards show: Total Clients, Active Coaches, Bookings This Month, Inactive Clients
- [x] Numbers match DB counts:

```sql
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'client') AS total_clients,
  (SELECT COUNT(*) FROM coaches WHERE is_active = true) AS active_coaches,
  (SELECT COUNT(*) FROM bookings
   WHERE status = 'confirmed'
   AND start_time_utc >= date_trunc('month', now())) AS bookings_this_month;
```

### 5.2 Clients `/admin/clients`
- [x] All registered clients appear in the list
- [x] Filter by client_type works (individual, couple, property_tenant, nonprofit_individual)
- [x] Plan tier badge shows correctly
- [x] Free trial expiry date is editable inline (click the date → date picker appears → change → blur to save)
- [x] "5d ago" last active timestamp shows

**Verify trial extension saves:**
```sql
SELECT email, free_trial_expires_at FROM profiles WHERE role = 'client';
```

### 5.3 Promo Codes `/admin/codes`

**Create a code:**
1. Click **New Promo Code**
2. Fill in: Code (e.g. `TESTPM01`), Partner Type (property_management), Partner Name, Assigned Tier (bronze), Max Uses (10), Expiry Date (optional)
3. Click Create

- [x] Code appears in the list
- [x] Status shows "Active"

**Validate the code works (public endpoint):**
```
POST /api/codes/validate  body: { "code": "TESTPM01" }
```
- [x] Returns `{ valid: true, assigned_tier: "bronze" }`

**Revoke a code:**
- [x] Click revoke icon → code status changes to "Revoked"
- [x] Attempting to use the code at registration → error message

### 5.4 Coaches `/admin/coaches`

**Add a coach:**
1. Click **Add Coach**
2. Fill: Email (a fresh email address), Display Name, Specialty, Bio, Timezone, Photo URL (optional)
3. Click **Invite Coach**

**Expected:**
- [x] Coach appears in the list with "Active" status
- [x] Supabase sends an invite email to that address
- [x] DB has a row in `coaches` table and `profiles` with `role = 'coach'`

```sql
SELECT p.email, p.role, c.display_name, c.is_active
FROM coaches c JOIN profiles p ON p.id = c.id
ORDER BY c.display_name;
```

**Edit a coach:**
- [x] Click pencil icon → modal opens with current values
- [x] Change bio → Save → list updates

**Deactivate a coach:**
- [x] Click power-off icon → confirmation modal
- [x] Confirm → coach shows "Inactive"
- [x] Inactive coach does NOT appear on `/about` page or in booking coach picker
- [x] Reactivate → coach reappears

### 5.5 Bookings `/admin/bookings`
- [x] All bookings appear in the table
- [x] Filter by status (confirmed / cancelled / flagged) works
- [x] Click **Cancel** on a booking → status changes to "cancelled"

**Verify session credit restored on cancel:**
```sql
SELECT sessions_used_this_month FROM profiles WHERE id = 'client-uuid';
-- Should be 1 less than before the cancel
```

### 5.6 Group Sessions `/admin/group-sessions`

**Schedule a session:**
1. Click **New Group Session**
2. Pick a date, enter a Join link (e.g. Zoom URL), add coaches present
3. Save

- [x] Session appears in list
- [x] Clients can now see it on `/portal/group-sessions`

**Add recording after session:**
- [x] Edit the session → paste recording URL → save
- [x] Clients see "Watch Recording" link on `/portal/group-sessions`

### 5.7 Testimonials `/admin/testimonials`
- [x] Pending testimonials (submitted by clients in Section 4.7) appear here
- [x] Click **Approve** → testimonial status changes
- [x] Go to `/` home page → approved testimonial now appears in the Testimonials section
- [x] Click **Remove** → testimonial disappears from home page

### 5.8 PM Managers `/admin/managers`

**Invite a property manager:**
1. Click **Invite PM Manager**
2. Enter email address
3. Click Invite

- [x] Supabase sends invite email to PM
- [x] PM accepts invite → redirected to `/manager/dashboard`
- [x] PM appears in the managers list

### 5.9 Partners `/admin/partners`
- [ ] Add a partner (property management or nonprofit)
- [ ] Partner appears in the list with type, contact name, contact email

### 5.10 Settings `/admin/settings`
- [ ] Update admin display name and timezone → save
- [ ] Changes persist after page reload

```sql
SELECT first_name, last_name, timezone FROM profiles WHERE email = 'mjmfinancialcoaching@gmail.com';
```

---

## 6 · Coach Dashboard

**Pre-condition:** Admin must have added you as a coach (Section 5.4) and you've accepted the invite.

Log in with the invited coach email.

### 6.1 Dashboard `/coach/dashboard`
- [ ] Shows stat cards: Sessions This Month, Total Clients, Today's Sessions, Inactivity Alerts
- [ ] Upcoming sessions list shows booked sessions

### 6.2 Availability `/coach/availability`

**Set availability:**
1. Pick day of week (e.g. Monday)
2. Set start time and end time (e.g. 9:00 AM – 5:00 PM)
3. Click Add

- [ ] Slot appears in the availability list
- [ ] Repeat for several days
- [ ] Go to a CLIENT account → `/portal/book` → coach's slots now appear as bookable

**DB check:**
```sql
SELECT day_of_week, start_time_utc, end_time_utc
FROM availability WHERE coach_id = 'your-coach-uuid';
```

**Remove availability:**
- [ ] Delete a slot → it disappears
- [ ] Client booking page no longer shows those slots

### 6.3 Clients `/coach/clients`
- [ ] Lists all clients who have non-cancelled bookings with this coach
- [ ] Shows plan tier, sessions used this month, last active date

### 6.4 Sessions `/coach/sessions`

**After a client books a session:**
- [ ] Session appears in "Upcoming" tab
- [ ] After session date: session moves to "Past" tab

**Mark as attended:**
- [ ] Toggle attended → saves
- [ ] Mark as no-show → saves

**Add a note:**
- [ ] Click note field → type note text → blur to save
- [ ] Note persists on page reload

**Cancel a session:**
- [ ] Click Cancel → confirmation → session status changes to "cancelled"
- [ ] Client receives cancellation email
- [ ] Client's `sessions_used_this_month` decremented

### 6.5 Group Attendance `/coach/attendance`
**Pre-condition:** Admin has scheduled a group session (Section 5.6).

1. Select the group session from the picker
2. Mark individual clients as attended/not attended

- [ ] Attendance saves correctly
- [ ] Clients can see their attendance badge on `/portal/group-sessions`

```sql
SELECT client_id, attended FROM group_session_attendance
WHERE session_id = 'your-session-uuid';
```

### 6.6 Coach Profile `/coach/profile`
- [ ] Edit display name, bio, specialty, photo URL, timezone
- [ ] Save → changes appear on `/about` page coach cards

```sql
SELECT display_name, bio, specialty, photo_url, timezone
FROM coaches WHERE id = 'your-coach-uuid';
```

---

## 7 · Property Manager Dashboard

**Pre-condition:** Admin has invited a PM manager (Section 5.8) who has accepted the invite.

Log in as the PM.

### 7.1 Dashboard `/manager/dashboard`
- [ ] Stat cards show: Total Tenants, Active Codes, Sessions This Month, Attendance Rate
- [ ] **Quick Generate Code** button → generates a new promo code → copies to clipboard
- [ ] Active codes preview shows recently created codes

### 7.2 My Tenants `/manager/tenants`
- [ ] Lists tenants who registered using this PM's promo codes
- [ ] Shows plan tier, sessions used, last active

### 7.3 Promo Codes `/manager/codes`
- [ ] PM's codes appear here
- [ ] Quick generate creates a new `TFS-XXXXXX` code

### 7.4 Attendance `/manager/attendance`
- [ ] Shows group session and 1-on-1 attendance for PM's tenants (last 90 days)

---

## 8 · Email Flows (Resend)

All emails require `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to be set.

| Trigger | Expected email | Recipient |
|---------|---------------|-----------|
| New individual registers | Welcome email with plan name | New client |
| Client books a session | Booking confirmation | Client |
| Client books a session | Booking notification | Coach |
| Admin cancels a booking | Cancellation notice | Client |
| Contact form submitted | Contact inquiry | Admin (`tenantfinancialsolutions@gmail.com`) |
| Admin adds a coach | Invite email with set-password link | Coach |
| Admin invites a PM | Invite email with set-password link | PM |
| Group session 3 days away | Reminder email | All active paid clients |

**To test each:**
- [x] New individual registers → Welcome email ✓
- [x] Client books a session → Booking confirmation to client ✓
- [x] Client books a session → Booking notification to coach ✓
- [x] Contact form submitted → Contact inquiry to admin ✓
- [x] Admin adds a coach → Invite email ✓
- [x] Admin invites a PM → Invite email ✓
- [ ] Admin cancels a booking → Cancellation notice to client
- [ ] Group session 3 days away → Reminder email to paid clients (test via cron — Section 10.2)
- [ ] Payment fails → Payment failed email to client (trigger via Stripe test card `4000 0000 0000 0341`)
- [ ] Check Resend Dashboard → Emails for delivery status and any bounces

---

## 9 · Stripe & Billing

> Use Stripe **test mode** keys during local testing. No real charges occur.

### 9.1 Webhook Setup (required for subscription sync)
Stripe must be configured to send webhook events to your endpoint:

**Locally (using Stripe CLI):**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret → add to .env.local as STRIPE_WEBHOOK_SECRET
```

**On Vercel:** Add webhook endpoint in Stripe Dashboard → Developers → Webhooks:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 9.2 Test Paid Registration Flow
1. Register as a paid tier (Starter Plan — bronze)
2. Complete payment via Stripe Checkout with test card `4242 4242 4242 4242`

**Expected after successful payment:**
- [x] Subscription status `active`
- [x] Webhook fires `customer.subscription.created` → 200 response
- [x] DB profile `plan_tier` = `bronze`
- [x] Redirected to `/portal/dashboard` with success banner

### 9.3 Billing Portal
1. Log in as a paid client
2. Go to `/portal/billing` → click **Manage Billing**
3. Stripe Customer Portal opens in new tab
4. Client can update payment method, view invoices, cancel subscription

**On cancellation:**
- [x] Webhook fires `customer.subscription.deleted`
- [x] DB profile `plan_tier` reverts to `free`

---

## 10 · Cron Jobs

### 10.1 Monthly Session Reset
The cron at `POST /api/cron/reset-sessions` fires on the 1st of each month (via Vercel cron).

**Test manually (requires CRON_SECRET):**
```bash
curl -X POST https://your-domain.com/api/cron/reset-sessions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected:**
- [ ] All client `sessions_used_this_month` values reset to 0

```sql
SELECT email, sessions_used_this_month FROM profiles WHERE role = 'client';
-- All should be 0 after the cron runs
```

### 10.2 Group Session Reminders
The cron at `POST /api/cron/group-session-reminders` runs daily at 8am UTC.

- [ ] Schedule a group session 3 days from today (Section 5.6)
- [ ] Trigger the cron manually or wait for the scheduled run
- [ ] All active paid clients should receive a reminder email

---

## 11 · Edge Cases & Security

- [ ] Visiting `/admin/*` as a client → redirected to `/login`
- [ ] Visiting `/coach/*` as a client → redirected to `/login`
- [ ] Visiting `/portal/*` as an admin → redirected to `/login` (not their role)
- [ ] Direct `POST /api/booking` without auth → 401 response
- [ ] Direct `POST /api/admin/coaches` without admin auth → 403 response
- [ ] Booking when `free_trial_expires_at` has passed → blocked with trial expired message
- [ ] Promo code with `max_uses` reached → registration shows "invalid or fully used" error
- [ ] Deactivated coach does not appear in booking coach picker

---

## 12 · Quick Database Reference

**Check a user's full profile:**
```sql
SELECT id, email, role, plan_tier, client_type, sessions_used_this_month,
       free_trial_expires_at, stripe_customer_id, promo_code_used
FROM profiles WHERE email = 'someone@example.com';
```

**List all coaches and their active status:**
```sql
SELECT p.email, c.display_name, c.specialty, c.is_active, c.timezone
FROM coaches c JOIN profiles p ON p.id = c.id ORDER BY c.display_name;
```

**List all active promo codes:**
```sql
SELECT code, partner_name, assigned_tier, uses_count, max_uses, is_active, expires_at
FROM promo_codes WHERE is_active = true ORDER BY created_at DESC;
```

**All confirmed bookings this month:**
```sql
SELECT b.start_time_utc, b.status,
       cp.email AS client_email, ch.display_name AS coach_name
FROM bookings b
JOIN profiles cp ON cp.id = b.client_id
JOIN coaches ch ON ch.id = b.coach_id
WHERE b.status = 'confirmed'
  AND b.start_time_utc >= date_trunc('month', now())
ORDER BY b.start_time_utc;
```

**Pending testimonials:**
```sql
SELECT client_name, quote, submitted_at FROM testimonials
WHERE approved = false ORDER BY submitted_at DESC;
```

**Reset a specific client's session counter (for testing):**
```sql
UPDATE profiles SET sessions_used_this_month = 0
WHERE email = 'your-test-client@gmail.com';
```

**Manually promote a user to admin:**
```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'someone@example.com';
```
