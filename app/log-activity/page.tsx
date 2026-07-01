'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'

interface Profile { id: string; name: string; weight_kg: number }

const EXERCISES = [
  { id: 'walking',        label: 'Walking',        emoji: '🚶', category: 'cardio',    met: 3.5 },
  { id: 'running',        label: 'Running',        emoji: '🏃', category: 'cardio',    met: 8.0 },
  { id: 'cycling',        label: 'Cycling',        emoji: '🚴', category: 'cardio',    met: 6.0 },
  { id: 'swimming',       label: 'Swimming',       emoji: '🏊', category: 'cardio',    met: 6.0 },
  { id: 'jump_rope',      label: 'Jump Rope',      emoji: '🪢', category: 'cardio',    met: 10.0 },
  { id: 'pushups',        label: 'Push-ups',       emoji: '💪', category: 'strength',  met: 4.0 },
  { id: 'pullups',        label: 'Pull-ups',       emoji: '🏋️', category: 'strength',  met: 4.0 },
  { id: 'squats',         label: 'Squats',         emoji: '🦵', category: 'strength',  met: 5.0 },
  { id: 'weight_training',label: 'Weight Training',emoji: '🏋️', category: 'strength',  met: 5.0 },
  { id: 'yoga',           label: 'Yoga',           emoji: '🧘', category: 'flexibility',met: 2.5 },
  { id: 'football',       label: 'Football',       emoji: '⚽', category: 'sports',    met: 7.0 },
  { id: 'basketball',     label: 'Basketball',     emoji: '🏀', category: 'sports',    met: 6.5 },
  { id: 'other',          label: 'Other',          emoji: '⚡', category: 'other',     met: 4.0 },
]

const CATEGORY_LABELS: Record<string, string> = {
  cardio: '❤️ Cardio', strength: '💪 Strength', flexibility: '🧘 Flexibility',
  sports: '⚽ Sports', other: '⚡ Other',
}

const isCardio = (id: string) => ['walking','running','cycling','swimming','jump_rope'].includes(id)
const isStrength = (id: string) => ['pushups','pullups','squats','weight_training'].includes(id)

const inputCls = 'bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5'

