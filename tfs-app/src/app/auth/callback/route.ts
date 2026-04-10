import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // Collect cookies Supabase wants to set during the exchange.
    // In Next.js 14 Route Handlers cookies() is read-only, so we track
    // them here and apply them directly to the redirect response.
    const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(incoming) {
            incoming.forEach(c => cookiesToSet.push(c))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[auth/callback] exchange result:', {
      hasUser: !!data?.user,
      userId: data?.user?.id,
      email: data?.user?.email,
      cookieCount: cookiesToSet.length,
      cookieNames: cookiesToSet.map(c => c.name),
      error: error?.message,
    })

    if (!error && data.user) {
      const user = data.user

      // Bootstrap: promote to admin if email is in ADMIN_EMAILS
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
        try {
          const service = createServiceClient()
          await service.from('profiles').update({ role: 'admin' }).eq('id', user.id)
        } catch {
          // Non-fatal — can be promoted via SQL if this fails
        }
      }

      // Determine destination based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'client'
      const redirectPath =
        role === 'admin' ? '/admin/dashboard' :
        role === 'coach' ? '/coach/dashboard' :
        '/portal/dashboard'

      const response = NextResponse.redirect(`${origin}${redirectPath}`)

      // Apply session cookies to the redirect so the browser receives them
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
      })

      return response
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback`)
}
