'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateBMR, calculateTDEE, calculateGoalCalories, calculateBMI, getBMICategory, getDailyTargets } from '@/lib/nutrition'
import { NutrientRow, CircleProgress } from '@/components/NutrientBar'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string; name: string; age: number; gender: string; weight_kg: number;
  height_cm: number; goal: string; activity_level: string;
}
interface SleepLog { hours_slept: number; quality: number | null }
interface ExerciseLog { id: string; exercise_type: string; exercise_label: string; duration_minutes: number; calories_burned: number }

interface FoodLog {
  id: string; meal_type: string; food_name: string; quantity_g: number;
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  saturated_fat_g: number; fiber_g: number; sugar_g: number;
  vitamin_a: number; vitamin_c: number; vitamin_d: number; vitamin_e: number;
  calcium_mg: number; iron_mg: number; potassium_mg: number; sodium_mg: number;
}

const mealColors: Record<string, string> = {
  breakfast: '#f59e0b', lunch: '#22d3ee', dinner: '#818cf8', snack: '#34d399'
}

type NutrientKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'saturated_fat_g' | 'fiber_g' | 'sugar_g' |
  'vitamin_a' | 'vitamin_c' | 'vitamin_d' | 'vitamin_e' | 'calcium_mg' | 'iron_mg' | 'potassium_mg' | 'sodium_mg'

