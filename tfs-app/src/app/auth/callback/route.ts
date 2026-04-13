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

    if (!error && data.user) {
      const user = data.user
      const service = createServiceClient()

      // Bootstrap: promote to admin if email is in ADMIN_EMAILS, and backfill
      // name fields for Google OAuth users (Google sends full_name, not first/last).
      const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')
      const meta    = user.user_metadata ?? {}
      const profilePatch: Record<string, unknown> = {}

      if (isAdmin) profilePatch.role = 'admin'

      if (!meta.first_name && meta.full_name) {
        const parts = (meta.full_name as string).trim().split(/\s+/)
        profilePatch.first_name = parts[0] ?? ''
        profilePatch.last_name  = parts.slice(1).join(' ') ?? ''
      }

      if (Object.keys(profilePatch).length > 0) {
        try {
          await service.from('profiles').update(profilePatch).eq('id', user.id)
        } catch {
          // Non-fatal
        }
      }

      // Read role back via service client to avoid stale read after the update above
      const { data: profile } = await service
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
