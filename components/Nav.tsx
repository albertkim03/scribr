'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, User, Sparkles, BadgeQuestionMark } from 'lucide-react'
import ScribrLogo from './ScribrLogo'
import { isDirty, clearDirty } from '@/lib/route-cache'
import { AI_DAILY_LIMIT } from '@/lib/ai-config'
import { getResetCountdown } from './helpers/AIUsage'

const NAV_TABS = [
  { href: '/dashboard', label: 'Students', Icon: Users },
  { href: '/more_features', label: 'New features????', Icon: BadgeQuestionMark}
]

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [userName, setUserName] = useState<string | null>(null)
  const [aiUsage, setAiUsage] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setUserName(session.user.user_metadata?.full_name ?? session.user.email ?? null)

      const today = new Date().toISOString().split('T')[0]
      supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .maybeSingle()
        .then(({ data }) => setAiUsage(data?.count ?? 0))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for AI usage updates dispatched by generate/regenerate/refactor actions
  useEffect(() => {
    function handleUsageUpdate(e: Event) {
      const count = (e as CustomEvent<{ count: number }>).detail.count
      setAiUsage(count)
    }
    window.addEventListener('ai-usage-updated', handleUsageUpdate)
    return () => window.removeEventListener('ai-usage-updated', handleUsageUpdate)
  }, [])

  // If the current route was marked dirty by a mutation, force a fresh fetch.
  useEffect(() => {
    const routeKey = pathname === '/dashboard' ? 'dashboard' : null
    if (routeKey && isDirty(routeKey)) {
      clearDirty(routeKey)
      router.refresh()
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const usagePct = aiUsage !== null ? Math.min(100, (aiUsage / AI_DAILY_LIMIT) * 100) : 0
  const barColor = aiUsage !== null
    ? aiUsage >= AI_DAILY_LIMIT * 0.9 ? '#EF4444'
    : aiUsage >= AI_DAILY_LIMIT * 0.7 ? '#F59E0B'
    : '#3B82F6'
    : '#3B82F6'

  return (
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

            <div className="h-5 w-px bg-white/20 shrink-0" />

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

          {/* ── Right: AI usage bar + user + sign out ─────── */}
          <div className="flex items-center gap-3 shrink-0">

            {/* AI usage indicator */}
            {aiUsage !== null && (
              <div className="relative group hidden md:flex items-center gap-1.5">
                <Sparkles size={11} className="text-white/30 shrink-0" />
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-default">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${usagePct}%`, backgroundColor: barColor }}
                  />
                </div>

                {/* Hover tooltip */}
                <div className="absolute top-full right-0 mt-3 hidden group-hover:block pointer-events-none z-50">
                  <div
                    className="bg-white rounded-xl border border-[#DFE1E6] p-4 w-52 text-left"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={12} className="text-violet-500" />
                      <span className="text-xs font-black text-[#172B4D]">AI usage today</span>
                    </div>
                    <p className="text-2xl font-black text-[#0052CC] leading-none mb-0.5">
                      {aiUsage}
                      <span className="text-sm text-[#6B778C] font-semibold"> / {AI_DAILY_LIMIT}</span>
                    </p>
                    <p className="text-xs text-[#6B778C] mb-2">requests used</p>
                    <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${usagePct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <p className="text-xs text-[#6B778C] mt-2">{getResetCountdown()}</p>
                    {aiUsage >= AI_DAILY_LIMIT * 0.9 && (
                      <p className="text-xs font-semibold text-red-600 mt-1.5">
                        {aiUsage >= AI_DAILY_LIMIT ? 'Limit reached for today.' : 'Almost at daily limit.'}
                      </p>
                    )}
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute right-4 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-[#DFE1E6]" />
                </div>
              </div>
            )}

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
