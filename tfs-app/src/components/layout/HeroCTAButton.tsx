'use client'
import Link from 'next/link'

export default function HeroCTAButton() {
  return (
    <Link
      href="/register?tier=free"
      className="inline-block bg-tfs-gold text-tfs-navy font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:brightness-105 hover:scale-105 transition-all duration-200 w-full sm:w-auto max-w-md"
    >
      Step into your free Connection Session
    </Link>
  )
}
