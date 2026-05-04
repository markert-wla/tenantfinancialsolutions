'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Coach {
  id: string
  display_name: string
  photo_url: string | null
  bio: string | null
  bio_short: string | null
  specialty: string | null
}

export default function CoachCard({ coach }: { coach: Coach }) {
  const [open, setOpen] = useState(false)

  const summary = coach.bio_short?.trim()
    || (coach.bio ? coach.bio.slice(0, 160) + (coach.bio.length > 160 ? '…' : '') : null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="card text-center hover:shadow-lg transition-shadow cursor-pointer w-full text-left group"
        aria-label={`View ${coach.display_name}'s profile`}
      >
        <div className="w-24 h-24 rounded-full overflow-hidden bg-tfs-teal/10 mx-auto mb-4 ring-2 ring-tfs-teal/20 group-hover:ring-tfs-teal transition-all">
          {coach.photo_url ? (
            <Image
              src={coach.photo_url}
              alt={coach.display_name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl font-bold text-tfs-teal font-serif">
                {coach.display_name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}
        </div>
        <h3 className="font-bold text-tfs-navy text-xl mb-1 font-serif">{coach.display_name}</h3>
        {coach.specialty && (
          <p className="text-tfs-teal text-sm font-medium mb-2">{coach.specialty}</p>
        )}
        {summary && (
          <p className="text-tfs-slate text-sm leading-relaxed">{summary}</p>
        )}
        <p className="text-xs text-tfs-teal mt-3 font-medium group-hover:underline">
          View profile & sign up →
        </p>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif font-bold text-tfs-navy text-lg">{coach.display_name}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-tfs-teal/10 shrink-0 ring-2 ring-tfs-teal/20">
                  {coach.photo_url ? (
                    <Image
                      src={coach.photo_url}
                      alt={coach.display_name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-tfs-teal font-serif">
                        {coach.display_name?.charAt(0) ?? '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-tfs-navy text-lg font-serif">{coach.display_name}</p>
                  {coach.specialty && (
                    <p className="text-tfs-teal text-sm font-medium">{coach.specialty}</p>
                  )}
                </div>
              </div>

              {coach.bio ? (
                <p className="text-tfs-slate text-sm leading-relaxed whitespace-pre-line">{coach.bio}</p>
              ) : (
                <p className="text-tfs-slate text-sm italic">Bio coming soon.</p>
              )}

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-tfs-slate mb-3">
                  Ready to work with {coach.display_name.split(' ')[0]}? Sign up and your sessions will be with them.
                </p>
                <Link
                  href={`/register?coach=${coach.id}`}
                  className="btn-primary w-full text-center block"
                  onClick={() => setOpen(false)}
                >
                  Sign Up with {coach.display_name}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
