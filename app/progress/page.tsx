'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateBMR, calculateTDEE, calculateGoalCalories, getDailyTargets } from '@/lib/nutrition'
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-slate-800 rounded-[10px] px-3.5 py-2.5">
        <p className="m-0 mb-1.5 text-xs text-slate-400">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="m-0 my-0.5 text-[13px] font-semibold" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {p.unit || ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function ProgressPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [dailyNutrition, setDailyNutrition] = useState<DayNutrition[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(14)
  const router = useRouter()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)

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
    setLoading(false)
  }, [router, range])

  useEffect(() => { load() }, [load])

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

  const chartWeight = weightLogs.map(w => ({
    date: format(parseISO(w.date), 'MMM d'),
    weight: w.weight_kg,
  }))

  const chartNutrition = dailyNutrition.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    calories: Math.round(d.calories),
    protein: Math.round(d.protein_g),
    carbs: Math.round(d.carbs_g),
    fat: Math.round(d.fat_g),
  }))

  const weightChangeColor = profile.goal === 'lose'
    ? (weightChange < 0 ? '#34d399' : '#f87171')
    : (weightChange > 0 ? '#34d399' : '#f87171')

  return (
    <div className="min-h-screen">
      <Navbar name={profile.name} />
      <div className="max-w-[1100px] mx-auto px-5 pt-6 pb-24 sm:pb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold m-0 mb-1">Your Progress 📈</h1>
            <p className="text-slate-500 text-sm m-0">Track your body transformation over time</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`py-[7px] px-4 rounded-lg border text-[13px] font-semibold cursor-pointer transition-all ${
                  range === r
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                    : 'border-slate-800 bg-transparent text-slate-500'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            {
              label: 'Body Status', value: improvementConfig.label, sub: `Goal: ${profile.goal}`,
              color: improvementConfig.color, bg: improvementConfig.bg, border: improvementConfig.border, emoji: improvementConfig.emoji
            },
            {
              label: 'Weight Change', value: `${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)} kg`,
              sub: `${startWeight} → ${currentWeight} kg`, color: weightChangeColor,
              bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '⚖️'
            },
            {
              label: 'Avg Calories/day', value: `${avgCal.toFixed(0)} kcal`, sub: `Goal: ${goalCal} kcal`,
              color: Math.abs(avgCal - goalCal) < 200 ? '#34d399' : '#fbbf24',
              bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '🔥'
            },
            {
              label: 'Avg Protein/day', value: `${avgProtein.toFixed(0)}g`, sub: `Goal: ${targets.protein_g}g`,
              color: avgProtein >= targets.protein_g * 0.8 ? '#34d399' : '#fbbf24',
              bg: 'rgba(30,41,59,0.5)', border: '#1e293b', emoji: '🥩'
            },
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
            <div className="text-center py-10 text-slate-600">
              <div className="text-[32px] mb-2">📊</div>
              <p className="m-0">Log your weight daily to see the trend</p>
            </div>
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
      </div>
    </div>
  )
}
