'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FoodItem } from '@/lib/nutrition'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'

interface Profile { id: string; name: string; weight_kg: number; height_cm: number; age: number; gender: string; goal: string; activity_level: string }
interface AnalyzedFood { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; saturated_fat_g: number; sugar_g: number; unit_weight_g?: number; unit_label?: string }

const meals = ['breakfast', 'lunch', 'dinner', 'snack']
const mealEmojis: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const mealColors: Record<string, string> = { breakfast: '#f59e0b', lunch: '#22d3ee', dinner: '#818cf8', snack: '#34d399' }

const inputCls = 'bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5'

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToFoodItem(row: any): FoodItem {
  return {
    name: String(row.name_en ?? row.name ?? ''),
    name_bn: row.name_bn ?? undefined,
    category: row.category ?? undefined,
    calories: Number(row.calories ?? 0),
    protein_g: Number(row.protein_g ?? 0),
    carbs_g: Number(row.carbs_g ?? 0),
    fat_g: Number(row.fat_total_g ?? row.fat_g ?? 0),
    saturated_fat_g: Number(row.fat_saturated_g ?? row.saturated_fat_g ?? 0),
    fat_unsaturated_g: row.fat_unsaturated_g != null ? Number(row.fat_unsaturated_g) : undefined,
    fat_trans_g: row.fat_trans_g != null ? Number(row.fat_trans_g) : undefined,
    fiber_g: Number(row.fiber_g ?? 0),
    sugar_g: Number(row.sugar_g ?? 0),
    vitamin_a: Number(row.vitamin_a_mcg ?? row.vitamin_a ?? 0),
    vitamin_b1_mg: row.vitamin_b1_mg != null ? Number(row.vitamin_b1_mg) : undefined,
    vitamin_b2_mg: row.vitamin_b2_mg != null ? Number(row.vitamin_b2_mg) : undefined,
    vitamin_b3_mg: row.vitamin_b3_mg != null ? Number(row.vitamin_b3_mg) : undefined,
    vitamin_b6_mg: row.vitamin_b6_mg != null ? Number(row.vitamin_b6_mg) : undefined,
    vitamin_b12_mcg: row.vitamin_b12_mcg != null ? Number(row.vitamin_b12_mcg) : undefined,
    vitamin_c: Number(row.vitamin_c_mg ?? row.vitamin_c ?? 0),
    vitamin_d: Number(row.vitamin_d_mcg ?? row.vitamin_d ?? 0),
    vitamin_e: Number(row.vitamin_e_mg ?? row.vitamin_e ?? 0),
    vitamin_k_mcg: row.vitamin_k_mcg != null ? Number(row.vitamin_k_mcg) : undefined,
    calcium_mg: Number(row.calcium_mg ?? 0),
    iron_mg: Number(row.iron_mg ?? 0),
    magnesium_mg: row.magnesium_mg != null ? Number(row.magnesium_mg) : undefined,
    phosphorus_mg: row.phosphorus_mg != null ? Number(row.phosphorus_mg) : undefined,
    potassium_mg: Number(row.potassium_mg ?? 0),
    sodium_mg: Number(row.sodium_mg ?? 0),
    zinc_mg: row.zinc_mg != null ? Number(row.zinc_mg) : undefined,
    unit_weight_g: row.serving_size_g ? Number(row.serving_size_g) : row.unit_weight_g ? Number(row.unit_weight_g) : undefined,
    unit_label: row.unit_label ? String(row.unit_label) : undefined,
  }
}

