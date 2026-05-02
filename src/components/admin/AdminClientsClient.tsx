'use client'
import { useState, useMemo } from 'react'
import { Filter, CalendarClock, CheckSquare, Square, Loader2, Trash2, PlusCircle, Search, DollarSign, X } from 'lucide-react'

const TIER_LABEL: Record<string, string> = {
  free: 'Free', bronze: 'Starter', silver: 'Advantage',
}
const TIER_COLOR: Record<string, string> = {
  free:   'bg-gray-100 text-gray-600',
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-200 text-slate-700',
}
const TYPE_LABEL: Record<string, string> = {
  individual:           'Individual',
  couple:               'Couple',
  property_tenant:      'PM Tenant',
  nonprofit_individual: 'Non-Profit',
}
const TYPE_COLOR: Record<string, string> = {
  individual:           'bg-blue-100 text-blue-700',
  couple:               'bg-purple-100 text-purple-700',
  property_tenant:      'bg-orange-100 text-orange-700',
  nonprofit_individual: 'bg-green-100 text-green-700',
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  plan_tier: string
  client_type: string | null
  promo_code_used: string | null
  free_trial_expires_at: string | null
  sessions_used_this_month: number
  extra_sessions: number
  last_active_at: string
  is_active: boolean
  created_at: string
  stripe_customer_id: string | null
}

interface PMCode {
  code: string
  partner_name: string
}

interface Props {
  clients: Client[]
  pmCodes: PMCode[]
}

