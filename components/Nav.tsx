'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, User } from 'lucide-react'
import ScribrLogo from './ScribrLogo'

const NAV_TABS = [
  { href: '/dashboard', label: 'Students', Icon: Users },
  { href: '/reports',   label: 'Reports',  Icon: FileText },
]

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name ?? user.email ?? null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    /* Solid deep navy + blue bottom border gives layered depth without a gradient sweep */
    <nav className="sticky top-0 z-40 bg-[#0A1628] border-b-2 border-[#0052CC] no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14">

          {/* ── Left: logo + vertical rule + tabs ─────────── */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-white font-black text-base tracking-tight shrink-0"
            >
              <ScribrLogo size={28} />
              <span className="hidden sm:inline">Scribr</span>
            </Link>

            {/* Vertical separator */}
            <div className="h-5 w-px bg-white/20 shrink-0" />

            {/* Nav tabs */}
            <div className="flex items-center gap-1">
              {NAV_TABS.map(({ href, label, Icon }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/55 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── Right: user + sign out ─────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {userName && (
              <div className="hidden md:flex items-center gap-1.5 text-white/50 text-xs">
                <User size={13} />
                <span className="max-w-[120px] truncate">{userName}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-white/50 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/8 font-semibold"
            >
              Sign out
            </button>
          </div>

        </div>
      </div>
    </nav>
  )
}
