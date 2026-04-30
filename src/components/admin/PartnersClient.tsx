'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Partner = {
  id: string
  partner_name: string
  partner_type: 'property_management' | 'nonprofit' | 'trial'
  contact_name: string | null
  contact_email: string | null
  model: 'affiliate' | 'paying' | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  property_management: 'Property Management',
  nonprofit:           'Non-Profit',
  trial:               'Trial',
}

const TYPE_COLORS: Record<string, string> = {
  property_management: 'bg-blue-100 text-blue-700',
  nonprofit:           'bg-purple-100 text-purple-700',
  trial:               'bg-gray-100 text-gray-600',
}

export default function PartnersClient({ partners }: { partners: Partner[] }) {
  const router  = useRouter()
  const [showAdd, setShowAdd]   = useState(false)
  const [editP, setEditP]       = useState<Partner | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete partner "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) router.refresh()
    else alert('Failed to delete partner.')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, id?: string) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      partner_name:  fd.get('partner_name'),
      partner_type:  fd.get('partner_type'),
      contact_name:  fd.get('contact_name')  || null,
      contact_email: fd.get('contact_email') || null,
      model:         fd.get('model')         || null,
    }
    const res = await fetch(id ? `/api/admin/partners/${id}` : '/api/admin/partners', {
      method:  id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    setShowAdd(false)
    setEditP(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-bold text-tfs-navy">Partners</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Partner
        </button>
      </div>

      <div className="card overflow-hidden">
        {partners.length === 0 ? (
          <p className="text-tfs-slate text-sm py-4">No partners yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Partner</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Type</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Model</th>
                  <th className="text-left py-3 pr-4 font-medium text-tfs-slate">Contact</th>
                  <th className="text-right py-3 font-medium text-tfs-slate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partners.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-medium text-tfs-navy">{p.partner_name}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.partner_type]}`}>
                        {TYPE_LABELS[p.partner_type]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-tfs-slate capitalize">{p.model ?? '—'}</td>
                    <td className="py-3 pr-4 text-tfs-slate text-xs">
                      {p.contact_name && <p>{p.contact_name}</p>}
                      {p.contact_email && <p>{p.contact_email}</p>}
                      {!p.contact_name && !p.contact_email && '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditP(p)}
                          className="p-1.5 rounded-lg text-tfs-slate hover:text-tfs-teal hover:bg-tfs-teal/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.partner_name)}
                          disabled={deleting === p.id}
                          className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showAdd || editP) && (
        <Modal
          title={editP ? 'Edit Partner' : 'Add Partner'}
          onClose={() => { setShowAdd(false); setEditP(null); setError('') }}
        >
          <form onSubmit={e => handleSubmit(e, editP?.id)} className="space-y-4">
            <Field label="Partner Name" name="partner_name" defaultValue={editP?.partner_name} required placeholder="Sunrise Properties LLC" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Type</label>
                <select name="partner_type" defaultValue={editP?.partner_type ?? 'property_management'}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal">
                  <option value="property_management">Property Management</option>
                  <option value="nonprofit">Non-Profit</option>
                  <option value="trial">Trial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tfs-navy mb-1">Model</label>
                <select name="model" defaultValue={editP?.model ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal">
                  <option value="">—</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="paying">Paying</option>
                </select>
              </div>
            </div>
            <Field label="Contact Name (optional)" name="contact_name" defaultValue={editP?.contact_name ?? ''} placeholder="Jane Smith" />
            <Field label="Contact Email (optional)" name="contact_email" type="email" defaultValue={editP?.contact_email ?? ''} placeholder="jane@company.com" />

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving…' : editP ? 'Save Changes' : 'Add Partner'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, name, type = 'text', defaultValue, required, placeholder }: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-tfs-navy mb-1">{label}</label>
      <input type={type} name={name} defaultValue={defaultValue} required={required} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal" />
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-serif font-bold text-tfs-navy text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