function QuantityInput({
  food, quantityMode, setQuantityMode, quantity, setQuantity, count, setCount, effectiveGrams,
}: {
  food: { unit_weight_g?: number; unit_label?: string }
  quantityMode: 'weight' | 'count'
  setQuantityMode: (m: 'weight' | 'count') => void
  quantity: string; setQuantity: (v: string) => void
  count: string; setCount: (v: string) => void
  effectiveGrams: number
}) {
  const hasUnit = !!food.unit_weight_g
  return (
    <div className="mb-4">
      {hasUnit && (
        <div className="flex gap-2 mb-3">
          {(['weight', 'count'] as const).map(mode => (
            <button key={mode} type="button" onClick={() => setQuantityMode(mode)}
              className="flex-1 py-2 rounded-[10px] border-2 text-[13px] font-semibold cursor-pointer transition-all"
              style={{
                borderColor: quantityMode === mode ? '#22d3ee' : '#1e293b',
                background: quantityMode === mode ? 'rgba(34,211,238,0.08)' : '#0f172a',
                color: quantityMode === mode ? '#22d3ee' : '#64748b',
              }}>
              {mode === 'weight' ? '⚖️ By Weight' : '🔢 By Count'}
            </button>
          ))}
        </div>
      )}
      {quantityMode === 'weight' || !hasUnit ? (
        <>
          <label className={labelCls}>Quantity (grams)</label>
          <input className={inputCls} type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} step={1} />
        </>
      ) : (
        <>
          <label className={labelCls}>
            Number of {capitalize(food.unit_label ?? 'pieces')}s
            <span className="text-slate-600 font-normal normal-case tracking-normal ml-2">≈ {food.unit_weight_g}g each</span>
          </label>
          <input className={inputCls} type="number" value={count} onChange={e => setCount(e.target.value)} min={0.5} step={0.5} />
          <p className="mt-1.5 text-xs text-slate-500">
            {count || '0'} {food.unit_label}(s) = <span className="text-cyan-400 font-semibold">{effectiveGrams}g</span> total
          </p>
        </>
      )}
    </div>
  )
}