function toInputDate(iso: string | null) {
  if (!iso) return ''
  return iso.split('T')[0]
}
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export default function AdminClientsClient({ clients: initial, pmCodes }: Props) {
  const [clients, setClients]           = useState<Client[]>(initial)
  const [searchQuery, setSearchQuery]   = useState('')
  const [typeFilter, setTypeFilter]     = useState<string>('all')
  const [tierFilter, setTierFilter]     = useState<string>('all')
  const [pmFilter, setPmFilter]         = useState<string>('all')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkDate, setBulkDate]         = useState('')
  const [bulkPM, setBulkPM]             = useState('')
  const [savingId, setSavingId]         = useState<string | null>(null)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [bulkSaving, setBulkSaving]     = useState(false)
  const [grantingId, setGrantingId]     = useState<string | null>(null)
  const [grantAmount, setGrantAmount]   = useState<Record<string, string>>({})
  const [creditClient, setCreditClient] = useState<Client | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote]     = useState('')
  const [crediting, setCrediting]       = useState(false)
  const [toast, setToast]               = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return clients.filter(c => {
      if (q) {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase()
        const matchesSearch = name.includes(q) || c.email.toLowerCase().includes(q) || (c.promo_code_used ?? '').toLowerCase().includes(q)
        if (!matchesSearch) return false
      }
      if (typeFilter !== 'all' && c.client_type !== typeFilter) return false
      if (tierFilter !== 'all' && c.plan_tier !== tierFilter) return false
      if (pmFilter   !== 'all' && c.promo_code_used !== pmFilter) return false
      return true
    })
  }, [clients, searchQuery, typeFilter, tierFilter, pmFilter])

  // ── Selection ────────────────────────────────────────────────
  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }
  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    setSelected(next)
  }

  // ── Inline trial date save ───────────────────────────────────
  async function saveTrialDate(clientId: string, value: string) {
    setSavingId(clientId)
    try {
      const res = await fetch('/api/admin/clients/trial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: [clientId], expiresAt: value || null }),
      })
      if (!res.ok) throw new Error()
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, free_trial_expires_at: value ? value + 'T00:00:00Z' : null } : c
      ))
      showToast('Trial date updated')
    } catch {
      showToast('Failed to update trial date')
    } finally {
      setSavingId(null)
    }
  }

  // ── Delete client ────────────────────────────────────────────
  async function deleteClient(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This permanently removes their account and cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClients(prev => prev.filter(c => c.id !== id))
      showToast('Client deleted')
    } catch {
      showToast('Failed to delete client')
    } finally {
      setDeleting(null)
    }
  }

  // ── Bulk extend ──────────────────────────────────────────────
  async function applyBulk() {
    if (!bulkDate && !bulkPM) return
    setBulkSaving(true)
    try {
      const body: any = { expiresAt: bulkDate || null }
      if (bulkPM) {
        body.pmCode = bulkPM
      } else {
        body.clientIds = Array.from(selected)
      }
      const res = await fetch('/api/admin/clients/trial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const updatedExpiry = bulkDate ? bulkDate + 'T00:00:00Z' : null
      if (bulkPM) {
        setClients(prev => prev.map(c =>
          c.promo_code_used === bulkPM ? { ...c, free_trial_expires_at: updatedExpiry } : c
        ))
      } else {
        setClients(prev => prev.map(c =>
          selected.has(c.id) ? { ...c, free_trial_expires_at: updatedExpiry } : c
        ))
      }
      setSelected(new Set())
      setBulkDate('')
      setBulkPM('')
      showToast(`Updated ${data.updated} client${data.updated !== 1 ? 's' : ''}`)
    } catch (e: any) {
      showToast(e.message ?? 'Bulk update failed')
    } finally {
      setBulkSaving(false)
    }
  }

  // ── Grant extra session ──────────────────────────────────────
  async function grantSession(clientId: string) {
    const amount = parseInt(grantAmount[clientId] ?? '1', 10)
    if (isNaN(amount) || amount <= 0) return
    setGrantingId(clientId)
    try {
      const res = await fetch('/api/admin/clients/extra-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, amount }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, extra_sessions: data.extra_sessions } : c
      ))
      setGrantAmount(prev => ({ ...prev, [clientId]: '1' }))
      showToast(`${amount} extra session${amount !== 1 ? 's' : ''} granted`)
    } catch {
      showToast('Failed to grant session')
    } finally {
      setGrantingId(null)
    }
  }

  // ── Apply Stripe credit ──────────────────────────────────────
  async function applyCredit() {
    if (!creditClient || !creditAmount) return
    const dollars = parseFloat(creditAmount)
    if (isNaN(dollars) || dollars <= 0) return
    setCrediting(true)
    try {
      const res = await fetch('/api/admin/clients/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: creditClient.id, amountDollars: dollars, note: creditNote }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`$${dollars.toFixed(2)} credit applied to ${creditClient.first_name}'s next invoice`)
      setCreditClient(null)
      setCreditAmount('')
      setCreditNote('')
    } catch (e: any) {
      showToast(e.message ?? 'Failed to apply credit')
    } finally {
      setCrediting(false)
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div>
      {/* ── Search + Filter toolbar ─────────────────────────────── */}
      <div className="space-y-3 mb-5">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or promo code…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tfs-teal bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-tfs-slate">
            <Filter size={14} /> Filter:
          </div>

          {/* Client type */}
          <div className="flex gap-1 flex-wrap">
            {[['all', 'All Types'], ['individual', 'Individual'], ['couple', 'Couple'],
              ['property_tenant', 'PM Tenant'], ['nonprofit_individual', 'Non-Profit']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  typeFilter === val
                    ? 'bg-tfs-teal text-white border-tfs-teal'
                    : 'bg-white text-tfs-slate border-gray-200 hover:border-tfs-teal'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Plan tier */}
          <div className="flex gap-1 flex-wrap">
            {[['all', 'All Plans'], ['free', 'Free'], ['bronze', 'Starter'], ['silver', 'Advantage']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTierFilter(val)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  tierFilter === val
                    ? 'bg-tfs-navy text-white border-tfs-navy'
                    : 'bg-white text-tfs-slate border-gray-200 hover:border-tfs-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* PM group */}
          {pmCodes.length > 0 && (
            <select
              value={pmFilter}
              onChange={e => setPmFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-tfs-slate focus:outline-none focus:ring-2 focus:ring-tfs-teal bg-white"
            >
              <option value="all">All PM Groups</option>
              {pmCodes.map(p => (
                <option key={p.code} value={p.code}>{p.partner_name} ({p.code})</option>
              ))}
            </select>
          )}

          <span className="text-xs text-tfs-slate ml-auto">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────── */}
      <div className="mb-4 p-4 rounded-xl bg-tfs-teal-light border border-tfs-teal/20">
        <p className="text-sm font-semibold text-tfs-navy mb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-tfs-teal" /> Bulk Extend Trial
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-tfs-slate mb-1">New expiry date</label>
            <input
              type="date"
              value={bulkDate}
              onChange={e => setBulkDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-tfs-teal"
            />
          </div>
          <div>
            <label className="block text-xs text-tfs-slate mb-1">Apply to PM group (optional)</label>
            <select
              value={bulkPM}
              onChange={e => setBulkPM(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-tfs-teal bg-white"
            >
              <option value="">Use selected rows</option>
              {pmCodes.map(p => (
                <option key={p.code} value={p.code}>{p.partner_name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyBulk}
            disabled={bulkSaving || !bulkDate || (!bulkPM && selected.size === 0)}
            className="btn-primary text-sm py-1.5 disabled:opacity-50 flex items-center gap-2"
          >
            {bulkSaving && <Loader2 size={14} className="animate-spin" />}
            {bulkPM ? `Apply to all PM tenants` : `Apply to ${selected.size} selected`}
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={toggleAll} className="text-tfs-navy hover:text-tfs-teal">
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Plan</th>
                <th className="text-left px-4 py-3 font-semibold">Trial Expires</th>
                <th className="text-left px-4 py-3 font-semibold">Sessions</th>
                <th className="text-left px-4 py-3 font-semibold">Extra</th>
                <th className="text-left px-4 py-3 font-semibold">Grant Session</th>
                <th className="text-left px-4 py-3 font-semibold">Last Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-tfs-slate text-sm">
                    No clients match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const days   = daysSince(c.last_active_at)
                const flag   = days >= 120 ? 'critical' : days >= 90 ? 'warning' : null
                const isSelected = selected.has(c.id)
                const trialExpired = c.free_trial_expires_at ? new Date(c.free_trial_expires_at) < new Date() : false

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${isSelected ? 'bg-tfs-teal/5' : 'hover:bg-gray-50'} ${!c.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(c.id)} className="text-tfs-navy hover:text-tfs-teal">
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-tfs-navy">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-tfs-slate">{c.email}</p>
                      {c.promo_code_used && (
                        <p className="text-xs text-gray-400 font-mono">{c.promo_code_used}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.client_type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[c.client_type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABEL[c.client_type] ?? c.client_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLOR[c.plan_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIER_LABEL[c.plan_tier] ?? c.plan_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.plan_tier === 'free' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            defaultValue={toInputDate(c.free_trial_expires_at)}
                            onBlur={e => {
                              const val = e.target.value
                              const original = toInputDate(c.free_trial_expires_at)
                              if (val !== original) saveTrialDate(c.id, val)
                            }}
                            className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-tfs-teal w-34 ${
                              trialExpired ? 'border-red-300 text-red-600' : 'border-gray-200 text-tfs-navy'
                            }`}
                          />
                          {savingId === c.id && <Loader2 size={12} className="animate-spin text-tfs-teal" />}
                        </div>
                      ) : (
                        <span className="text-xs text-tfs-slate">Paid plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tfs-slate text-center">{c.sessions_used_this_month}</td>
                    <td className="px-4 py-3 text-center">
                      {(c.extra_sessions ?? 0) > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-tfs-teal/10 text-tfs-teal">
                          +{c.extra_sessions}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={grantAmount[c.id] ?? '1'}
                          onChange={e => setGrantAmount(prev => ({ ...prev, [c.id]: e.target.value }))}
                          className="w-14 text-xs border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-tfs-teal"
                        />
                        <button
                          onClick={() => grantSession(c.id)}
                          disabled={grantingId === c.id}
                          className="p-1 rounded-lg text-tfs-teal hover:bg-tfs-teal/10 transition-colors disabled:opacity-40"
                          title="Grant extra sessions"
                        >
                          {grantingId === c.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : <PlusCircle size={15} />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        flag === 'critical' ? 'text-red-600' :
                        flag === 'warning'  ? 'text-orange-500' :
                        'text-tfs-slate'
                      }`}>
                        {days}d ago
                        {flag === 'critical' && <span className="block text-red-400">120+ days</span>}
                        {flag === 'warning'  && <span className="block text-orange-400">90+ days</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.stripe_customer_id && (
                          <button
                            onClick={() => { setCreditClient(c); setCreditAmount(''); setCreditNote('') }}
                            className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                            title="Apply invoice credit"
                          >
                            <DollarSign size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteClient(c.id, `${c.first_name} ${c.last_name}`.trim() || c.email)}
                          disabled={deleting === c.id}
                          className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete client"
                        >
                          {deleting === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Credit modal ────────────────────────────────────── */}
      {creditClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif font-bold text-tfs-navy text-lg">Apply Invoice Credit</h3>
              <button onClick={() => setCreditClient(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-tfs-slate">
                A credit will be applied to <strong className="text-tfs-navy">{creditClient.first_name} {creditClient.last_name}</strong>&apos;s Stripe account and automatically deducted from their next invoice.
              </p>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Credit Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tfs-slate text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Courtesy discount, referral reward…"
                  value={creditNote}
                  onChange={e => setCreditNote(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCreditClient(null)} className="btn-outline text-sm">Cancel</button>
                <button
                  onClick={applyCredit}
                  disabled={crediting || !creditAmount || parseFloat(creditAmount) <= 0}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {crediting && <Loader2 size={14} className="animate-spin" />}
                  Apply Credit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-tfs-navy text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}
