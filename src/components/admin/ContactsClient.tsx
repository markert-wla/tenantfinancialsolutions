'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, CheckCircle, UserCheck, Mail, Phone } from 'lucide-react'

type Submission = {
  id: string
  name: string
  email: string
  phone: string | null
  inquiry_type: string
  message: string
  status: 'new' | 'read' | 'assigned' | 'resolved'
  assigned_coach_id: string | null
  submitted_at: string
  coaches: { display_name: string; email: string } | null
}

type Coach = { id: string; display_name: string }

const STATUS_BADGE: Record<string, string> = {
  new:      'bg-red-100 text-red-700',
  read:     'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}

const TYPE_BADGE: Record<string, string> = {
  individual:         'bg-tfs-teal/10 text-tfs-teal',
  'property-manager': 'bg-amber-100 text-amber-700',
  nonprofit:          'bg-purple-100 text-purple-700',
  workshops:          'bg-orange-100 text-orange-700',
  general:            'bg-gray-100 text-gray-600',
}

const TYPE_LABEL: Record<string, string> = {
  individual:         'Individual',
  'property-manager': 'Property Mgmt',
  nonprofit:          'Non-Profit',
  workshops:          'Workshops',
  general:            'General',
}

type Filter = 'new' | 'assigned' | 'resolved' | 'all'

export default function ContactsClient({
  submissions: initial,
  coaches,
}: {
  submissions: Submission[]
  coaches: Coach[]
}) {
  const router = useRouter()
  const [filter, setFilter]       = useState<Filter>('new')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [loading, setLoading]     = useState<string | null>(null)

  const filtered = initial.filter(s => {
    if (filter === 'all') return true
    if (filter === 'new') return s.status === 'new' || s.status === 'read'
    return s.status === filter
  })

  const newCount      = initial.filter(s => s.status === 'new').length
  const assignedCount = initial.filter(s => s.status === 'assigned').length

  async function patch(id: string, payload: object) {
    setLoading(id)
    await fetch(`/api/admin/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(null)
    router.refresh()
  }

  function fmt(iso: string) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  }

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'new',      label: 'Inbox',    count: newCount || undefined },
    { key: 'assigned', label: 'Assigned', count: assignedCount || undefined },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all',      label: 'All' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Contact Submissions</h1>
        <span className="text-sm text-tfs-slate">{initial.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-tfs-navy text-white'
                : 'bg-white text-tfs-slate hover:text-tfs-navy border border-gray-200'
            }`}
          >
            {f.label}
            {f.count ? (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                filter === f.key ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
              }`}>
                {f.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-tfs-slate">
          {filter === 'new' ? 'Inbox is clear.' : `No ${filter} submissions.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className={`card transition-shadow ${s.status === 'new' ? 'border-l-4 border-l-red-400' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-tfs-navy">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[s.inquiry_type] ?? TYPE_BADGE.general}`}>
                      {TYPE_LABEL[s.inquiry_type] ?? s.inquiry_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status]}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{fmt(s.submitted_at)}</span>
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-4 text-sm text-tfs-slate mb-2">
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-tfs-teal transition-colors">
                      <Mail size={13} /> {s.email}
                    </a>
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} /> {s.phone}
                      </span>
                    )}
                    {s.coaches && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <UserCheck size={13} /> Assigned to {s.coaches.display_name}
                      </span>
                    )}
                  </div>

                  {/* Message preview / expand */}
                  <div>
                    <p className={`text-sm text-tfs-slate ${expanded === s.id ? '' : 'line-clamp-2'}`}>
                      {s.message}
                    </p>
                    {s.message.length > 120 && (
                      <button
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                        className="text-xs text-tfs-teal hover:underline mt-1 flex items-center gap-0.5"
                      >
                        {expanded === s.id ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {s.status !== 'resolved' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {/* Assign to coach */}
                    <select
                      defaultValue={s.assigned_coach_id ?? ''}
                      disabled={loading === s.id}
                      onChange={e => patch(s.id, {
                        assigned_coach_id: e.target.value || null,
                        status: e.target.value ? 'assigned' : 'read',
                      })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-tfs-teal bg-white text-tfs-slate"
                    >
                      <option value="">Assign to coach…</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>{c.display_name}</option>
                      ))}
                    </select>

                    {/* Mark read (if new) */}
                    {s.status === 'new' && (
                      <button
                        onClick={() => patch(s.id, { status: 'read' })}
                        disabled={loading === s.id}
                        className="text-xs text-gray-500 hover:text-tfs-navy border border-gray-200 rounded-lg px-2 py-1.5 bg-white transition-colors"
                      >
                        Mark read
                      </button>
                    )}

                    {/* Resolve */}
                    <button
                      onClick={() => patch(s.id, { status: 'resolved', assigned_coach_id: null })}
                      disabled={loading === s.id}
                      className="text-xs text-green-600 hover:text-green-700 border border-green-200 rounded-lg px-2 py-1.5 bg-white flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle size={12} /> Resolve
                    </button>
                  </div>
                )}

                {s.status === 'resolved' && (
                  <button
                    onClick={() => patch(s.id, { status: 'read' })}
                    disabled={loading === s.id}
                    className="text-xs text-tfs-slate hover:text-tfs-navy border border-gray-200 rounded-lg px-2 py-1.5 bg-white shrink-0 transition-colors"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