function NutritionCard({ food, r }: {
  food: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; saturated_fat_g: number }
  r: number
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: 'Calories', v: (food.calories * r).toFixed(0), u: 'kcal', c: '#22d3ee' },
          { l: 'Protein', v: (food.protein_g * r).toFixed(1), u: 'g', c: '#818cf8' },
          { l: 'Carbs', v: (food.carbs_g * r).toFixed(1), u: 'g', c: '#f59e0b' },
          { l: 'Fat', v: (food.fat_g * r).toFixed(1), u: 'g', c: '#34d399' },
        ].map(n => (
          <div key={n.l} className="text-center p-2.5 rounded-lg bg-[#0a0e1a]">
            <div className="text-lg font-extrabold" style={{ color: n.c }}>{n.v}</div>
            <div className="text-[10px] text-slate-500">{n.u}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{n.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-1">
        {[
          { l: 'Fiber', v: (food.fiber_g * r).toFixed(1), u: 'g' },
          { l: 'Sat. Fat', v: (food.saturated_fat_g * r).toFixed(1), u: 'g' },
        ].map(n => (
          <div key={n.l} className="text-center p-1.5 rounded-md bg-[#0a0e1a]">
            <div className="text-[13px] font-bold">{n.v}<span className="text-[9px] text-slate-600">{n.u}</span></div>
            <div className="text-[9px] text-slate-500">{n.l}</div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function LogFoodPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [meal, setMeal] = useState('breakfast')
  const [tab, setTab] = useState<'search' | 'custom' | 'photo'>('search')

  // Search state
  const [search, setSearch] = useState('')
  const [dbResults, setDbResults] = useState<FoodItem[]>([])
  const [dbSearching, setDbSearching] = useState(false)
  const [selected, setSelected] = useState<FoodItem | null>(null)

  // Quantity (shared)
  const [quantity, setQuantity] = useState('100')
  const [count, setCount] = useState('1')
  const [quantityMode, setQuantityMode] = useState<'weight' | 'count'>('weight')

  // Add food mode (when search has no results)
  const [addMode, setAddMode] = useState<'ai' | 'manual' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFood, setAiFood] = useState<FoodItem | null>(null)
  const [aiError, setAiError] = useState('')
  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sat_fat: '', unit_weight: '', unit_label: '' })

  // Custom tab
  const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' })

  // Log state
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Photo tab
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoMediaType, setPhotoMediaType] = useState('image/jpeg')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analyzedFoods, setAnalyzedFoods] = useState<AnalyzedFood[]>([])
  const [selectedAnalyzed, setSelectedAnalyzed] = useState<AnalyzedFood | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

  // ── Auth ──
  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!data) { router.push('/onboarding'); return }
    setProfile(data)
  }, [router])
  useEffect(() => { loadProfile() }, [loadProfile])

  // ── Supabase search (debounced) ──
  useEffect(() => {
    if (search.length < 2) { setDbResults([]); setDbSearching(false); return }
    clearTimeout(searchTimer.current)
    setDbSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.from('foods').select('*').or(`name_en.ilike.%${search}%,name_bn.ilike.%${search}%`).limit(10)
        setDbResults((data || []).map(mapToFoodItem))
      } catch { setDbResults([]) }
      setDbSearching(false)
    }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  const noResults = search.length >= 2 && !dbSearching && dbResults.length === 0 && !selected && !addMode

  // ── Effective grams ──
  function getEffectiveGrams(food: { unit_weight_g?: number } | null): number {
    if (!food?.unit_weight_g || quantityMode === 'weight') return parseFloat(quantity) || 100
    return Math.round((parseFloat(count) || 1) * food.unit_weight_g)
  }
  const effectiveGrams = getEffectiveGrams(selected)
  const photoEffectiveGrams = getEffectiveGrams(selectedAnalyzed)
  const aiEffectiveGrams = getEffectiveGrams(aiFood)

  // ── Helpers ──
  function selectFood(food: FoodItem) {
    setSelected(food); setSearch(food.name)
    setQuantity('100'); setCount('1'); setQuantityMode('weight'); setAddMode(null)
  }
  function selectAnalyzed(food: AnalyzedFood) {
    setSelectedAnalyzed(food); setQuantity('100'); setCount('1'); setQuantityMode('weight')
  }
  function resetSearch() {
    setSearch(''); setSelected(null); setDbResults([])
    setAddMode(null); setAiFood(null); setAiError('')
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sat_fat: '', unit_weight: '', unit_label: '' })
    setQuantity('100'); setCount('1'); setQuantityMode('weight')
  }

  // ── DB helpers ──
  async function saveFoodToDb(food: FoodItem) {
    await supabase.from('foods').insert({
      name_en: food.name,
      name_bn: food.name_bn ?? null,
      category: food.category ?? null,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_total_g: food.fat_g,
      fat_saturated_g: food.saturated_fat_g,
      fat_unsaturated_g: food.fat_unsaturated_g ?? null,
      fat_trans_g: food.fat_trans_g ?? null,
      fiber_g: food.fiber_g,
      sugar_g: food.sugar_g,
      vitamin_a_mcg: food.vitamin_a,
      vitamin_b1_mg: food.vitamin_b1_mg ?? null,
      vitamin_b2_mg: food.vitamin_b2_mg ?? null,
      vitamin_b3_mg: food.vitamin_b3_mg ?? null,
      vitamin_b6_mg: food.vitamin_b6_mg ?? null,
      vitamin_b12_mcg: food.vitamin_b12_mcg ?? null,
      vitamin_c_mg: food.vitamin_c,
      vitamin_d_mcg: food.vitamin_d,
      vitamin_e_mg: food.vitamin_e,
      vitamin_k_mcg: food.vitamin_k_mcg ?? null,
      calcium_mg: food.calcium_mg,
      iron_mg: food.iron_mg,
      magnesium_mg: food.magnesium_mg ?? null,
      phosphorus_mg: food.phosphorus_mg ?? null,
      potassium_mg: food.potassium_mg,
      sodium_mg: food.sodium_mg,
      zinc_mg: food.zinc_mg ?? null,
      serving_size_g: food.unit_weight_g ?? null,
    })
  }

  async function logFoodEntry(food: FoodItem, grams: number) {
    const { data: { user } } = await supabase.auth.getUser()
    const q = grams / 100
    await supabase.from('food_logs').insert({
      user_id: user!.id, date: new Date().toISOString().split('T')[0], meal_type: meal,
      food_name: food.name, quantity_g: grams,
      calories: +(food.calories * q).toFixed(2), protein_g: +(food.protein_g * q).toFixed(2),
      carbs_g: +(food.carbs_g * q).toFixed(2), fat_g: +(food.fat_g * q).toFixed(2),
      saturated_fat_g: +(food.saturated_fat_g * q).toFixed(2), fiber_g: +(food.fiber_g * q).toFixed(2),
      sugar_g: +(food.sugar_g * q).toFixed(2), vitamin_a: +(food.vitamin_a * q).toFixed(2),
      vitamin_c: +(food.vitamin_c * q).toFixed(2), vitamin_d: +(food.vitamin_d * q).toFixed(2),
      vitamin_e: +(food.vitamin_e * q).toFixed(2), calcium_mg: +(food.calcium_mg * q).toFixed(2),
      iron_mg: +(food.iron_mg * q).toFixed(2), potassium_mg: +(food.potassium_mg * q).toFixed(2),
      sodium_mg: +(food.sodium_mg * q).toFixed(2),
    })
  }

  // ── Log actions ──
  async function logFood() {
    if (!selected || !profile) return
    setLoading(true)
    await logFoodEntry(selected, effectiveGrams)
    setSuccess(true); resetSearch()
    setTimeout(() => setSuccess(false), 3000); setLoading(false)
  }

  async function fetchWithAI() {
    setAddMode('ai'); setAiLoading(true); setAiError(''); setAiFood(null)
    try {
      const res = await fetch('/api/fetch-food-nutrition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: search }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const food = mapToFoodItem(data)
      setAiFood(food)
      if (food.unit_weight_g) setQuantityMode('count')
      // Save immediately so future searches find it in DB, not AI
      saveFoodToDb(food).catch(() => {})
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to fetch nutrition')
    }
    setAiLoading(false)
  }

  async function saveAiFoodAndLog() {
    if (!aiFood || !profile) return
    setLoading(true)
    // Already saved to DB during fetchWithAI — just log
    await logFoodEntry(aiFood, aiEffectiveGrams)
    setSuccess(true); resetSearch()
    setTimeout(() => setSuccess(false), 3000); setLoading(false)
  }

  async function saveManualFoodAndLog() {
    if (!newFood.name || !newFood.calories || !profile) return
    setLoading(true)
    const food: FoodItem = {
      name: newFood.name, calories: parseFloat(newFood.calories) || 0,
      protein_g: parseFloat(newFood.protein) || 0, carbs_g: parseFloat(newFood.carbs) || 0,
      fat_g: parseFloat(newFood.fat) || 0, saturated_fat_g: parseFloat(newFood.sat_fat) || 0,
      fiber_g: parseFloat(newFood.fiber) || 0, sugar_g: parseFloat(newFood.sugar) || 0,
      vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0,
      calcium_mg: 0, iron_mg: 0, potassium_mg: 0, sodium_mg: 0,
      unit_weight_g: newFood.unit_weight ? parseFloat(newFood.unit_weight) : undefined,
      unit_label: newFood.unit_label || undefined,
    }
    await saveFoodToDb(food)
    await logFoodEntry(food, parseFloat(quantity) || 100)
    setSuccess(true); resetSearch()
    setTimeout(() => setSuccess(false), 3000); setLoading(false)
  }

  async function logCustomFood() {
    if (!customFood.name || !customFood.calories || !profile) return
    setLoading(true)
    const grams = parseFloat(quantity) || 100
    const food: FoodItem = {
      name: customFood.name, calories: parseFloat(customFood.calories) || 0,
      protein_g: parseFloat(customFood.protein) || 0, carbs_g: parseFloat(customFood.carbs) || 0,
      fat_g: parseFloat(customFood.fat) || 0, saturated_fat_g: 0,
      fiber_g: parseFloat(customFood.fiber) || 0, sugar_g: 0,
      vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0,
      calcium_mg: 0, iron_mg: 0, potassium_mg: 0, sodium_mg: 0,
    }
    await saveFoodToDb(food)
    await logFoodEntry(food, grams)
    setSuccess(true)
    setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' })
    setTimeout(() => setSuccess(false), 3000); setLoading(false)
  }

  // ── Photo tab ──
  function resetPhotoState() {
    setPhotoPreview(null); setPhotoBase64(null); setAnalyzedFoods([]); setSelectedAnalyzed(null)
    setAnalyzeError(''); setQuantity('100'); setCount('1'); setQuantityMode('weight')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoMediaType(file.type || 'image/jpeg')
    setAnalyzedFoods([]); setSelectedAnalyzed(null); setAnalyzeError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setPhotoPreview(url); setPhotoBase64(url.split(',')[1])
    }
    reader.readAsDataURL(file)
  }
  async function analyzePhoto() {
    if (!photoBase64) return
    setAnalyzing(true); setAnalyzeError(''); setAnalyzedFoods([]); setSelectedAnalyzed(null)
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photoBase64, mediaType: photoMediaType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      if (!data.foods?.length) { setAnalyzeError('No food detected. Try a clearer photo.') }
      else { setAnalyzedFoods(data.foods); selectAnalyzed(data.foods[0]) }
    } catch (err) { setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed') }
    setAnalyzing(false)
  }
  async function logPhotoFood() {
    if (!selectedAnalyzed || !profile) return
    setLoading(true)
    const food: FoodItem = { ...selectedAnalyzed, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0, sodium_mg: 0 }
    await saveFoodToDb(food)
    await logFoodEntry(food, photoEffectiveGrams)
    setSuccess(true); resetPhotoState()
    setTimeout(() => setSuccess(false), 3000); setLoading(false)
  }

  // ── Render ──
  return (
    <div className="min-h-screen">
      <Navbar name={profile?.name} />
      <div className="max-w-[700px] mx-auto px-5 pt-6 pb-24 sm:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold m-0 mb-1">Log Food 🍽️</h1>
          <p className="text-slate-500 text-sm m-0">Search the database, enter custom food, or snap a photo</p>
        </div>

        {success && (
          <div className="animate-in mb-4 bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 font-semibold flex items-center gap-2">
            ✅ Food logged successfully!
          </div>
        )}

        {/* Meal selector */}
        <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <label className={labelCls}>Meal</label>
          <div className="flex gap-2">
            {meals.map(m => (
              <button key={m} onClick={() => setMeal(m)}
                className="flex-1 py-2.5 rounded-[10px] border-2 cursor-pointer flex flex-col items-center gap-0.5 transition-all"
                style={{ borderColor: meal === m ? mealColors[m] : '#1e293b', background: meal === m ? `${mealColors[m]}18` : '#0f172a' }}>
                <span className="text-lg">{mealEmojis[m]}</span>
                <span className="text-[11px] font-semibold capitalize" style={{ color: meal === m ? mealColors[m] : '#64748b' }}>{m}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 border border-slate-800 rounded-xl p-1 mb-4">
          {(['search', 'custom', 'photo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg border-none text-[13px] font-semibold cursor-pointer transition-all"
              style={{ background: tab === t ? 'linear-gradient(135deg, #22d3ee, #818cf8)' : 'transparent', color: tab === t ? 'white' : '#64748b' }}>
              {t === 'search' ? '🔍 Database' : t === 'custom' ? '✏️ Custom' : '📷 Photo'}
            </button>
          ))}
        </div>

        {/* ──────────────── SEARCH TAB ──────────────── */}
        {tab === 'search' && (
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <div className="mb-4">
              <label className={labelCls}>Search Food</label>
              <input
                className={inputCls}
                placeholder="e.g. Egg, Banana, Chicken Biryani..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); setAddMode(null); setAiFood(null) }}
              />
              {dbSearching && (
                <p className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                  Searching database...
                </p>
              )}
            </div>

            {/* Search results */}
            {dbResults.length > 0 && !selected && !addMode && (
              <div className="mb-4 border border-slate-800 rounded-[10px] overflow-hidden">
                {dbResults.map((food, i) => (
                  <div key={food.name} onClick={() => selectFood(food)}
                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800 flex justify-between items-center ${i < dbResults.length - 1 ? 'border-b border-slate-900' : ''}`}>
                    <div>
                      <span className="font-semibold text-sm">{food.name}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        P:{food.protein_g}g · C:{food.carbs_g}g · F:{food.fat_g}g per 100g
                        {food.unit_weight_g && <span className="text-cyan-400/60 ml-1.5">· {food.unit_weight_g}g/{food.unit_label}</span>}
                      </div>
                    </div>
                    <span className="font-bold text-cyan-400 text-sm">{food.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}

            {/* Not found panel */}
            {noResults && (
              <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
                <p className="text-slate-400 text-sm mb-3">
                  No results for <span className="text-slate-200 font-semibold">"{search}"</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={fetchWithAI}
                    className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)', color: 'white' }}>
                    🤖 Fetch with AI
                  </button>
                  <button type="button"
                    onClick={() => { setAddMode('manual'); setNewFood(f => ({ ...f, name: search })) }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-slate-700 bg-transparent text-slate-300 text-sm font-semibold cursor-pointer transition-all hover:border-slate-500">
                    ✏️ Add manually
                  </button>
                </div>
              </div>
            )}

            {/* AI fetch UI */}
            {addMode === 'ai' && (
              <div className="animate-in">
                {aiLoading && (
                  <div className="flex items-center justify-center gap-3 py-10 text-slate-400 text-sm">
                    <span className="w-5 h-5 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
                    Asking AI for nutrition data...
                  </div>
                )}
                {aiError && (
                  <div className="mb-4 bg-red-400/10 border border-red-400/30 rounded-xl px-4 py-3 text-red-400 text-[13px]">
                    {aiError}
                    <button type="button" onClick={fetchWithAI} className="ml-3 underline cursor-pointer bg-transparent border-none text-red-400 text-[13px]">Retry</button>
                  </div>
                )}
                {aiFood && (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900 border border-indigo-400/20 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-base">{aiFood.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">AI-estimated per 100g</span>
                            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-full px-1.5 py-0.5">AI</span>
                          </div>
                        </div>
                        <button onClick={() => setAddMode(null)} className="bg-transparent border-none text-slate-600 cursor-pointer text-xl hover:text-slate-400">×</button>
                      </div>
                      <NutritionCard food={aiFood} r={aiEffectiveGrams / 100} />
                    </div>
                    <QuantityInput food={aiFood} quantityMode={quantityMode} setQuantityMode={setQuantityMode}
                      quantity={quantity} setQuantity={setQuantity} count={count} setCount={setCount} effectiveGrams={aiEffectiveGrams} />
                    <button type="button" onClick={saveAiFoodAndLog} disabled={loading}
                      className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
                      style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}>
                      {loading ? 'Logging...' : `Log ${aiEffectiveGrams}g of ${aiFood.name}`}
                    </button>
                    <p className="text-center text-xs text-emerald-600 mt-2">✓ Saved to database — won't call AI again for this food</p>
                  </>
                )}
              </div>
            )}

            {/* Manual add UI */}
            {addMode === 'manual' && (
              <div className="animate-in">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">Add Food to Database</h3>
                  <button onClick={() => setAddMode(null)} className="bg-transparent border-none text-slate-600 cursor-pointer text-xl hover:text-slate-400">×</button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Food Name *</label>
                    <input className={inputCls} placeholder="e.g. Chicken Biryani" value={newFood.name} onChange={e => setNewFood(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Calories (per 100g) *</label>
                    <input className={inputCls} type="number" placeholder="200" value={newFood.calories} onChange={e => setNewFood(f => ({ ...f, calories: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Protein (g/100g)</label>
                    <input className={inputCls} type="number" placeholder="10" value={newFood.protein} onChange={e => setNewFood(f => ({ ...f, protein: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Carbs (g/100g)</label>
                    <input className={inputCls} type="number" placeholder="25" value={newFood.carbs} onChange={e => setNewFood(f => ({ ...f, carbs: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Fat (g/100g)</label>
                    <input className={inputCls} type="number" placeholder="8" value={newFood.fat} onChange={e => setNewFood(f => ({ ...f, fat: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Fiber (g/100g)</label>
                    <input className={inputCls} type="number" placeholder="2" value={newFood.fiber} onChange={e => setNewFood(f => ({ ...f, fiber: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Sugar (g/100g)</label>
                    <input className={inputCls} type="number" placeholder="3" value={newFood.sugar} onChange={e => setNewFood(f => ({ ...f, sugar: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Unit weight (g) <span className="text-slate-600 normal-case">optional</span></label>
                    <input className={inputCls} type="number" placeholder="60" value={newFood.unit_weight} onChange={e => setNewFood(f => ({ ...f, unit_weight: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Unit label <span className="text-slate-600 normal-case">optional</span></label>
                    <input className={inputCls} placeholder="egg, slice, piece..." value={newFood.unit_label} onChange={e => setNewFood(f => ({ ...f, unit_label: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Quantity to Log (grams)</label>
                    <input className={inputCls} type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} />
                  </div>
                </div>
                <button type="button" onClick={saveManualFoodAndLog}
                  disabled={loading || !newFood.name || !newFood.calories}
                  className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}>
                  {loading ? 'Saving...' : '💾 Save to Database & Log'}
                </button>
                <p className="text-center text-xs text-slate-600 mt-2">This food will be saved for future searches</p>
              </div>
            )}

            {/* Selected food */}
            {selected && (
              <div className="animate-in">
                <div className="p-4 rounded-xl bg-slate-900 border border-cyan-400/20 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-base">{selected.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Per 100g · {effectiveGrams}g selected
                        {quantityMode === 'count' && selected.unit_weight_g && (
                          <span className="text-cyan-400 ml-1">({count} {selected.unit_label})</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setSelected(null); setSearch('') }}
                      className="bg-transparent border-none text-slate-600 cursor-pointer text-xl hover:text-slate-400">×</button>
                  </div>
                  <NutritionCard food={selected} r={effectiveGrams / 100} />
                </div>
                <QuantityInput food={selected} quantityMode={quantityMode} setQuantityMode={setQuantityMode}
                  quantity={quantity} setQuantity={setQuantity} count={count} setCount={setCount} effectiveGrams={effectiveGrams} />
                <button className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
                  onClick={logFood} disabled={loading}>
                  {loading ? 'Logging...' : (
                    quantityMode === 'count' && selected.unit_weight_g
                      ? `Log ${count} ${selected.unit_label}(s) (${effectiveGrams}g)`
                      : `Log ${effectiveGrams}g of ${selected.name}`
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── CUSTOM TAB ──────────────── */}
        {tab === 'custom' && (
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className={labelCls}>Food Name *</label>
                <input className={inputCls} placeholder="e.g. Homemade Dal" value={customFood.name} onChange={e => setCustomFood(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Calories (per 100g) *</label>
                <input className={inputCls} type="number" placeholder="250" value={customFood.calories} onChange={e => setCustomFood(f => ({ ...f, calories: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Protein (g/100g)</label>
                <input className={inputCls} type="number" placeholder="20" value={customFood.protein} onChange={e => setCustomFood(f => ({ ...f, protein: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Carbs (g/100g)</label>
                <input className={inputCls} type="number" placeholder="30" value={customFood.carbs} onChange={e => setCustomFood(f => ({ ...f, carbs: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Fat (g/100g)</label>
                <input className={inputCls} type="number" placeholder="10" value={customFood.fat} onChange={e => setCustomFood(f => ({ ...f, fat: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Fiber (g/100g)</label>
                <input className={inputCls} type="number" placeholder="3" value={customFood.fiber} onChange={e => setCustomFood(f => ({ ...f, fiber: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Quantity (grams)</label>
                <input className={inputCls} type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} />
              </div>
            </div>

            <button
              className="w-full mt-4 py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}
              onClick={logCustomFood} disabled={loading || !customFood.name || !customFood.calories}>
              {loading ? 'Saving...' : '💾 Save to Database & Log'}
            </button>
            <p className="text-center text-xs text-slate-600 mt-2">Saved to food database for future searches</p>
          </div>
        )}

        {/* ──────────────── PHOTO TAB ──────────────── */}
        {tab === 'photo' && (
          <div className="bg-gray-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-sm mb-4 m-0">
              Take a photo or upload an image. Claude AI will identify the food and estimate nutrition per 100g.
            </p>
            <div className="mb-4">
              <label className={labelCls}>Food Photo</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                onChange={handleFileChange} className="hidden" id="photo-input" />
              <label htmlFor="photo-input"
                className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-slate-700 cursor-pointer transition-colors hover:border-cyan-400/50"
                style={{ background: '#0f172a' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Food preview" className="max-h-48 rounded-lg object-contain" />
                ) : (
                  <>
                    <span className="text-4xl">📷</span>
                    <span className="text-slate-400 text-sm font-semibold">Tap to take photo or upload</span>
                    <span className="text-slate-600 text-xs">JPG, PNG, WEBP supported</span>
                  </>
                )}
              </label>
              {photoPreview && (
                <button type="button" onClick={resetPhotoState}
                  className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none">
                  × Remove photo
                </button>
              )}
            </div>
            {photoBase64 && analyzedFoods.length === 0 && (
              <button type="button" onClick={analyzePhoto} disabled={analyzing}
                className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70 mb-4"
                style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)' }}>
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing with AI...
                  </span>
                ) : '🔍 Identify Food with AI'}
              </button>
            )}
            {analyzeError && (
              <div className="mb-4 bg-red-400/10 border border-red-400/30 rounded-[10px] px-3.5 py-2.5 text-red-400 text-[13px]">{analyzeError}</div>
            )}
            {analyzedFoods.length > 0 && (
              <div className="animate-in">
                {analyzedFoods.length > 1 && (
                  <div className="mb-3">
                    <label className={labelCls}>Detected Foods — Select One</label>
                    <div className="flex flex-col gap-2">
                      {analyzedFoods.map((food, i) => (
                        <button key={i} type="button" onClick={() => selectAnalyzed(food)}
                          className="px-4 py-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all text-left"
                          style={{ borderColor: selectedAnalyzed === food ? '#22d3ee' : '#1e293b', background: selectedAnalyzed === food ? 'rgba(34,211,238,0.08)' : '#0f172a' }}>
                          <span className={`font-semibold text-sm ${selectedAnalyzed === food ? 'text-cyan-400' : 'text-slate-100'}`}>{food.name}</span>
                          <span className="text-xs text-slate-400">{food.calories} kcal/100g</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAnalyzed && (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900 border border-cyan-400/20 mb-4">
                      <div className="mb-3">
                        <div className="font-bold text-base">{selectedAnalyzed.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          AI-estimated · {photoEffectiveGrams}g selected
                          {quantityMode === 'count' && selectedAnalyzed.unit_weight_g && (
                            <span className="text-cyan-400 ml-1">({count} {selectedAnalyzed.unit_label})</span>
                          )}
                        </div>
                      </div>
                      <NutritionCard food={selectedAnalyzed} r={photoEffectiveGrams / 100} />
                    </div>
                    <QuantityInput food={selectedAnalyzed} quantityMode={quantityMode} setQuantityMode={setQuantityMode}
                      quantity={quantity} setQuantity={setQuantity} count={count} setCount={setCount} effectiveGrams={photoEffectiveGrams} />
                    <button type="button" onClick={logPhotoFood} disabled={loading}
                      className="w-full py-3 font-semibold text-white border-none rounded-xl cursor-pointer transition-all hover:opacity-90 disabled:opacity-70"
                      style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)' }}>
                      {loading ? 'Logging...' : (
                        quantityMode === 'count' && selectedAnalyzed.unit_weight_g
                          ? `Log ${count} ${selectedAnalyzed.unit_label}(s) (${photoEffectiveGrams}g)`
                          : `Log ${photoEffectiveGrams}g of ${selectedAnalyzed.name}`
                      )}
                    </button>
                    <button type="button" onClick={resetPhotoState}
                      className="w-full mt-2 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-none">
                      Try a different photo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
