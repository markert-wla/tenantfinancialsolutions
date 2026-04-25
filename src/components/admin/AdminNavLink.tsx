'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNavLink({
  href,
  children,
  badge,
}: {
  href: string
  children: React.ReactNode
  badge?: number
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className="flex-1 flex items-center gap-3">{children}</span>
      {badge ? (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