function sumLogs(logs: FoodLog[], key: NutrientKey): number {
  return logs.reduce((s, l) => s + (l[key] || 0), 0)
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [sleepLog, setSleepLog] = useState<SleepLog | null>(null)
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [todayWeight, setTodayWeight] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)

    const { data: foodLogs } = await supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', today)
    setLogs(foodLogs || [])

    const { data: wLog } = await supabase.from('weight_logs').select('weight_kg').eq('user_id', user.id).eq('date', today).single()
    if (wLog) setTodayWeight(wLog.weight_kg.toString())

    const { data: sl } = await supabase.from('sleep_logs').select('hours_slept,quality').eq('user_id', user.id).eq('date', today).single()
    setSleepLog(sl ?? null)

    const { data: ex } = await supabase.from('exercise_logs').select('id,exercise_type,exercise_label,duration_minutes,calories_burned').eq('user_id', user.id).eq('date', today)
    setExerciseLogs(ex || [])

    setLoading(false)
  }, [router, today])

  useEffect(() => { load() }, [load])

  async function logWeight() {
    if (!weightInput || !profile) return
    setSavingWeight(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('weight_logs').insert({ user_id: user!.id, date: today, weight_kg: parseFloat(weightInput) })
    setTodayWeight(weightInput)
    setWeightInput('')
    setSavingWeight(false)
  }

  async function deleteLog(id: string) {
    await supabase.from('food_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-[40px] mb-3">🥗</div>
        <p className="text-slate-400">Loading your nutrition data...</p>
      </div>
    </div>
  )

  if (!profile) return null

  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender)
  const tdee = calculateTDEE(bmr, profile.activity_level)
  const goalCal = calculateGoalCalories(tdee, profile.goal)
  const targets = getDailyTargets(goalCal, profile.weight_kg)
  const bmi = calculateBMI(profile.weight_kg, profile.height_cm)
  const bmiCat = getBMICategory(bmi)

  const totals = {
    calories: sumLogs(logs, 'calories'),
    protein_g: sumLogs(logs, 'protein_g'),
    carbs_g: sumLogs(logs, 'carbs_g'),
    fat_g: sumLogs(logs, 'fat_g'),
    saturated_fat_g: sumLogs(logs, 'saturated_fat_g'),
    fiber_g: sumLogs(logs, 'fiber_g'),
    sugar_g: sumLogs(logs, 'sugar_g'),
    vitamin_a: sumLogs(logs, 'vitamin_a'),
    vitamin_c: sumLogs(logs, 'vitamin_c'),
    vitamin_d: sumLogs(logs, 'vitamin_d'),
    vitamin_e: sumLogs(logs, 'vitamin_e'),
    calcium_mg: sumLogs(logs, 'calcium_mg'),
    iron_mg: sumLogs(logs, 'iron_mg'),
    potassium_mg: sumLogs(logs, 'potassium_mg'),
    sodium_mg: sumLogs(logs, 'sodium_mg'),
  }

  const calRemaining = goalCal - totals.calories
  const calPct = Math.min((totals.calories / goalCal) * 100, 100)

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'].map(meal => ({
    meal,
    items: logs.filter(l => l.meal_type === meal),
    total: logs.filter(l => l.meal_type === meal).reduce((s, l) => s + l.calories, 0)
  })).filter(g => g.items.length > 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="min-h-screen">
      <Navbar name={profile.name} />

      <div className="max-w-[1100px] mx-auto px-4 pt-5 pb-24 sm:pb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold m-0">
              Good {greeting}, {profile.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/log-food">
            <button
              className="text-sm font-semibold text-white border-none rounded-xl px-6 py-3 cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
            >+ Log Food</button>
          </Link>
        </div>

        {/* Top cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Calories Ring */}
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">Today's Calories</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-[120px] h-[120px] shrink-0">
                <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={60} cy={60} r={50} fill="none" stroke="#1e293b" strokeWidth={10} />
                  <circle
                    cx={60} cy={60} r={50} fill="none"
                    stroke={calRemaining < 0 ? '#f87171' : '#22d3ee'} strokeWidth={10}
                    strokeDasharray={314} strokeDashoffset={314 - (calPct / 100) * 314}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-[22px] font-extrabold ${calRemaining < 0 ? 'text-red-400' : 'text-slate-100'}`}>
                    {totals.calories.toFixed(0)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">kcal eaten</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Goal</div>
                  <div className="text-xl font-bold">{goalCal} <span className="text-xs text-slate-500">kcal</span></div>
                </div>
                <div className={`px-3.5 py-2.5 rounded-[10px] border ${
                  calRemaining >= 0
                    ? 'bg-cyan-400/[0.08] border-cyan-400/20'
                    : 'bg-red-400/[0.08] border-red-400/20'
                }`}>
                  <div className="text-[11px] text-slate-500">{calRemaining >= 0 ? 'Remaining' : 'Over by'}</div>
                  <div className={`text-lg font-bold ${calRemaining >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {Math.abs(calRemaining).toFixed(0)} kcal
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Macro circles */}
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">Macronutrients</h3>
            <div className="grid grid-cols-4 gap-1">
              <CircleProgress value={totals.protein_g} target={targets.protein_g} label="Protein" unit="g" color="#818cf8" size={72} />
              <CircleProgress value={totals.carbs_g} target={targets.carbs_g} label="Carbs" unit="g" color="#f59e0b" size={72} />
              <CircleProgress value={totals.fat_g} target={targets.fat_g} label="Fat" unit="g" color="#34d399" size={72} />
              <CircleProgress value={totals.fiber_g} target={targets.fiber_g} label="Fiber" unit="g" color="#fb7185" size={72} />
            </div>
          </div>

          {/* BMI + Weight */}
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">Body Stats</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 text-center">
                <div className="text-2xl font-extrabold" style={{ color: bmiCat.color }}>{bmi.toFixed(1)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">BMI</div>
                <div className="text-xs font-semibold mt-1" style={{ color: bmiCat.color }}>{bmiCat.label}</div>
              </div>
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900 text-center">
                <div className="text-2xl font-extrabold text-cyan-400">{todayWeight || profile.weight_kg}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">kg today</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Weight</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 text-[13px] transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400"
                type="number" placeholder="Log today's weight (kg)" value={weightInput}
                onChange={e => setWeightInput(e.target.value)} step="0.1"
              />
              <button
                className="text-[13px] font-semibold text-white border-none rounded-xl px-4 cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
                onClick={logWeight} disabled={savingWeight || !weightInput}
              >
                {savingWeight ? '...' : 'Log'}
              </button>
            </div>
          </div>
        </div>

        {/* Sleep + Exercise row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Sleep card */}
          <Link href="/log-activity" className="no-underline">
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-indigo-400/40 transition-colors h-full">
              <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">😴 Sleep</h3>
              <div className="flex items-center gap-4">
                <div className="text-[48px] font-extrabold leading-none"
                  style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {sleepLog ? sleepLog.hours_slept : '7'}
                  <span className="text-2xl">h</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-300">
                    {sleepLog ? 'Logged tonight' : 'Default (not logged)'}
                  </div>
                  {sleepLog?.quality && (
                    <div className="text-xs text-slate-500 mt-1">
                      Quality: {['','😴','😐','😊','😄','🌟'][sleepLog.quality]}
                    </div>
                  )}
                  {!sleepLog && (
                    <div className="text-xs text-indigo-400 mt-1">+ Log your sleep →</div>
                  )}
                  {sleepLog && (parseFloat(sleepLog.hours_slept.toString()) < 6) && (
                    <div className="text-xs text-red-400 mt-1">⚠️ Below recommended</div>
                  )}
                  {sleepLog && (parseFloat(sleepLog.hours_slept.toString()) >= 8) && (
                    <div className="text-xs text-emerald-400 mt-1">✓ Great sleep!</div>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Exercise card */}
          <Link href="/log-activity" className="no-underline">
            <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-cyan-400/40 transition-colors h-full">
              <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🏋️ Exercise</h3>
              {exerciseLogs.length === 0 ? (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">🏃</div>
                  <p className="text-slate-600 text-sm m-0">No workout logged today</p>
                  <p className="text-cyan-400 text-xs mt-1">+ Log exercise →</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-3">
                    {exerciseLogs.slice(0, 3).map(ex => (
                      <div key={ex.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300 font-semibold">{ex.exercise_label || ex.exercise_type}</span>
                        <span className="text-orange-400 font-bold text-xs">{ex.duration_minutes}min · {ex.calories_burned} kcal</span>
                      </div>
                    ))}
                    {exerciseLogs.length > 3 && <p className="text-xs text-slate-600">+{exerciseLogs.length - 3} more</p>}
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-500">Total burned</span>
                    <span className="text-orange-400 font-bold">{exerciseLogs.reduce((s, e) => s + e.calories_burned, 0)} kcal</span>
                  </div>
                </>
              )}
            </div>
          </Link>
        </div>

        {/* Vitamins + Minerals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🧪 Vitamins</h3>
            <NutrientRow label="Vitamin A" value={totals.vitamin_a} target={targets.vitamin_a} unit="mcg" color="#f59e0b" />
            <NutrientRow label="Vitamin C" value={totals.vitamin_c} target={targets.vitamin_c} unit="mg" color="#22d3ee" />
            <NutrientRow label="Vitamin D" value={totals.vitamin_d} target={targets.vitamin_d} unit="mcg" color="#fbbf24" />
            <NutrientRow label="Vitamin E" value={totals.vitamin_e} target={targets.vitamin_e} unit="mg" color="#fb923c" />
          </div>

          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🪨 Minerals</h3>
            <NutrientRow label="Calcium" value={totals.calcium_mg} target={targets.calcium_mg} unit="mg" color="#34d399" />
            <NutrientRow label="Iron" value={totals.iron_mg} target={targets.iron_mg} unit="mg" color="#f87171" />
            <NutrientRow label="Potassium" value={totals.potassium_mg} target={targets.potassium_mg} unit="mg" color="#818cf8" />
            <NutrientRow label="Sodium" value={totals.sodium_mg} target={targets.sodium_mg} unit="mg" color="#fb7185" />
          </div>
        </div>

        {/* Fats breakdown */}
        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <h3 className="m-0 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🧈 Fats Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Fat', value: totals.fat_g, target: targets.fat_g, unit: 'g', color: '#34d399', emoji: '✅', desc: 'Essential fats' },
              { label: 'Saturated Fat', value: totals.saturated_fat_g, target: targets.saturated_fat_g, unit: 'g', color: '#f87171', emoji: '⚠️', desc: 'Limit intake' },
              { label: 'Sugar', value: totals.sugar_g, target: targets.sugar_g, unit: 'g', color: '#fbbf24', emoji: '🍬', desc: 'Watch sugar' },
            ].map(item => (
              <div key={item.label} className="p-3.5 rounded-xl bg-slate-900">
                <div className="flex items-center gap-1.5 mb-2">
                  <span>{item.emoji}</span>
                  <span className="text-[13px] font-semibold">{item.label}</span>
                </div>
                <div className="text-[22px] font-extrabold" style={{ color: item.color }}>
                  {item.value.toFixed(1)}
                  <span className="text-xs text-slate-500">/{item.target}{item.unit}</span>
                </div>
                <div className="nutrient-bar mt-2">
                  <div className="nutrient-bar-fill" style={{ width: `${Math.min((item.value / item.target) * 100, 100)}%`, background: item.color }} />
                </div>
                <div className="text-[11px] text-slate-600 mt-1.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's meals */}
        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-xs font-semibold text-slate-400 uppercase tracking-[0.05em]">🍽️ Today's Meals</h3>
            <Link href="/log-food">
              <button className="py-1.5 px-3.5 text-xs font-medium text-slate-100 border border-slate-800 rounded-xl bg-transparent cursor-pointer hover:bg-gray-800 hover:border-cyan-400 transition-all">
                + Add
              </button>
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <div className="text-[40px] mb-3">🥗</div>
              <p className="m-0 font-semibold">No foods logged today</p>
              <p className="m-0 mt-1.5 text-[13px]">Start tracking your nutrition</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {mealGroups.map(({ meal, items, total }) => (
                <div key={meal}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: mealColors[meal] }} />
                      <span className="text-[13px] font-bold capitalize" style={{ color: mealColors[meal] }}>{meal}</span>
                    </div>
                    <span className="text-xs text-slate-500">{total.toFixed(0)} kcal</span>
                  </div>
                  {items.map(log => (
                    <div key={log.id} className="flex justify-between items-center px-3.5 py-2.5 rounded-[10px] bg-slate-900 mb-1.5">
                      <div>
                        <div className="text-[13px] font-semibold">{log.food_name}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {log.quantity_g}g • P:{log.protein_g.toFixed(1)}g • C:{log.carbs_g.toFixed(1)}g • F:{log.fat_g.toFixed(1)}g
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-100">{log.calories.toFixed(0)} kcal</span>
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="bg-transparent border-none text-gray-700 cursor-pointer text-base p-1 transition-colors hover:text-red-400"
                        >×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
