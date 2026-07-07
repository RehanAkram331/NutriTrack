'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateBMR, calculateTDEE, calculateGoalCalories, getDailyTargets } from '@/lib/nutrition'
import { NutrientRow } from '@/components/NutrientBar'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'

interface Profile { id: string; name: string; age: number; gender: string; weight_kg: number; height_cm: number; goal: string; activity_level: string }
interface WeightLog { date: string; weight_kg: number }
interface DayNutrition { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }
interface FoodLog {
  id: string; meal_type: string; food_name: string; quantity_g: number;
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  saturated_fat_g: number; fiber_g: number; sugar_g: number;
  vitamin_a: number; vitamin_c: number; vitamin_d: number; vitamin_e: number;
  calcium_mg: number; iron_mg: number; potassium_mg: number; sodium_mg: number;
  zinc_mg: number | null; omega_3_mg: number | null;
}

const mealColors: Record<string, string> = { breakfast: '#f59e0b', lunch: '#22d3ee', dinner: '#818cf8', snack: '#34d399' }
const mealEmojis: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-slate-800 rounded-[10px] px-3.5 py-2.5">
        <p className="m-0 mb-1.5 text-xs text-slate-400">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="m-0 my-0.5 text-[13px] font-semibold" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.unit || ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function sum(logs: FoodLog[], key: keyof FoodLog): number {
  return logs.reduce((s, l) => s + (Number(l[key]) || 0), 0)
}

