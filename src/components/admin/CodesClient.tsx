'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, XCircle, Trash2 } from 'lucide-react'

type Partner = {
  id: string
  partner_name: string
  partner_type: 'property_management' | 'nonprofit' | 'trial'
}

type PromoCode = {
  code: string
  partner_id: string | null
  partner_type: 'property_management' | 'nonprofit' | 'trial'
  partner_name: string
  assigned_tier: 'free' | 'bronze' | 'silver' | null
  code_type: 'tier_assignment' | 'affiliate_discount' | 'full_comp' | 'group_comp'
  discount_percent: number | null
  max_uses: number
  uses_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const TIER_LABELS: Record<string, string> = {
  free:   'Free',
  bronze: 'Starter',
  silver: 'Advantage',
  all:    'All',
}

const CODE_TYPE_LABELS: Record<string, string> = {
  tier_assignment:    'Tier Assignment',
  affiliate_discount: 'Affiliate Discount',
  full_comp:          'Full Comp',
  group_comp:         'Group Comp',
}

const PARTNER_LABELS: Record<string, string> = {
  property_management: 'Property Mgmt',
  nonprofit:           'Non-Profit',
  trial:               'Trial',
}

const TIER_COLORS: Record<string, string> = {
  free:   'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-slate-100 text-slate-600',
  all:    'bg-tfs-teal/10 text-tfs-teal',
}

function partnershipLabel(code: PromoCode): { label: string; color: string } | null {
  if (code.code_type === 'affiliate_discount') return { label: 'Affiliate', color: 'bg-tfs-teal/10 text-tfs-teal' }
  if (code.assigned_tier === 'silver') return { label: 'Full Amenity', color: 'bg-tfs-navy/10 text-tfs-navy' }
  if (code.code_type === 'full_comp' || code.code_type === 'group_comp') return null
  if (code.assigned_tier === 'bronze') return { label: 'Affiliate', color: 'bg-tfs-teal/10 text-tfs-teal' }
  return null
}

const CODE_TYPE_COLORS: Record<string, string> = {
  tier_assignment:    'bg-gray-100 text-gray-600',
  affiliate_discount: 'bg-tfs-teal/10 text-tfs-teal',
  full_comp:          'bg-purple-100 text-purple-700',
  group_comp:         'bg-blue-100 text-blue-700',
}

export default function CodesClient({ codes, partners }: { codes: PromoCode[]; partners: Partner[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd]   = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [codeType, setCodeType] = useState('tier_assignment')

  // Partner selection state for the create form
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [newPartnerName, setNewPartnerName]         = useState('')
  const [newPartnerType, setNewPartnerType]         = useState('property_management')
  const isNewPartner = selectedPartnerId === '__new__'

  function resetForm() {
    setCodeType('tier_assignment')
    setSelectedPartnerId('')
    setNewPartnerName('')
    setNewPartnerType('property_management')
    setError('')
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fd = new FormData(e.currentTarget)

    let partnerId = selectedPartnerId

    if (isNewPartner) {
      if (!newPartnerName.trim()) {
        setError('Partner name is required.')
        setLoading(false)
        return
      }
      // Create the partner first, then use the returned ID
      const pRes = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_name: newPartnerName.trim(), partner_type: newPartnerType }),
      })
      const pData = await pRes.json()
      if (!pRes.ok) {
        setError(pData.error ?? 'Failed to create partner')
        setLoading(false)
        return
      }
      partnerId = pData.id
    }

    if (!partnerId) {
      setError('Please select or create a partner.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code:             (fd.get('code') as string).toUpperCase().trim(),
        partner_id:       partnerId,
        assigned_tier:    fd.get('assigned_tier'),
        code_type:        fd.get('code_type'),
        discount_percent: fd.get('discount_percent') ? Number(fd.get('discount_percent')) : null,
        max_uses:         Number(fd.get('max_uses')),
        expires_at:       fd.get('expires_at') || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create code'); return }
    setShowAdd(false)
    resetForm()
    router.refresh()
  }

  async function handleRevoke(code: string) {
    setLoading(true)
    await fetch(`/api/admin/codes/${encodeURIComponent(code)}/revoke`, { method: 'PATCH' })
    setLoading(false)
    setRevoking(null)
    router.refresh()
  }

  async function handleDelete(code: string) {
    setLoading(true)
    await fetch(`/api/admin/codes/${encodeURIComponent(code)}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  const activeCodes   = codes.filter(c => c.is_active)
  const inactiveCodes = codes.filter(c => !c.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Promo Codes</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Code
        </button>
      </div>

      <CodeTable
        codes={activeCodes}
        partners={partners}
        title="Active Codes"
        emptyMessage="No active promo codes."
        onRevoke={setRevoking}
        onDelete={null}
      />

      {inactiveCodes.length > 0 && (
        <div className="mt-6">
          <CodeTable
            codes={inactiveCodes}
            partners={partners}
            title="Revoked / Expired"
            emptyMessage=""
            onRevoke={null}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Create modal */}
      {showAdd && (
        <Modal title="Create Promo Code" onClose={() => { setShowAdd(false); resetForm() }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Code</label>
              <input
                name="code"
                required
                placeholder="PARTNER2026"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              />
            </div>

            {/* Partner selection */}
            <div>
              <label className="block text-sm font-medium text-tfs-navy mb-1">Partner</label>
              <select
                value={selectedPartnerId}
                onChange={e => setSelectedPartnerId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
              >
                <option value="">— Select a partner —</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.partner_name} ({PARTNER_LABELS[p.partner_type] ?? p.partner_type})
                  </option>
                ))}
                <option value="__new__">— Create new partner —</option>
              </select>
            </div>

            {/* Inline new-partner fields */}
            {isNewPartner && (
              <div className="border border-tfs-teal/30 bg-tfs-teal/5 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-tfs-teal uppercase tracking-wide">New Partner Details</p>
                <div>
                  <label className="block text-sm font-medium text-tfs-navy mb-1">Partner Name</label>
                  <input
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    placeholder="Sunrise Properties LLC"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tfs-navy mb-1">Partner Type</label>
                  <select
                    value={newPartnerType}
                    onChange={e => setNewPartnerType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                  >
                    <option value="property_management">Property Management</option>
                    <option value="nonprofit">Non-Profit</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <p className="text-xs text-tfs-slate">The partner will be created automatically when you save this code. You can add contact details later in the Partners section.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Code Type</label>
                <select
                  name="code_type"
                  required
                  value={codeType}
                  onChange={e => setCodeType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                >
                  <option value="tier_assignment">Tier Assignment</option>
                  <option value="affiliate_discount">Affiliate Discount (% off 1st month)</option>
                  <option value="full_comp">Full Comp (no billing)</option>
                  <option value="group_comp">Group Comp (no billing)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Assigned Tier</label>
                <select
                  name="assigned_tier"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                >
                  {codeType === 'affiliate_discount' && (
                    <option value="">All Tiers</option>
                  )}
                  <option value="free">Free</option>
                  <option value="bronze">Starter</option>
                  <option value="silver">Advantage</option>
                </select>
              </div>
            </div>

            {codeType === 'affiliate_discount' && (
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Discount % (first month)</label>
                <input
                  type="number"
                  name="discount_percent"
                  required
                  min={1}
                  max={100}
                  defaultValue={10}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                />
              </div>
            )}

            {codeType === 'affiliate_discount' && (
              <p className="text-xs text-tfs-slate bg-tfs-teal-light rounded-lg px-4 py-3">
                Affiliate discount codes assign the selected tier and apply the discount % off the tenant&apos;s first Stripe invoice automatically.
              </p>
            )}
            {(codeType === 'full_comp' || codeType === 'group_comp') && (
              <p className="text-xs text-tfs-slate bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                Comp codes grant access with no Stripe billing. Set the assigned tier to match the access level you want to provide.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Max Uses</label>
                <input
                  type="number"
                  name="max_uses"
                  required
                  min={1}
                  defaultValue={10}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Expiry Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  name="expires_at"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (isNewPartner ? 'Creating partner & code…' : 'Creating…') : 'Create Code'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Revoke confirmation */}
      {revoking && (
        <Modal title="Revoke Code" onClose={() => setRevoking(null)}>
          <p className="text-tfs-slate text-sm mb-6">
            Revoking <strong className="font-mono">{revoking}</strong> will prevent new registrations
            from using it. Existing accounts that used this code are unaffected.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setRevoking(null)} className="btn-outline">Cancel</button>
            <button
              onClick={() => handleRevoke(revoking)}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Revoking…' : 'Revoke Code'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CodeTable({
  codes,
  partners,
  title,
  emptyMessage,
  onRevoke,
  onDelete,
}: {
  codes: PromoCode[]
  partners: Partner[]
  title: string
  emptyMessage: string
  onRevoke: ((code: string) => void) | null
  onDelete: ((code: string) => void) | null
}) {
  const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]))

  return (
    <div className="card overflow-hidden">
      <h2 className="font-serif font-bold text-tfs-navy text-lg mb-4">{title}</h2>
      {codes.length === 0 ? (
        <p className="text-tfs-slate text-sm">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Code</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Partner</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Type</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Partnership</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Tier</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Uses</th>
                <th className="text-left py-2 pr-4 font-medium text-tfs-slate">Expires</th>
                {(onRevoke || onDelete) && <th className="text-right py-2 font-medium text-tfs-slate">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map(c => {
                const partner = c.partner_id ? partnerMap[c.partner_id] : null
                const displayName = partner?.partner_name ?? c.partner_name
                const displayType = partner?.partner_type ?? c.partner_type
                return (
                  <tr key={c.code} className={!c.is_active ? 'opacity-50' : ''}>
                    <td className="py-2.5 pr-4 font-mono font-medium text-tfs-navy">{c.code}</td>
                    <td className="py-2.5 pr-4 text-tfs-slate">
                      <span>{displayName}</span>
                      <span className="ml-2 text-xs text-gray-400">({PARTNER_LABELS[displayType] ?? displayType})</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CODE_TYPE_COLORS[c.code_type ?? 'tier_assignment']}`}>
                        {CODE_TYPE_LABELS[c.code_type ?? 'tier_assignment']}
                      </span>
                      {c.code_type === 'affiliate_discount' && c.discount_percent && (
                        <span className="ml-1 text-xs text-tfs-teal font-semibold">{c.discount_percent}%</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {(() => { const p = partnershipLabel(c); return p ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>{p.label}</span>
                      ) : <span className="text-gray-300">—</span> })()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[c.assigned_tier ?? 'all']}`}>
                        {c.assigned_tier ? TIER_LABELS[c.assigned_tier] : 'All'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-tfs-slate">
                      {c.uses_count} / {c.max_uses}
                    </td>
                    <td className="py-2.5 pr-4 text-tfs-slate text-xs">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    {(onRevoke || onDelete) && (
                      <td className="py-2.5 text-right flex items-center justify-end gap-1">
                        {onRevoke && (
                          <button
                            onClick={() => onRevoke(c.code)}
                            className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Revoke"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(c.code)}
                            className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-tfs-navy text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
