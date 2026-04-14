'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setError('Enter your email address first.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={24} className="text-[#0052CC]" />
            <span className="text-2xl font-bold text-[#172B4D]">Scribr</span>
          </div>
          <p className="text-[#42526E] text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-xl border border-[#DFE1E6] p-6 shadow-sm">
          {resetSent ? (
            <div className="text-center">
              <p className="text-sm text-[#42526E] mb-4">
                Password reset email sent to <strong>{email}</strong>. Check your inbox.
              </p>
              <button
                onClick={() => setResetSent(false)}
                className="text-sm text-[#0052CC] hover:underline font-semibold"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                  placeholder="you@school.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0052CC] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0065FF] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full text-sm text-[#42526E] hover:text-[#172B4D] transition-colors"
              >
                Forgot password?
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#6B778C] mt-4">
          No account?{' '}
          <Link href="/signup" className="text-[#0052CC] hover:underline font-semibold">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  )
}
