import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Stub: integrate with your email list provider (Resend audiences, Mailchimp, etc.)
  const { email } = await req.json()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  console.log('[Subscribe stub] New subscriber:', email)
  return NextResponse.json({ ok: true })
}