export default function LogActivityPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'sleep' | 'exercise'>('sleep')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  // Sleep state
  const [sleepHours, setSleepHours] = useState('7')
  const [bedtime, setBedtime] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [sleepQuality, setSleepQuality] = useState(3)
  const [existingSleep, setExistingSleep] = useState<{ id: string; hours_slept: number } | null>(null)
  const [sleepLoading, setSleepLoading] = useState(false)
  const [sleepSuccess, setSleepSuccess] = useState(false)

  // Exercise state
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0])
  const [duration, setDuration] = useState('30')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [distance, setDistance] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [todayExercises, setTodayExercises] = useState<Array<{ id: string; exercise_type: string; duration_minutes: number; calories_burned: number; sets?: number; reps?: number; distance_km?: number }>>([])
  const [exLoading, setExLoading] = useState(false)
  const [exSuccess, setExSuccess] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles').select('id,name,weight_kg').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)

    const { data: sl } = await supabase.from('sleep_logs').select('*').eq('user_id', user.id).eq('date', today).single()
    if (sl) {
      setExistingSleep(sl)
      setSleepHours(sl.hours_slept.toString())
      if (sl.bedtime) setBedtime(sl.bedtime)
      if (sl.wake_time) setWakeTime(sl.wake_time)
      if (sl.quality) setSleepQuality(sl.quality)
    }

    const { data: ex } = await supabase.from('exercise_logs').select('*').eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false })
    setTodayExercises(ex || [])
  }, [router, today])

  useEffect(() => { load() }, [load])

  // Auto-calc hours from bedtime/wake time
  useEffect(() => {
    if (!bedtime || !wakeTime) return
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    let mins = (wh * 60 + wm) - (bh * 60 + bm)
    if (mins < 0) mins += 24 * 60
    setSleepHours((mins / 60).toFixed(1))
  }, [bedtime, wakeTime])

  const estimatedCalories = Math.round(
    selectedExercise.met * (profile?.weight_kg ?? 70) * ((parseFloat(duration) || 0) / 60)
  )

  async function saveSleep() {
    if (!profile) return
    setSleepLoading(true)
    const payload = {
      user_id: profile.id, date: today,
      hours_slept: parseFloat(sleepHours) || 7,
      bedtime: bedtime || null, wake_time: wakeTime || null,
      quality: sleepQuality,
    }
    if (existingSleep) {
      await supabase.from('sleep_logs').update(payload).eq('id', existingSleep.id)
    } else {
      const { data } = await supabase.from('sleep_logs').insert(payload).select().single()
      if (data) setExistingSleep(data)
    }
    setSleepSuccess(true)
    setTimeout(() => setSleepSuccess(false), 3000)
    setSleepLoading(false)
  }

  async function saveExercise() {
    if (!profile) return
    setExLoading(true)
    const payload = {
      user_id: profile.id, date: today,
      exercise_type: selectedExercise.id,
      exercise_label: selectedExercise.label,
      duration_minutes: parseFloat(duration) || 0,
      sets: isStrength(selectedExercise.id) ? parseInt(sets) || null : null,
      reps: isStrength(selectedExercise.id) ? parseInt(reps) || null : null,
      distance_km: isCardio(selectedExercise.id) && distance ? parseFloat(distance) : null,
      calories_burned: estimatedCalories,
      notes: exerciseNotes || null,
    }
    const { data } = await supabase.from('exercise_logs').insert(payload).select().single()
    if (data) setTodayExercises(prev => [data, ...prev])
    setDuration('30'); setSets('3'); setReps('10'); setDistance(''); setExerciseNotes('')
    setExSuccess(true)
    setTimeout(() => setExSuccess(false), 3000)
    setExLoading(false)
  }

  async function deleteExercise(id: string) {
    await supabase.from('exercise_logs').delete().eq('id', id)
    setTodayExercises(prev => prev.filter(e => e.id !== id))
  }

  const qualityLabels = ['', '😴 Poor', '😐 Fair', '😊 Good', '😄 Great', '🌟 Perfect']
  const qualityColors = ['', '#f87171', '#fbbf24', '#22d3ee', '#34d399', '#818cf8']
  const groupedExercises = Array.from(new Set(EXERCISES.map(e => e.category)))

  return (
    <div className="min-h-screen">
      <Navbar name={profile?.name} />
      <div className="max-w-[700px] mx-auto px-5 pt-6 pb-24 sm:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold m-0 mb-1">Log Activity</h1>
          <p className="text-slate-500 text-sm m-0">Track your sleep and workouts for today</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 border border-slate-800 rounded-xl p-1 mb-4">
          {(['sleep', 'exercise'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg border-none text-[13px] font-semibold cursor-pointer transition-all"
              style={{ background: tab === t ? 'linear-gradient(135deg, #22d3ee, #818cf8)' : 'transparent', color: tab === t ? 'white' : '#64748b' }}>
              {t === 'sleep' ? '😴 Sleep' : '🏋️ Exercise'}
            </button>
          ))}
        </div>

        {/* ── SLEEP TAB ── */}
        {tab === 'sleep' && (
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            {existingSleep && (
              <div className="mb-4 bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-4 py-2 text-emerald-400 text-xs font-semibold">
                ✓ Sleep logged today — update below
              </div>
            )}

            {sleepSuccess && (
              <div className="mb-4 bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 font-semibold flex items-center gap-2">
                ✅ Sleep saved!
              </div>
            )}

            {/* Hours display */}
            <div className="text-center mb-6">
              <div className="text-[64px] font-extrabold leading-none"
                style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {parseFloat(sleepHours) || 7}h
              </div>
              <p className="text-slate-500 text-sm mt-1">hours of sleep</p>
              {(parseFloat(sleepHours) || 7) < 6 && <p className="text-red-400 text-xs mt-1">⚠️ Less than 6h — try to get more rest</p>}
              {(parseFloat(sleepHours) || 7) >= 8 && <p className="text-emerald-400 text-xs mt-1">✓ Great sleep duration!</p>}
            </div>

            {/* Quick hours slider */}
            <div className="mb-5">
              <label className={labelCls}>Sleep Duration (hours)</label>
              <input type="range" min="1" max="12" step="0.5"
                value={parseFloat(sleepHours) || 7}
                onChange={e => setSleepHours(e.target.value)}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                <span>1h</span><span>4h</span><span>7h</span><span>10h</span><span>12h</span>
              </div>
            </div>

            {/* Bedtime / Wake time */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className={labelCls}>Bedtime <span className="normal-case font-normal text-slate-600">(optional)</span></label>
                <input className={inputCls} type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Wake Time <span className="normal-case font-normal text-slate-600">(optional)</span></label>
                <input className={inputCls} type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
              </div>
            </div>

            {/* Quality */}
            <div className="mb-6">
              <label className={labelCls}>Sleep Quality</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(q => (
                  <button key={q} type="button" onClick={() => setSleepQuality(q)}
                    className="flex-1 py-3 rounded-xl border-2 text-xl cursor-pointer transition-all"
                    style={{
                      borderColor: sleepQuality === q ? qualityColors[q] : '#1e293b',
                      background: sleepQuality === q ? `${qualityColors[q]}18` : '#0f172a',
                    }}>
                    {['😴','😐','😊','😄','🌟'][q - 1]}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs mt-2" style={{ color: qualityColors[sleepQuality] }}>
                {qualityLabels[sleepQuality]}
              </p>
            </div>

            <button onClick={saveSleep} disabled={sleepLoading}
              className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)' }}>
              {sleepLoading ? 'Saving...' : existingSleep ? '✏️ Update Sleep Log' : '😴 Log Sleep'}
            </button>
            <p className="text-center text-xs text-slate-600 mt-2">Default is 7 hours if not logged</p>
          </div>
        )}

        {/* ── EXERCISE TAB ── */}
        {tab === 'exercise' && (
          <div className="flex flex-col gap-4">
            {exSuccess && (
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 font-semibold flex items-center gap-2">
                ✅ Exercise logged!
              </div>
            )}

            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
              {/* Exercise picker */}
              <div className="mb-5">
                <label className={labelCls}>Exercise Type</label>
                {groupedExercises.map(cat => (
                  <div key={cat} className="mb-3">
                    <p className="text-[11px] text-slate-600 font-semibold mb-2">{CATEGORY_LABELS[cat]}</p>
                    <div className="flex flex-wrap gap-2">
                      {EXERCISES.filter(e => e.category === cat).map(ex => (
                        <button key={ex.id} type="button" onClick={() => setSelectedExercise(ex)}
                          className="px-3 py-2 rounded-[10px] border-2 text-[13px] font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                          style={{
                            borderColor: selectedExercise.id === ex.id ? '#22d3ee' : '#1e293b',
                            background: selectedExercise.id === ex.id ? 'rgba(34,211,238,0.08)' : '#0f172a',
                            color: selectedExercise.id === ex.id ? '#22d3ee' : '#94a3b8',
                          }}>
                          <span>{ex.emoji}</span>
                          <span>{ex.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className={labelCls}>Duration (minutes)</label>
                <input className={inputCls} type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" />
              </div>

              {/* Cardio: distance */}
              {isCardio(selectedExercise.id) && (
                <div className="mb-4">
                  <label className={labelCls}>Distance (km) <span className="normal-case font-normal text-slate-600">optional</span></label>
                  <input className={inputCls} type="number" step="0.1" min={0} value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 3.5" />
                </div>
              )}

              {/* Strength: sets + reps */}
              {isStrength(selectedExercise.id) && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelCls}>Sets</label>
                    <input className={inputCls} type="number" min={1} value={sets} onChange={e => setSets(e.target.value)} placeholder="3" />
                  </div>
                  <div>
                    <label className={labelCls}>Reps</label>
                    <input className={inputCls} type="number" min={1} value={reps} onChange={e => setReps(e.target.value)} placeholder="10" />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-5">
                <label className={labelCls}>Notes <span className="normal-case font-normal text-slate-600">optional</span></label>
                <input className={inputCls} value={exerciseNotes} onChange={e => setExerciseNotes(e.target.value)} placeholder="e.g. felt strong today" />
              </div>

              {/* Estimated calories */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 mb-5">
                <span className="text-sm text-slate-400">Est. calories burned</span>
                <span className="font-extrabold text-orange-400 text-lg">{estimatedCalories} kcal</span>
              </div>

              <button onClick={saveExercise} disabled={exLoading || !duration}
                className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}>
                {exLoading ? 'Logging...' : `Log ${selectedExercise.emoji} ${selectedExercise.label}`}
              </button>
            </div>

            {/* Today's exercise list */}
            {todayExercises.length > 0 && (
              <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-3">Today's Workouts</h3>
                <div className="flex flex-col gap-2">
                  {todayExercises.map(ex => {
                    const def = EXERCISES.find(e => e.id === ex.exercise_type)
                    return (
                      <div key={ex.id} className="flex justify-between items-center px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            <span>{def?.emoji ?? '⚡'}</span>
                            <span>{def?.label ?? ex.exercise_type}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                            <span>{ex.duration_minutes} min</span>
                            {ex.sets && <span>· {ex.sets}×{ex.reps}</span>}
                            {ex.distance_km && <span>· {ex.distance_km} km</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-400 font-bold text-sm">{ex.calories_burned} kcal</span>
                          <button onClick={() => deleteExercise(ex.id)}
                            className="bg-transparent border-none text-gray-700 cursor-pointer text-base p-1 transition-colors hover:text-red-400">×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-sm">
                  <span className="text-slate-500">Total burned today</span>
                  <span className="font-bold text-orange-400">
                    {todayExercises.reduce((s, e) => s + e.calories_burned, 0)} kcal
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
