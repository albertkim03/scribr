'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'
import ScribrLogo from './ScribrLogo'

const AUTH_BG = 'linear-gradient(145deg, #060E1C 0%, #0A1F4A 35%, #0F3482 65%, #1B5BE8 100%)'

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
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: AUTH_BG }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052CC, transparent)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <ScribrLogo size={44} />
            <span className="text-3xl font-black text-white tracking-tight">Scribr</span>
          </div>
          <p className="text-white/60 text-sm text-center">
            Observation logging &amp; AI-powered student reports
          </p>
        </div>

        {/* Card — solid white so text is always readable */}
        <div
          className="bg-white rounded-2xl p-7"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)' }}
        >
          {resetSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={20} className="text-[#0052CC]" />
              </div>
              <p className="text-sm text-[#42526E] mb-5 leading-relaxed">
                Password reset email sent to{' '}
                <strong className="text-[#172B4D]">{email}</strong>.
                <br />Check your inbox.
              </p>
              <button
                onClick={() => setResetSent(false)}
                className="text-sm text-[#0052CC] hover:underline font-semibold"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-[#172B4D] mb-5">Sign in</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm text-[#172B4D] bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-colors"
                    placeholder="you@school.edu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm text-[#172B4D] bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 btn-press"
                  style={{ background: 'linear-gradient(135deg, #0052CC, #1B4DD6)' }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>

                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="w-full text-xs text-[#6B778C] hover:text-[#0052CC] transition-colors py-1"
                >
                  Forgot password?
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-white/50 mt-5">
          No account?{' '}
          <Link href="/signup" className="text-white hover:underline font-semibold">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  )
}
