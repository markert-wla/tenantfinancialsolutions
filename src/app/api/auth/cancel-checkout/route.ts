import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authLimiter, checkRateLimit } from '@/lib/ratelimit'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')

  // This deletes an auth user without a session (it is Stripe's cancel_url, so
  // the visitor has no cookie yet). The data constraints below are the real
  // guard; the rate limit stops the endpoint being used to probe user ids.
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { allowed } = await checkRateLimit(authLimiter, ip)

  if (uid && allowed) {
    const service = createServiceClient()

    // Only delete if account has no active subscription and was created within the last 2 hours.
    // This prevents this endpoint from ever touching a real paying customer.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: profile } = await service
      .from('profiles')
      .select('id, stripe_subscription_id, created_at')
      .eq('id', uid)
      .is('stripe_subscription_id', null)
      .gte('created_at', twoHoursAgo)
      .single()

    if (profile) {
      await service.auth.admin.deleteUser(uid)
    }
  }

  return NextResponse.redirect(`${siteUrl}/register?cancelled=1`)
}
