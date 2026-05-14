'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Minus } from 'lucide-react'

type GroupSession = {
  id: string
  session_date: string
}

type Client = {
  id: string
  first_name: string
  last_name: string
  plan_tier: string
}

type AttendanceRecord = {
  session_id: string
  client_id: string
  attended: boolean
}

type Props = {
  groupSessions: GroupSession[]
  clients: Client[]
  attendance: AttendanceRecord[]
}

const TIER_LABEL: Record<string, string> = {
  free: 'Free', bronze: 'Affiliate', silver: 'Strategic Partner',
}

export default function AttendanceClient({ groupSessions, clients, attendance: initialAttendance }: Props) {
  const [selectedId, setSelectedId] = useState<string>(groupSessions[0]?.id ?? '')
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendance)
  const [saving, setSaving] = useState<string | null>(null)

  const session = groupSessions.find(s => s.id === selectedId)
  const today = new Date().toISOString().split('T')[0]
  const isFuture = session ? session.session_date > today : false

  function getAttendance(clientId: string): boolean | null {
    const r = records.find(r => r.session_id === selectedId && r.client_id === clientId)
    return r ? r.attended : null
  }

  async function mark(clientId: string, attended: boolean) {
    const key = `${selectedId}:${clientId}`
    setSaving(key)
    const res = await fetch('/api/coach/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: selectedId, client_id: clientId, attended }),
    })
    setSaving(null)
    if (res.ok) {
      setRecords(prev => {
        const filtered = prev.filter(r => !(r.session_id === selectedId && r.client_id === clientId))
        return [...filtered, { session_id: selectedId, client_id: clientId, attended }]
      })
    }
  }

  if (!groupSessions.length) {
    return <div className="card text-center py-12 text-tfs-slate">No group sessions scheduled yet.</div>
  }

  return (
    <div className="space-y-6">
      {/* Session picker */}
      <div className="card">
        <label className="block text-xs font-medium text-tfs-slate mb-2">Select Group Session</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tfs-teal"
        >
          {groupSessions.map(s => (
            <option key={s.id} value={s.id}>
              {new Date(s.session_date + 'T00:00:00Z').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Roster */}
      <div className="card">
        <h2 className="font-serif font-bold text-tfs-navy text-lg mb-1">
          {session
            ? new Date(session.session_date + 'T00:00:00Z').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
              })
            : 'Roster'}
        </h2>
        <p className="text-xs text-tfs-slate mb-5">
          Mark each client as attended or no-show. Only your assigned clients are shown.
        </p>

        {isFuture && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            Attendance can only be recorded after the session date has passed.
          </div>
        )}

        {clients.length === 0 ? (
          <p className="text-tfs-slate text-sm text-center py-8">No clients to display.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {clients.map(client => {
              const att    = getAttendance(client.id)
              const key    = `${selectedId}:${client.id}`
              const busy   = saving === key

              return (
                <div key={client.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-tfs-navy text-sm">
                      {client.first_name} {client.last_name}
                    </p>
                    <span className="text-xs text-tfs-slate">
                      {TIER_LABEL[client.plan_tier] ?? client.plan_tier} plan
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status label */}
                    {att === null && <Minus size={14} className="text-gray-300" />}
                    {att === true  && <span className="text-xs font-medium text-green-600">Attended</span>}
                    {att === false && <span className="text-xs font-medium text-red-500">No-show</span>}

                    {/* Toggle buttons */}
                    <button
                      onClick={() => mark(client.id, true)}
                      disabled={busy || isFuture}
                      title={isFuture ? 'Session has not occurred yet' : 'Mark attended'}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        att === true ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-600 hover:bg-green-50'
                      }`}>
                      <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => mark(client.id, false)}
                      disabled={busy || isFuture}
                      title={isFuture ? 'Session has not occurred yet' : 'Mark no-show'}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        att === false ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                      }`}>
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {clients.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-6 text-xs text-tfs-slate">
            <span>Attended: <strong className="text-green-600">{records.filter(r => r.session_id === selectedId && r.attended).length}</strong></span>
            <span>No-show: <strong className="text-red-500">{records.filter(r => r.session_id === selectedId && !r.attended).length}</strong></span>
            <span>Not marked: <strong>{clients.length - records.filter(r => r.session_id === selectedId).length}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
