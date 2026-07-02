'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string[]
  bullets?: string[]
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-gray-200">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-bold text-tfs-navy text-lg font-serif group-hover:text-tfs-teal transition-colors">
                <span className="text-tfs-gold mr-2">{i + 1}.</span>
                {item.question}
              </span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-tfs-teal transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="pb-6 space-y-3 text-tfs-slate leading-relaxed">
                {item.answer.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
                {item.bullets && (
                  <ul className="mt-2 space-y-2 pl-4">
                    {item.bullets.map((b, k) => (
                      <li key={k} className="flex items-start gap-2">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-tfs-gold shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
