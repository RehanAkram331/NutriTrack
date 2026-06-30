'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateBMI, getBMICategory } from '@/lib/nutrition'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'

interface Profile {
  id: string; name: string; age: number; gender: string;
  weight_kg: number; height_cm: number; goal: string; activity_level: string;
}
interface WeightLog { id: string; date: string; weight_kg: number }

const goals = [
  { value: 'lose', label: 'Lose Weight', emoji: '📉' },
  { value: 'maintain', label: 'Stay Healthy', emoji: '⚖️' },
  { value: 'gain', label: 'Build Muscle', emoji: '💪' },
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

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', height_cm: '', goal: 'maintain', activity_level: 'moderate' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)
    setForm({
      name: prof.name,
      age: prof.age.toString(),
      gender: prof.gender || 'male',
      height_cm: prof.height_cm.toString(),
      goal: prof.goal,
      activity_level: prof.activity_level,
    })

    const { data: logs } = await supabase
      .from('weight_logs')
      .select('id, date, weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50)
    setWeightLogs(logs || [])
  }, [router])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase.from('profiles').update({
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      height_cm: parseFloat(form.height_cm),
      goal: form.goal,
      activity_level: form.activity_level,
    }).eq('id', profile.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setProfile(p => p ? { ...p, ...form, age: parseInt(form.age), height_cm: parseFloat(form.height_cm) } : p)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function deleteWeightEntry(id: string) {
    await supabase.from('weight_logs').delete().eq('id', id)
    setWeightLogs(prev => prev.filter(l => l.id !== id))
  }

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-[40px] mb-3">⚙️</div>
        <p className="text-slate-400">Loading settings...</p>
      </div>
    </div>
  )

  const bmi = calculateBMI(profile.weight_kg, parseFloat(form.height_cm) || profile.height_cm)
  const bmiCat = getBMICategory(bmi)

  return (
    <div className="min-h-screen">
      <Navbar name={profile.name} />
      <div className="max-w-[800px] mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold m-0 mb-1">Settings ⚙️</h1>
          <p className="text-slate-500 text-sm m-0">Update your profile and view your weight history</p>
        </div>

        {/* Profile card */}
        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.05em] mb-5">Personal Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelCls}>Age</label>
              <input className={inputCls} type="number" value={form.age} onChange={e => update('age', e.target.value)} min={10} max={120} placeholder="28" />
            </div>
            <div>
              <label className={labelCls}>Height (cm)</label>
              <input className={inputCls} type="number" value={form.height_cm} onChange={e => update('height_cm', e.target.value)} step="0.1" min={50} max={250} placeholder="175" />
            </div>
          </div>

          {/* Gender */}
          <div className="mb-4">
            <label className={labelCls}>Gender</label>
            <div className="flex gap-2.5">
              {[{ v: 'male', l: '♂ Male' }, { v: 'female', l: '♀ Female' }].map(g => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => update('gender', g.v)}
                  className={`flex-1 py-3 rounded-[10px] font-semibold cursor-pointer transition-all border-2 ${
                    form.gender === g.v
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >{g.l}</button>
              ))}
            </div>
          </div>

          {/* BMI preview */}
          {form.height_cm && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-xs text-slate-500">Current BMI</span>
                <div className="text-lg font-extrabold" style={{ color: bmiCat.color }}>{bmi.toFixed(1)} <span className="text-sm font-semibold">{bmiCat.label}</span></div>
              </div>
              <div className="ml-auto text-xs text-slate-500">Based on last logged weight ({profile.weight_kg} kg)</div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.05em] mb-4">Goal & Activity</h2>

          {/* Goal */}
          <div className="mb-4">
            <label className={labelCls}>Goal</label>
            <div className="flex gap-2">
              {goals.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => update('goal', g.value)}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-1 transition-all ${
                    form.goal === g.value
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-slate-800 bg-slate-900'
                  }`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span className={`text-xs font-semibold ${form.goal === g.value ? 'text-cyan-400' : 'text-slate-400'}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="mb-5">
            <label className={labelCls}>Activity Level</label>
            <div className="flex flex-col gap-2">
              {activities.map(a => (
                <button
                  key={a.value}
                  type="button"
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

          {error && (
            <div className="mb-4 bg-red-400/10 border border-red-400/30 rounded-[10px] px-3.5 py-2.5 text-red-400 text-[13px]">{error}</div>
          )}
          {saved && (
            <div className="mb-4 bg-emerald-400/10 border border-emerald-400/30 rounded-[10px] px-3.5 py-2.5 text-emerald-400 text-[13px] flex items-center gap-2">
              ✅ Profile saved successfully!
            </div>
          )}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Weight history */}
        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.05em] m-0">⚖️ Weight History</h2>
              <p className="text-xs text-slate-600 mt-1 m-0">Log weight from the Dashboard. History is preserved — never overwritten.</p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{weightLogs.length} entries</span>
          </div>

          {weightLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <div className="text-[36px] mb-3">⚖️</div>
              <p className="m-0 font-semibold">No weight entries yet</p>
              <p className="m-0 mt-1 text-[13px]">Log your weight from the Dashboard to start tracking</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {weightLogs.map((log, i) => {
                const prev = weightLogs[i + 1]
                const change = prev ? log.weight_kg - prev.weight_kg : null
                const isGain = change !== null && change > 0
                const isLoss = change !== null && change < 0

                const goalDir = profile.goal === 'lose' ? 'lose' : profile.goal === 'gain' ? 'gain' : 'maintain'
                const changeGood =
                  goalDir === 'lose' ? isLoss :
                  goalDir === 'gain' ? isGain :
                  change !== null && Math.abs(change) < 0.3

                const changeColor = change === null ? '' : changeGood ? 'text-emerald-400' : 'text-red-400'

                return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 group">
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {format(parseISO(log.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {format(parseISO(log.date), 'EEEE')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Change badge */}
                      {change !== null && (
                        <div className={`text-xs font-semibold ${changeColor}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                        </div>
                      )}
                      {i === 0 && (
                        <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2 py-0.5">Latest</span>
                      )}

                      {/* Weight */}
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-slate-100">{log.weight_kg} <span className="text-xs text-slate-500 font-normal">kg</span></div>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => deleteWeightEntry(log.id)}
                        className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-slate-600 cursor-pointer text-base p-1 transition-all hover:text-red-400"
                        title="Delete entry"
                      >×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
