import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Tenant Financial Solutions — Real People, Real Coaching'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 60%, #0F1B30 100%)',
          fontFamily: 'serif',
          padding: '80px',
        }}
      >
        {/* Gold accent bar */}
        <div
          style={{
            width: '80px',
            height: '6px',
            background: '#C9A84C',
            borderRadius: '3px',
            marginBottom: '40px',
          }}
        />

        <div
          style={{
            fontSize: '52px',
            fontWeight: '700',
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          Tenant Financial Solutions
        </div>

        <div
          style={{
            fontSize: '28px',
            color: '#C9A84C',
            textAlign: 'center',
            fontWeight: '600',
            letterSpacing: '0.05em',
            marginBottom: '40px',
          }}
        >
          Real People — Real Coaching
        </div>

        <div
          style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.5,
          }}
        >
          Personal financial coaching for tenants, property managers, and non-profits.
        </div>

        {/* Bottom gold bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '8px',
            background: '#C9A84C',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
