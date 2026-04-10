import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user

      // Bootstrap: promote to admin if email is in ADMIN_EMAILS
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
        try {
          const service = createServiceClient()
          await service.from('profiles').update({ role: 'admin' }).eq('id', user.id)
        } catch {
          // Non-fatal — can be promoted manually via SQL if this fails
        }
      }

      // Redirect based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'client'
      if (role === 'admin') return NextResponse.redirect(`${origin}/admin/dashboard`)
      if (role === 'coach') return NextResponse.redirect(`${origin}/coach/dashboard`)
      return NextResponse.redirect(`${origin}/portal/dashboard`)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback`)
}
