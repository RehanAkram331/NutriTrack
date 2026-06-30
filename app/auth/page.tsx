'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push('/onboarding')
        return
      } else {
        setMessage('Account created! Check your email to confirm, then log in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
        if (profile) router.push('/dashboard')
        else router.push('/onboarding')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 60%)' }} />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px]"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
            >🥗</div>
            <span className="text-[26px] font-extrabold bg-gradient-to-br from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              NutriTrack
            </span>
          </div>
          <p className="text-slate-400 text-sm">Your personal nutrition intelligence</p>
        </div>

        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 animate-in">
          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-[10px] p-1 mb-7">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setMessage(''); setName('') }}
                className="flex-1 py-2 rounded-lg border-none text-sm font-semibold cursor-pointer transition-all"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #22d3ee, #818cf8)' : 'transparent',
                  color: mode === m ? 'white' : '#94a3b8',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5">Full Name</label>
                <input
                  className="bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400"
                  type="text" placeholder="John Doe" value={name}
                  onChange={e => setName(e.target.value)} required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5">Email</label>
              <input
                className="bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400"
                type="email" placeholder="you@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5">Password</label>
              <input
                className="bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400"
                type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/30 rounded-[10px] px-3.5 py-2.5 text-red-400 text-[13px]">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-[10px] px-3.5 py-2.5 text-emerald-400 text-[13px]">
                {message}
              </div>
            )}

            <button
              className="mt-2 w-full text-[15px] font-semibold text-white border-none rounded-xl px-6 py-3 cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px active:translate-y-0 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
              type="submit" disabled={loading}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-slate-600 text-xs">
          Track calories • Vitamins • Minerals • Body progress
        </p>
      </div>
    </div>
  )
}
