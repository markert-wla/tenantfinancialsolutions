'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

type Testimonial = {
  id: string
  client_name: string
  quote: string
  plan_tier: string | null
  approved: boolean
  submitted_at: string
}

export default function TestimonialsClient({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function setApproved(id: string, approved: boolean) {
    setLoading(id)
    await fetch(`/api/admin/testimonials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    })
    setLoading(null)
    router.refresh()
  }

  async function deleteTestimonial(id: string) {
    setLoading(id)
    await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  const pending  = testimonials.filter(t => !t.approved)
  const approved = testimonials.filter(t => t.approved)

  return (
    <div>
      <h1 className="text-3xl font-serif font-bold text-tfs-navy mb-8">Testimonials</h1>

      {testimonials.length === 0 && (
        <p className="text-tfs-slate text-sm">No testimonials submitted yet.</p>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif font-bold text-tfs-navy text-xl mb-4">
            Pending Review
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">{pending.length}</span>
          </h2>
          <div className="space-y-4">
            {pending.map(t => (
              <TestimonialCard key={t.id} t={t} loading={loading} onApprove={() => setApproved(t.id, true)} onReject={() => deleteTestimonial(t.id)} />
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h2 className="font-serif font-bold text-tfs-navy text-xl mb-4">
            Approved
            <span className="ml-2 text-sm font-normal text-tfs-slate">(showing on homepage)</span>
          </h2>
          <div className="space-y-4">
            {approved.map(t => (
              <TestimonialCard key={t.id} t={t} loading={loading} onApprove={null} onReject={() => setApproved(t.id, false)} rejectLabel="Remove" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TestimonialCard({
  t,
  loading,
  onApprove,
  onReject,
  rejectLabel = 'Reject',
}: {
  t: Testimonial
  loading: string | null
  onApprove: (() => void) | null
  onReject: (() => void) | null
  rejectLabel?: string
}) {
  const busy = loading === t.id
  return (
    <div className="card flex gap-4">
      <div className="flex-1">
        <p className="text-tfs-slate italic leading-relaxed mb-2">&ldquo;{t.quote}&rdquo;</p>
        <div className="flex items-center gap-3 text-xs text-tfs-slate">
          <span className="font-medium text-tfs-navy">{t.client_name}</span>
          {t.plan_tier && (
            <span className="capitalize">{t.plan_tier} plan</span>
          )}
          <span>
            {new Date(t.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-2 shrink-0">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <CheckCircle size={14} /> Approve
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} /> {rejectLabel}
          </button>
        )}
      </div>
    </div>
  )
}
