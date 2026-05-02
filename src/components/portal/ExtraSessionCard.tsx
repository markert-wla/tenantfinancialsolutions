'use client'

import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export default function ExtraSessionCard() {
  return (
    <div className="card border border-tfs-gold/40 bg-tfs-navy mt-6">
      <p className="font-semibold text-tfs-gold text-base mb-1">
        Need an extra session with a coach?
      </p>
      <p className="text-white/80 text-sm mb-4">
        Purchase a single one-on-one coaching session without changing your plan.
      </p>
      <Link
        href="/portal/book?buy=1"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tfs-gold text-tfs-navy font-semibold text-sm hover:bg-tfs-gold/90 transition-colors"
      >
        <PlusCircle size={15} />
        Buy a Single Session
      </Link>
    </div>
  )
}
