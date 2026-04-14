'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'
import ScribrLogo from './ScribrLogo'

const AUTH_BG = 'linear-gradient(145deg, #060E1C 0%, #0A1F4A 35%, #0F3482 65%, #1B5BE8 100%)'

export default function SignupForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setEmailSent(true)
    }
  }

  if (emailSent) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={{ background: AUTH_BG }}>
        <div className="w-full max-w-sm text-center relative z-10">
          <div className="bg-white rounded-2xl p-10"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)' }}>
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail size={24} className="text-[#0052CC]" />
            </div>
            <h1 className="text-xl font-black text-[#172B4D] mb-2">Check your email</h1>
            <p className="text-[#42526E] text-sm leading-relaxed mb-6">
              We sent a confirmation link to <strong className="text-[#172B4D]">{email}</strong>.
              <br />Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all btn-press"
              style={{ background: 'linear-gradient(135deg, #0052CC, #1B4DD6)' }}
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: AUTH_BG }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052CC, transparent)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <ScribrLogo size={44} />
            <span className="text-3xl font-black text-white tracking-tight">Scribr</span>
          </div>
          <p className="text-white/60 text-sm">Create your free account</p>
        </div>

        {/* Card — solid white */}
        <div className="bg-white rounded-2xl p-7"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)' }}>
          <h2 className="text-lg font-black text-[#172B4D] mb-5">Create account</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF] transition-colors"
                  placeholder="Alex"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF] transition-colors"
                  placeholder="Johnson"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF] transition-colors"
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
                minLength={6}
                className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF] transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#42526E] uppercase tracking-wide mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-[#DFE1E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF] transition-colors"
                placeholder="Re-enter your password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all btn-press"
              style={{ background: 'linear-gradient(135deg, #0052CC, #1B4DD6)' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/50 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