function CalorieRing({ value, target, size = 120 }: { value: number; target: number; size?: number }) {
  const pct = Math.min((value / target) * 100, 100)
  const r = size / 2 - 10
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const over = value > target
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={over ? '#f87171' : '#22d3ee'} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-extrabold ${over ? 'text-red-400' : 'text-slate-100'}`}>{Math.round(value)}</span>
        <span className="text-[10px] text-slate-500 font-semibold">kcal</span>
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const today = new Date().toISOString().split('T')[0]
  const [view, setView] = useState<'overview' | 'day' | 'range'>('overview')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ── Overview state ──
  const [range, setRange] = useState(14)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [dailyNutrition, setDailyNutrition] = useState<DayNutrition[]>([])

  // ── Day Report state ──
  const [dayDate, setDayDate] = useState(() => subDays(new Date(), 1).toISOString().split('T')[0])
  const [dayLogs, setDayLogs] = useState<FoodLog[]>([])
  const [dayLoading, setDayLoading] = useState(false)
  const [dayLoaded, setDayLoaded] = useState(false)

  // ── Date Range state ──
  const [rStart, setRStart] = useState(() => subDays(new Date(), 7).toISOString().split('T')[0])
  const [rEnd, setREnd] = useState(() => subDays(new Date(), 1).toISOString().split('T')[0])
  const [rangeDays, setRangeDays] = useState<DayNutrition[]>([])
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeLoaded, setRangeLoaded] = useState(false)

  // ── Initial load (profile + overview) ──
  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)
    setLoading(false)
  }, [router])

  useEffect(() => { loadProfile() }, [loadProfile])

  // ── Overview fetch ──
  const loadOverview = useCallback(async () => {
    if (!profile) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const fromDate = subDays(new Date(), range).toISOString().split('T')[0]

    const { data: wLogs } = await supabase.from('weight_logs')
      .select('date, weight_kg').eq('user_id', user.id)
      .gte('date', fromDate).order('date', { ascending: true })
    setWeightLogs(wLogs || [])

    const { data: fLogs } = await supabase.from('food_logs')
      .select('date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id).gte('date', fromDate).order('date', { ascending: true })

    const dayMap: Record<string, DayNutrition> = {}
    for (let i = 0; i < range; i++) {
      const d = subDays(new Date(), range - 1 - i).toISOString().split('T')[0]
      dayMap[d] = { date: d, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    }
    for (const log of (fLogs || [])) {
      if (dayMap[log.date]) {
        dayMap[log.date].calories += log.calories || 0
        dayMap[log.date].protein_g += log.protein_g || 0
        dayMap[log.date].carbs_g += log.carbs_g || 0
        dayMap[log.date].fat_g += log.fat_g || 0
      }
    }
    setDailyNutrition(Object.values(dayMap))
  }, [profile, range])

  useEffect(() => { if (view === 'overview') loadOverview() }, [view, loadOverview])

  // ── Day Report fetch ──
  async function loadDay() {
    if (!profile) return
    setDayLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', dayDate).order('created_at', { ascending: true })
    setDayLogs(data || [])
    setDayLoaded(true)
    setDayLoading(false)
  }

  // ── Date Range fetch ──
  async function loadRange() {
    if (!profile) return
    setRangeLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fLogs } = await supabase.from('food_logs')
      .select('date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id).gte('date', rStart).lte('date', rEnd)
      .order('date', { ascending: true })

    const dayMap: Record<string, DayNutrition> = {}
    const start = new Date(rStart + 'T00:00:00')
    const end = new Date(rEnd + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      dayMap[key] = { date: key, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    }
    for (const log of (fLogs || [])) {
      if (dayMap[log.date]) {
        dayMap[log.date].calories += log.calories || 0
        dayMap[log.date].protein_g += log.protein_g || 0
        dayMap[log.date].carbs_g += log.carbs_g || 0
        dayMap[log.date].fat_g += log.fat_g || 0
      }
    }
    setRangeDays(Object.values(dayMap))
    setRangeLoaded(true)
    setRangeLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-[40px] mb-3">📊</div>
        <p className="text-slate-400">Loading your progress...</p>
      </div>
    </div>
  )
  if (!profile) return null

  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender)
  const tdee = calculateTDEE(bmr, profile.activity_level)
  const goalCal = calculateGoalCalories(tdee, profile.goal)
  const targets = getDailyTargets(goalCal, profile.weight_kg)

  // ── Overview derived ──
  const startWeight = weightLogs[0]?.weight_kg || profile.weight_kg
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg || profile.weight_kg
  const weightChange = currentWeight - startWeight
  const loggedDays = dailyNutrition.filter(d => d.calories > 0)
  const avgCal = loggedDays.length ? loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length : 0
  const avgProtein = loggedDays.length ? loggedDays.reduce((s, d) => s + d.protein_g, 0) / loggedDays.length : 0
  const improvementScore = (() => {
    if (weightLogs.length < 2) return null
    if (profile.goal === 'lose') return weightChange < 0 ? 'improving' : weightChange === 0 ? 'stable' : 'needs_work'
    if (profile.goal === 'gain') return weightChange > 0 ? 'improving' : weightChange === 0 ? 'stable' : 'needs_work'
    return Math.abs(weightChange) < 0.5 ? 'improving' : 'stable'
  })()
  const improvementConfig = {
    improving: { label: 'On Track! 🎯', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', emoji: '📈' },
    stable: { label: 'Stable 📊', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.3)', emoji: '➡️' },
    needs_work: { label: 'Keep Going! 💪', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', emoji: '📉' },
    null: { label: 'Log more data', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', emoji: '📋' },
  }[improvementScore ?? 'null']
  const weightChangeColor = profile.goal === 'lose' ? (weightChange < 0 ? '#34d399' : '#f87171') : (weightChange > 0 ? '#34d399' : '#f87171')
  const chartWeight = weightLogs.map(w => ({ date: format(parseISO(w.date), 'MMM d'), weight: w.weight_kg }))
  const chartNutrition = dailyNutrition.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    calories: Math.round(d.calories), protein: Math.round(d.protein_g),
    carbs: Math.round(d.carbs_g), fat: Math.round(d.fat_g),
  }))

  // ── Day Report derived ──
  const dayTotals = {
    calories: sum(dayLogs, 'calories'), protein_g: sum(dayLogs, 'protein_g'),
    carbs_g: sum(dayLogs, 'carbs_g'), fat_g: sum(dayLogs, 'fat_g'),
    saturated_fat_g: sum(dayLogs, 'saturated_fat_g'), fiber_g: sum(dayLogs, 'fiber_g'),
    sugar_g: sum(dayLogs, 'sugar_g'), vitamin_a: sum(dayLogs, 'vitamin_a'),
    vitamin_c: sum(dayLogs, 'vitamin_c'), vitamin_d: sum(dayLogs, 'vitamin_d'),
    vitamin_e: sum(dayLogs, 'vitamin_e'), calcium_mg: sum(dayLogs, 'calcium_mg'),
    iron_mg: sum(dayLogs, 'iron_mg'), potassium_mg: sum(dayLogs, 'potassium_mg'),
    sodium_mg: sum(dayLogs, 'sodium_mg'), zinc_mg: sum(dayLogs, 'zinc_mg'),
    omega_3_mg: sum(dayLogs, 'omega_3_mg'),
  }
  const dayMeals = ['breakfast', 'lunch', 'dinner', 'snack'].map(m => ({
    meal: m, items: dayLogs.filter(l => l.meal_type === m),
  })).filter(g => g.items.length > 0)

  // ── Date Range derived ──
  const rangeLoggedDays = rangeDays.filter(d => d.calories > 0)
  const rangeAvgCal = rangeLoggedDays.length ? rangeLoggedDays.reduce((s, d) => s + d.calories, 0) / rangeLoggedDays.length : 0
  const rangeAvgProtein = rangeLoggedDays.length ? rangeLoggedDays.reduce((s, d) => s + d.protein_g, 0) / rangeLoggedDays.length : 0
  const rangeAvgCarbs = rangeLoggedDays.length ? rangeLoggedDays.reduce((s, d) => s + d.carbs_g, 0) / rangeLoggedDays.length : 0
  const rangeAvgFat = rangeLoggedDays.length ? rangeLoggedDays.reduce((s, d) => s + d.fat_g, 0) / rangeLoggedDays.length : 0
  const chartRange = rangeDays.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    calories: Math.round(d.calories), protein: Math.round(d.protein_g),
    carbs: Math.round(d.carbs_g), fat: Math.round(d.fat_g),
  }))

  const inputCls = 'bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-2.5 text-slate-100 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 transition-colors'

  return (
    <div className="min-h-screen">
      <Navbar name={profile.name} />
      <div className="max-w-[1100px] mx-auto px-4 pt-6 pb-24 sm:pb-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold m-0 mb-1">Progress & Reports 📊</h1>
          <p className="text-slate-500 text-sm m-0">Track trends or view any day's full nutrition</p>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-900 border border-slate-800 rounded-xl p-1 mb-5">
          {([
            { key: 'overview', label: '📈 Overview' },
            { key: 'day', label: '📅 Day Report' },
            { key: 'range', label: '📆 Date Range' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setView(t.key)}
              className="flex-1 py-2 rounded-lg border-none text-[13px] font-semibold cursor-pointer transition-all"
              style={{ background: view === t.key ? 'linear-gradient(135deg,#22d3ee,#818cf8)' : 'transparent', color: view === t.key ? 'white' : '#64748b' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {view === 'overview' && (
          <>
            <div className="flex justify-end gap-2 mb-4">
              {[7, 14, 30].map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`py-[7px] px-4 rounded-lg border text-[13px] font-semibold cursor-pointer transition-all ${range === r ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-800 bg-transparent text-slate-500'}`}>
                  {r}d
                </button>
              ))}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Body Status', value: improvementConfig.label, sub: `Goal: ${profile.goal}`, color: improvementConfig.color, bg: improvementConfig.bg, border: improvementConfig.border, emoji: improvementConfig.emoji },
                { label: 'Weight Change', value: `${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)} kg`, sub: `${startWeight} → ${currentWeight} kg`, color: weightChangeColor, bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '⚖️' },
                { label: 'Avg Calories/day', value: `${avgCal.toFixed(0)} kcal`, sub: `Goal: ${goalCal} kcal`, color: Math.abs(avgCal - goalCal) < 200 ? '#34d399' : '#fbbf24', bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '🔥' },
                { label: 'Avg Protein/day', value: `${avgProtein.toFixed(0)}g`, sub: `Goal: ${targets.protein_g}g`, color: avgProtein >= targets.protein_g * 0.8 ? '#34d399' : '#fbbf24', bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '🥩' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                  <div className="text-xl mb-1.5">{card.emoji}</div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.05em] mb-1">{card.label}</div>
                  <div className="text-lg font-extrabold" style={{ color: card.color }}>{card.value}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Weight chart */}
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 mb-5">
              <h3 className="m-0 mb-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">⚖️ Weight Trend</h3>
              {chartWeight.length < 2 ? (
                <div className="text-center py-10 text-slate-600"><div className="text-[32px] mb-2">📊</div><p className="m-0">Log your weight daily to see the trend</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartWeight} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="kg" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={profile.weight_kg} stroke="#475569" strokeDasharray="4 4" label={{ value: 'Start', fill: '#64748b', fontSize: 10 }} />
                    <Area type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ fill: '#22d3ee', r: 3 }} name="Weight" unit="kg" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Calorie chart */}
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 mb-5">
              <h3 className="m-0 mb-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🔥 Daily Calories</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartNutrition} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={goalCal} stroke="#22d3ee" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#22d3ee', fontSize: 10 }} />
                  <Bar dataKey="calories" fill="#818cf8" radius={[4, 4, 0, 0]} name="Calories" unit="kcal" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Macros chart */}
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="m-0 mb-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🥗 Macronutrients History</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartNutrition} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="g" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="protein" stroke="#818cf8" strokeWidth={2} dot={false} name="Protein" unit="g" />
                  <Line type="monotone" dataKey="carbs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Carbs" unit="g" />
                  <Line type="monotone" dataKey="fat" stroke="#34d399" strokeWidth={2} dot={false} name="Fat" unit="g" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ══════════════ DAY REPORT ══════════════ */}
        {view === 'day' && (
          <>
            {/* Date picker */}
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-5">
              <h3 className="m-0 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">📅 Select Date</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input type="date" value={dayDate} max={today}
                    onChange={e => { setDayDate(e.target.value); setDayLoaded(false) }}
                    className={inputCls + ' w-full'} style={{ colorScheme: 'dark' }} />
                </div>
                <button onClick={loadDay} disabled={dayLoading}
                  className="px-5 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white cursor-pointer transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#22d3ee,#818cf8)' }}>
                  {dayLoading ? 'Loading…' : 'View Report'}
                </button>
              </div>
              {dayDate && (
                <p className="mt-2 text-[12px] text-slate-500">
                  {new Date(dayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {!dayLoaded && !dayLoading && (
              <div className="text-center py-16 text-slate-600">
                <div className="text-[40px] mb-3">📅</div>
                <p className="m-0 font-semibold">Pick a date and tap View Report</p>
              </div>
            )}

            {dayLoading && (
              <div className="text-center py-16 text-slate-500">
                <div className="text-[32px] mb-3 animate-pulse">⏳</div>
                <p className="m-0">Loading report…</p>
              </div>
            )}

            {dayLoaded && !dayLoading && (
              <>
                {dayLogs.length === 0 ? (
                  <div className="text-center py-16 text-slate-600">
                    <div className="text-[40px] mb-3">🥗</div>
                    <p className="m-0 font-semibold">No food logged on this day</p>
                    <p className="m-0 mt-1 text-sm">Try selecting a different date</p>
                  </div>
                ) : (
                  <>
                    {/* Calorie + macros summary */}
                    <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-4">
                      <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🔥 Daily Summary</h3>
                      <div className="flex gap-5 items-center">
                        <CalorieRing value={dayTotals.calories} target={goalCal} size={110} />
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Protein', value: dayTotals.protein_g, target: targets.protein_g, unit: 'g', color: '#818cf8' },
                            { label: 'Carbs', value: dayTotals.carbs_g, target: targets.carbs_g, unit: 'g', color: '#f59e0b' },
                            { label: 'Fat', value: dayTotals.fat_g, target: targets.fat_g, unit: 'g', color: '#34d399' },
                            { label: 'Fiber', value: dayTotals.fiber_g, target: targets.fiber_g, unit: 'g', color: '#22d3ee' },
                          ].map(m => (
                            <div key={m.label} className="text-center p-3 rounded-xl bg-slate-900">
                              <div className="text-lg font-extrabold" style={{ color: m.color }}>{m.value.toFixed(1)}<span className="text-[10px] text-slate-500">/{m.target}{m.unit}</span></div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{m.label}</div>
                              <div className="nutrient-bar mt-1.5">
                                <div className="nutrient-bar-fill" style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%`, background: m.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Vitamins + Minerals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🧪 Vitamins</h3>
                        <NutrientRow label="Vitamin A" value={dayTotals.vitamin_a} target={targets.vitamin_a} unit="mcg" color="#f59e0b" />
                        <NutrientRow label="Vitamin C" value={dayTotals.vitamin_c} target={targets.vitamin_c} unit="mg" color="#22d3ee" />
                        <NutrientRow label="Vitamin D" value={dayTotals.vitamin_d} target={targets.vitamin_d} unit="mcg" color="#fbbf24" />
                        <NutrientRow label="Vitamin E" value={dayTotals.vitamin_e} target={targets.vitamin_e} unit="mg" color="#fb923c" />
                      </div>
                      <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🪨 Minerals</h3>
                        <NutrientRow label="Calcium" value={dayTotals.calcium_mg} target={targets.calcium_mg} unit="mg" color="#34d399" />
                        <NutrientRow label="Iron" value={dayTotals.iron_mg} target={targets.iron_mg} unit="mg" color="#f87171" />
                        <NutrientRow label="Zinc" value={dayTotals.zinc_mg} target={targets.zinc_mg} unit="mg" color="#a78bfa" />
                        <NutrientRow label="Potassium" value={dayTotals.potassium_mg} target={targets.potassium_mg} unit="mg" color="#818cf8" />
                        <NutrientRow label="Sodium" value={dayTotals.sodium_mg} target={targets.sodium_mg} unit="mg" color="#fb7185" />
                        <NutrientRow label="Omega-3" value={dayTotals.omega_3_mg} target={targets.omega_3_mg} unit="mg" color="#22d3ee" />
                      </div>
                    </div>

                    {/* Meals breakdown */}
                    <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5">
                      <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🍽️ Meals</h3>
                      <div className="flex flex-col gap-4">
                        {dayMeals.map(({ meal, items }) => (
                          <div key={meal}>
                            <div className="flex items-center gap-2 mb-2">
                              <span>{mealEmojis[meal]}</span>
                              <span className="text-[13px] font-bold capitalize" style={{ color: mealColors[meal] }}>{meal}</span>
                              <span className="ml-auto text-xs text-slate-500">
                                {items.reduce((s, l) => s + l.calories, 0).toFixed(0)} kcal
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {items.map((log, i) => (
                                <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-900">
                                  <div>
                                    <div className="text-[13px] font-medium text-slate-200">{log.food_name}</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {log.quantity_g}g · P:{log.protein_g.toFixed(1)}g · C:{log.carbs_g.toFixed(1)}g · F:{log.fat_g.toFixed(1)}g
                                    </div>
                                  </div>
                                  <span className="text-[13px] font-bold text-cyan-400 ml-3">{log.calories.toFixed(0)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════ DATE RANGE ══════════════ */}
        {view === 'range' && (
          <>
            {/* Range picker */}
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-5">
              <h3 className="m-0 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">📆 Select Date Range</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] mb-1.5">From</label>
                  <input type="date" value={rStart} max={rEnd}
                    onChange={e => { setRStart(e.target.value); setRangeLoaded(false) }}
                    className={inputCls + ' w-full'} style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] mb-1.5">To</label>
                  <input type="date" value={rEnd} min={rStart} max={today}
                    onChange={e => { setREnd(e.target.value); setRangeLoaded(false) }}
                    className={inputCls + ' w-full'} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {[
                  { label: 'Last 7 days', days: 7 },
                  { label: 'Last 14 days', days: 14 },
                  { label: 'Last 30 days', days: 30 },
                ].map(({ label, days }) => (
                  <button key={days} type="button"
                    onClick={() => { setRStart(subDays(new Date(), days).toISOString().split('T')[0]); setREnd(subDays(new Date(), 1).toISOString().split('T')[0]); setRangeLoaded(false) }}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-transparent text-[12px] font-semibold text-slate-400 cursor-pointer hover:border-cyan-400 hover:text-cyan-400 transition-all">
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={loadRange} disabled={rangeLoading}
                className="w-full py-2.5 rounded-[10px] border-none text-sm font-semibold text-white cursor-pointer transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#22d3ee,#818cf8)' }}>
                {rangeLoading ? 'Loading…' : 'View Report'}
              </button>
            </div>

            {!rangeLoaded && !rangeLoading && (
              <div className="text-center py-16 text-slate-600">
                <div className="text-[40px] mb-3">📆</div>
                <p className="m-0 font-semibold">Set a date range and tap View Report</p>
              </div>
            )}

            {rangeLoading && (
              <div className="text-center py-16 text-slate-500">
                <div className="text-[32px] mb-3 animate-pulse">⏳</div>
                <p className="m-0">Loading report…</p>
              </div>
            )}

            {rangeLoaded && !rangeLoading && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { emoji: '📅', label: 'Days Logged', value: `${rangeLoggedDays.length}/${rangeDays.length}`, color: '#22d3ee' },
                    { emoji: '🔥', label: 'Avg Calories', value: `${rangeAvgCal.toFixed(0)} kcal`, color: Math.abs(rangeAvgCal - goalCal) < 200 ? '#34d399' : '#fbbf24' },
                    { emoji: '🥩', label: 'Avg Protein', value: `${rangeAvgProtein.toFixed(0)}g`, color: rangeAvgProtein >= targets.protein_g * 0.8 ? '#34d399' : '#fbbf24' },
                    { emoji: '🍞', label: 'Avg Carbs', value: `${rangeAvgCarbs.toFixed(0)}g`, color: '#f59e0b' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-900 border border-slate-800 rounded-2xl p-4">
                      <div className="text-xl mb-1">{card.emoji}</div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.05em] mb-1">{card.label}</div>
                      <div className="text-base font-extrabold" style={{ color: card.color }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Calorie bar chart */}
                <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🔥 Daily Calories</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartRange} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={goalCal} stroke="#22d3ee" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#22d3ee', fontSize: 10 }} />
                      <Bar dataKey="calories" fill="#818cf8" radius={[4, 4, 0, 0]} name="Calories" unit="kcal" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Macro line chart */}
                <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🥗 Macronutrients</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartRange} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="g" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="protein" stroke="#818cf8" strokeWidth={2} dot={false} name="Protein" unit="g" />
                      <Line type="monotone" dataKey="carbs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Carbs" unit="g" />
                      <Line type="monotone" dataKey="fat" stroke="#34d399" strokeWidth={2} dot={false} name="Fat" unit="g" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily table */}
                <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5">
                  <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">📋 Daily Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[400px]">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-2 pr-4 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Date</th>
                          <th className="text-right py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Calories</th>
                          <th className="text-right py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Protein</th>
                          <th className="text-right py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Carbs</th>
                          <th className="text-right py-2 pl-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Fat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rangeDays.map(day => {
                          const hasData = day.calories > 0
                          return (
                            <tr key={day.date} className="border-b border-slate-900 hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 pr-4">
                                <div className="text-[13px] font-semibold text-slate-200">
                                  {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                              </td>
                              <td className="text-right py-2.5 px-2">
                                {hasData ? (
                                  <span className={`text-[13px] font-bold ${Math.abs(day.calories - goalCal) < 200 ? 'text-emerald-400' : 'text-slate-200'}`}>
                                    {day.calories.toFixed(0)}
                                  </span>
                                ) : <span className="text-slate-700 text-xs">—</span>}
                              </td>
                              <td className="text-right py-2.5 px-2 text-[13px] text-slate-300">{hasData ? `${day.protein_g.toFixed(0)}g` : <span className="text-slate-700 text-xs">—</span>}</td>
                              <td className="text-right py-2.5 px-2 text-[13px] text-slate-300">{hasData ? `${day.carbs_g.toFixed(0)}g` : <span className="text-slate-700 text-xs">—</span>}</td>
                              <td className="text-right py-2.5 pl-2 text-[13px] text-slate-300">{hasData ? `${day.fat_g.toFixed(0)}g` : <span className="text-slate-700 text-xs">—</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-700">
                          <td className="py-2.5 pr-4 text-[11px] font-bold text-slate-400 uppercase">Avg / day</td>
                          <td className="text-right py-2.5 px-2 text-[13px] font-bold text-cyan-400">{rangeAvgCal.toFixed(0)}</td>
                          <td className="text-right py-2.5 px-2 text-[13px] font-bold text-purple-400">{rangeAvgProtein.toFixed(0)}g</td>
                          <td className="text-right py-2.5 px-2 text-[13px] font-bold text-amber-400">{rangeAvgCarbs.toFixed(0)}g</td>
                          <td className="text-right py-2.5 pl-2 text-[13px] font-bold text-emerald-400">{rangeAvgFat.toFixed(0)}g</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
