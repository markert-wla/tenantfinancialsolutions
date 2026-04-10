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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Bootstrap: promote to admin if email is in ADMIN_EMAILS
        if (ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
          const service = createServiceClient()
          await service.from('profiles').update({ role: 'admin' }).eq('id', user.id)
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
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback`)
}
