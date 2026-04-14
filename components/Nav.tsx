'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, User } from 'lucide-react'

export default function Nav() {
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name ?? user.email ?? null)
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-[#0052CC] shadow-md no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white font-bold text-base tracking-tight"
            >
              <BookOpen size={18} />
              Scribr
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {userName && (
              <div className="flex items-center gap-1.5 text-blue-100 text-sm">
                <User size={14} />
                <span className="hidden sm:inline">{userName}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-blue-200 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
