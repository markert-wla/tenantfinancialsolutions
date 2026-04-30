'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react'

type Manager = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  is_active: boolean
  created_at: string
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(iso))
}

export default function ManagersTable({
  managers,
  codesByPM,
}: {
  managers: Manager[]
  codesByPM: Record<string, number>
}) {
  const router              = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove property manager "${name}"? This will revoke their login access.`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/managers/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) router.refresh()
    else alert('Failed to remove manager.')
  }

  if (!managers.length) {
    return <div className="card text-center py-16 text-tfs-slate text-sm">No property managers invited yet.</div>
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-tfs-teal-light text-tfs-navy border-b border-gray-100">
          <tr>
            <th className="text-left px-5 py-3 font-semibold">Manager</th>
            <th className="text-left px-4 py-3 font-semibold">Codes</th>
            <th className="text-left px-4 py-3 font-semibold">Invited</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {managers.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <p className="font-medium text-tfs-navy">{m.first_name} {m.last_name}</p>
                <p className="text-xs text-tfs-slate">{m.email}</p>
              </td>
              <td className="px-4 py-3 text-tfs-slate text-center">{codesByPM[m.id] ?? 0}</td>
              <td className="px-4 py-3 text-xs text-tfs-slate">{fmtDate(m.created_at)}</td>
              <td className="px-4 py-3">
                {m.is_active
                  ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> Active</span>
                  : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={13} /> Inactive</span>
                }
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(m.id, `${m.first_name} ${m.last_name}`.trim() || m.email)}
                  disabled={deleting === m.id}
                  className="p-1.5 rounded-lg text-tfs-slate hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Remove manager"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
