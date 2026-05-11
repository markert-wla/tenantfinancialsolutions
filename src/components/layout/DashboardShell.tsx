'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function DashboardShell({
  sidebar,
  banner,
  children,
}: {
  sidebar: React.ReactNode
  banner?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen pt-16">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 top-16 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-56 z-40 bg-tfs-navy text-white flex flex-col transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <button
          className="absolute top-3 right-3 text-white/50 hover:text-white md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 bg-tfs-teal-light min-h-screen">
        {/* Mobile menu bar */}
        <div className="sticky top-16 z-20 flex items-center px-4 py-2 bg-tfs-navy text-white md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 text-sm font-semibold opacity-80">Menu</span>
        </div>
        {banner}
        {children}
      </div>
    </div>
  )
}
