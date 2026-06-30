'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const goals = [
  { value: 'lose', label: 'Lose Weight', emoji: '📉', desc: 'Calorie deficit' },
  { value: 'maintain', label: 'Stay Healthy', emoji: '⚖️', desc: 'Maintain current weight' },
  { value: 'gain', label: 'Build Muscle', emoji: '💪', desc: 'Calorie surplus' },
]

const activities = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Light', desc: '1–3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3–5 days/week' },
  { value: 'active', label: 'Active', desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Athlete / Physical job' },
]

const inputCls = 'bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male', weight_kg: '', height_cm: '',
    goal: 'maintain', activity_level: 'moderate'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email!,
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      weight_kg: parseFloat(form.weight_kg),
      height_cm: parseFloat(form.height_cm),
      goal: form.goal,
      activity_level: form.activity_level,
    })

    if (error) { setError(error.message); setLoading(false); return }

    await supabase.from('weight_logs').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      weight_kg: parseFloat(form.weight_kg),
    })

    router.push('/dashboard')
  }

  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.08) 0%, transparent 60%)' }} />

      <div className="w-full max-w-[520px] relative z-10">
        <div className="text-center mb-8">
          <span className="text-[13px] font-semibold text-indigo-400 tracking-[0.08em] uppercase">
            Step {step} of 3
          </span>
          <h1 className="text-[28px] font-extrabold mt-2">
            {step === 1 ? 'About You' : step === 2 ? 'Your Body' : 'Your Goal'}
          </h1>
          <div className="h-1 bg-slate-800 rounded-full mt-4">
            <div
              className="h-full rounded-full transition-[width] duration-[400ms] ease-in-out"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #22d3ee, #818cf8)' }}
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 animate-in">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold mb-1">Tell us your name</h2>
              <div>
                <label className={labelCls}>Full Name</label>
                <input className={inputCls} placeholder="John Doe" value={form.name} onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Age</label>
                <input className={inputCls} type="number" placeholder="28" value={form.age} onChange={e => update('age', e.target.value)} min={10} max={120} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <div className="flex gap-2.5">
                  {[{ v: 'male', l: '♂ Male' }, { v: 'female', l: '♀ Female' }].map(g => (
                    <button
                      key={g.v}
                      onClick={() => update('gender', g.v)}
                      className={`flex-1 py-3 rounded-[10px] font-semibold cursor-pointer transition-all border-2 ${
                        form.gender === g.v
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold mb-1">Your measurements</h2>
              <div>
                <label className={labelCls}>Weight (kg)</label>
                <input className={inputCls} type="number" placeholder="70" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} step="0.1" min={20} max={300} />
              </div>
              <div>
                <label className={labelCls}>Height (cm)</label>
                <input className={inputCls} type="number" placeholder="175" value={form.height_cm} onChange={e => update('height_cm', e.target.value)} min={50} max={250} />
              </div>
              <div>
                <label className={labelCls}>Activity Level</label>
                <div className="flex flex-col gap-2">
                  {activities.map(a => (
                    <button
                      key={a.value}
                      onClick={() => update('activity_level', a.value)}
                      className={`px-4 py-3 rounded-[10px] border-2 cursor-pointer flex justify-between items-center transition-all ${
                        form.activity_level === a.value
                          ? 'border-indigo-400 bg-indigo-400/10'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <span className={`font-semibold ${form.activity_level === a.value ? 'text-indigo-400' : 'text-slate-100'}`}>{a.label}</span>
                      <span className="text-xs text-slate-500">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold mb-1">What's your goal?</h2>
              <div className="flex flex-col gap-3">
                {goals.map(g => (
                  <button
                    key={g.value}
                    onClick={() => update('goal', g.value)}
                    className={`p-5 rounded-xl border-2 cursor-pointer flex items-center gap-4 text-left transition-all ${
                      form.goal === g.value
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    <span className="text-[28px]">{g.emoji}</span>
                    <div>
                      <div className={`font-bold text-base ${form.goal === g.value ? 'text-cyan-400' : 'text-slate-100'}`}>{g.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.desc}</div>
                    </div>
                    {form.goal === g.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-xs text-white">✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-400/10 border border-red-400/30 rounded-[10px] px-3.5 py-2.5 text-red-400 text-[13px]">{error}</div>
          )}

          <div className="flex gap-2.5 mt-6">
            {step > 1 && (
              <button
                className="flex-1 py-3 px-6 bg-transparent text-slate-100 border border-slate-800 rounded-xl font-medium cursor-pointer hover:bg-gray-800 hover:border-cyan-400 transition-all"
                onClick={() => setStep(s => s - 1)}
              >← Back</button>
            )}
            {step < 3 ? (
              <button
                className="flex-1 py-3 px-6 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !form.name || !form.age : !form.weight_kg || !form.height_cm}
              >
                Continue →
              </button>
            ) : (
              <button
                className="flex-1 py-3 px-6 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
                onClick={handleSubmit} disabled={loading}
              >
                {loading ? 'Setting up...' : 'Start Tracking 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
