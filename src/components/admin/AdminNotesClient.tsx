'use client'

import { useState } from 'react'
import { Lock, Share2, FileText, Calendar } from 'lucide-react'

type SessionNote = {
  id: string
  start_time_utc: string
  notes: string | null
  client_notes: string | null
  client: { id: string; first_name: string; last_name: string; email: string } | null
  coach_name: string | null
}

type GeneralNote = {
  id: string
  note: string
  created_at: string
  client: { id: string; first_name: string; last_name: string; email: string } | null
  coach_name: string | null
}

type Tab = 'session' | 'general'

const ET = 'America/New_York'

function fmtSession(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET, month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

export default function AdminNotesClient({
  sessionNotes,
  generalNotes,
}: {
  sessionNotes: SessionNote[]
  generalNotes: GeneralNote[]
}) {
  const [tab, setTab] = useState<Tab>('session')
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()

  const filteredSession = sessionNotes.filter(n => {
    if (!q) return true
    const name = `${n.client?.first_name} ${n.client?.last_name}`.toLowerCase()
    const coach = (n.coach_name ?? '').toLowerCase()
    const text = `${n.notes ?? ''} ${n.client_notes ?? ''}`.toLowerCase()
    return name.includes(q) || coach.includes(q) || text.includes(q)
  })

  const filteredGeneral = generalNotes.filter(n => {
    if (!q) return true
    const name = `${n.client?.first_name} ${n.client?.last_name}`.toLowerCase()
    const coach = (n.coach_name ?? '').toLowerCase()
    return name.includes(q) || coach.includes(q) || n.note.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Notes</h1>
        <input
          type="search"
          placeholder="Search by client, coach, or note text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-tfs-teal"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('session')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'session' ? 'bg-tfs-navy text-white' : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
          }`}
        >
          <Calendar size={14} />
          Session Notes
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === 'session' ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
            {filteredSession.length}
          </span>
        </button>
        <button
          onClick={() => setTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'general' ? 'bg-tfs-navy text-white' : 'bg-white text-tfs-slate border border-gray-200 hover:border-tfs-teal'
          }`}
        >
          <FileText size={14} />
          Client Notes
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === 'general' ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
            {filteredGeneral.length}
          </span>
        </button>
      </div>

      {/* Session notes tab */}
      {tab === 'session' && (
        <div className="card overflow-hidden p-0">
          {filteredSession.length === 0 ? (
            <p className="text-tfs-slate text-sm py-8 px-6">No session notes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Session</th>
                    <th className="text-left px-4 py-3 font-semibold">Client</th>
                    <th className="text-left px-4 py-3 font-semibold">Coach</th>
                    <th className="text-left px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSession.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors align-top">
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-tfs-slate">
                        {fmtSession(n.start_time_utc)} ET
                      </td>
                      <td className="px-4 py-3">
                        {n.client ? (
                          <>
                            <p className="font-medium text-tfs-navy">{n.client.first_name} {n.client.last_name}</p>
                            <p className="text-xs text-tfs-slate">{n.client.email}</p>
                          </>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-tfs-slate">{n.coach_name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-sm space-y-1.5">
                        {n.notes && (
                          <p className="text-xs text-tfs-slate flex items-start gap-1.5">
                            <Lock size={11} className="shrink-0 mt-0.5 text-gray-400" />
                            <span className="italic">{n.notes}</span>
                          </p>
                        )}
                        {n.client_notes && (
                          <p className="text-xs text-tfs-teal flex items-start gap-1.5">
                            <Share2 size={11} className="shrink-0 mt-0.5" />
                            <span className="italic">{n.client_notes}</span>
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* General client notes tab */}
      {tab === 'general' && (
        <div className="card overflow-hidden p-0">
          {filteredGeneral.length === 0 ? (
            <p className="text-tfs-slate text-sm py-8 px-6">No general client notes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Client</th>
                    <th className="text-left px-4 py-3 font-semibold">Coach</th>
                    <th className="text-left px-4 py-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredGeneral.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors align-top">
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-tfs-slate">
                        {fmtDate(n.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {n.client ? (
                          <>
                            <p className="font-medium text-tfs-navy">{n.client.first_name} {n.client.last_name}</p>
                            <p className="text-xs text-tfs-slate">{n.client.email}</p>
                          </>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-tfs-slate">{n.coach_name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-sm text-tfs-navy whitespace-pre-wrap">{n.note}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
