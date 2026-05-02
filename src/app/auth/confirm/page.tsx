'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'


function roleToPath(role: string | undefined) {
  if (role === 'admin')            return '/admin/dashboard'
  if (role === 'coach')            return '/coach/dashboard'
  if (role === 'property_manager') return '/manager/dashboard'
  return '/portal/dashboard'
}

export default function AuthConfirmPage() {
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function consumeHashSession() {
      // @supabase/ssr uses PKCE (code= query params) so it won't auto-process
      // the #access_token= hash that Supabase's OTP invite flow delivers.
      // Parse it manually and call setSession so the client gets the token.
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const tokenType = params.get('type')

        const { data: { session } } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        if (session?.user) {
          // Invite links require the user to set a password before continuing.
          if (tokenType === 'invite') {
            router.replace('/auth/set-password')
            return
          }
          const role = (session.user.user_metadata?.role ?? session.user.app_metadata?.role) as string | undefined
          router.replace(roleToPath(role))
          return
        }
      }

      // Fallback: session may already be set (e.g. PKCE code= flow)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const role = (session.user.user_metadata?.role ?? session.user.app_metadata?.role) as string | undefined
        router.replace(roleToPath(role))
      }
    }

    consumeHashSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 100%)' }}
    >
      <Image src="/images/logo.png" alt="Tenant Financial Solutions" width={180} height={54} className="h-12 w-auto mb-8" />
      <div className="flex items-center gap-3 text-white">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-lg font-medium">Setting up your account…</span>
      </div>
    </div>
  )
}
