'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import ScribrLogo from './ScribrLogo'

const AUTH_BG = 'linear-gradient(145deg, #060E1C 0%, #0A1F4A 35%, #0F3482 65%, #1B5BE8 100%)'

type Stage = 'loading' | 'ready' | 'done' | 'invalid'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    if (code) {
      // PKCE flow — exchange the one-time code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setStage('invalid')
        else setStage('ready')
      })
    } else {
      // Implicit / direct navigation — check if session already exists
      supabase.auth.getSession().then(({ data: { session } }) => {
        setStage(session ? 'ready' : 'invalid')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setStage('done')
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: AUTH_BG }}
    >
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052CC, transparent)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <ScribrLogo size={44} />
            <span className="text-3xl font-black text-white tracking-tight">Scribr</span>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-7"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)' }}
        >
          {stage === 'loading' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#6B778C]">Verifying link…</p>
            </div>
          )}

          {stage === 'invalid' && (
            <div className="text-center py-4">
              <p className="text-sm font-bold text-red-700 mb-2">Invalid or expired link</p>
              <p className="text-sm text-[#42526E] mb-5">
                This password reset link has expired or already been used.
              </p>
              <Link href="/login" className="text-sm text-[#0052CC] hover:underline font-semibold">
                Back to sign in
              </Link>
            </div>
          )}

          {stage === 'done' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <p className="text-base font-black text-[#172B4D] mb-2">Password updated!</p>
              <p className="text-sm text-[#42526E] mb-5">Your password has been changed successfully.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white btn-press"
                style={{ background: 'linear-gradient(135deg, #0052CC, #1B4DD6)' }}
              >
                Go to dashboard
              </button>
            </div>
          )}

          {stage === 'ready' && (
            <>
              <h2 className="text-lg font-black text-[#172B4D] mb-5">Set new password</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 border border-[#DFE1E6] rounded-xl text-sm text-[#172B4D] bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B778C] hover:text-[#172B4D]"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm text-[#172B4D] bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                    placeholder="Repeat password"
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
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>

        {(stage === 'ready' || stage === 'invalid') && (
          <p className="text-center text-sm text-white/50 mt-5">
            <Link href="/login" className="text-white/70 hover:text-white hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
