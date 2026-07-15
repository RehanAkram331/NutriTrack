'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import { confirmDelete } from '@/lib/confirm'
import { format, parseISO } from 'date-fns'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  weight_kg: number | null
  category: string
  description: string | null
  date: string
}
interface Profile { id: string; name: string }
interface EntryRow {
  key: number
  category: string
  item: string
  weight_kg: string
  amount: string
}

const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other']
const EXPENSE_CATS = [
  'Food', 'Vegetable', 'Grocery', 'Transport', 'Bike',
  'Housing', 'Healthcare', 'Entertainment', 'Education',
  'Shopping', 'Utilities', 'Other',
]
const WEIGHT_CATS = new Set(['Vegetable', 'Grocery', 'Food'])

const catColors: Record<string, string> = {
  Salary: '#22d3ee', Freelance: '#34d399', Business: '#818cf8', Investment: '#f59e0b', Gift: '#f472b6',
  Food: '#f87171', Vegetable: '#4ade80', Grocery: '#fb923c', Transport: '#60a5fa',
  Bike: '#a78bfa', Housing: '#818cf8', Healthcare: '#2dd4bf', Entertainment: '#e879f9',
  Education: '#60a5fa', Shopping: '#fbbf24', Utilities: '#94a3b8', Other: '#64748b',
}

let _key = 0
const newRow = (cat: string): EntryRow => ({ key: ++_key, category: cat, item: '', weight_kg: '', amount: '' })

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MoneyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'overview' | 'income' | 'expense'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [incomeDate, setIncomeDate] = useState(today)
  const [expenseDate, setExpenseDate] = useState(today)
  const [incomeRows, setIncomeRows] = useState<EntryRow[]>([newRow('Salary')])
  const [expenseRows, setExpenseRows] = useState<EntryRow[]>([newRow('Food')])
  const router = useRouter()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles').select('id,name').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)
    const { data } = await supabase
      .from('transactions').select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    setTransactions(data ?? [])
  }, [router])

  useEffect(() => { load() }, [load])

  function patchRow(rows: EntryRow[], setRows: (r: EntryRow[]) => void, key: number, patch: Partial<EntryRow>) {
    setRows(rows.map(r => r.key === key ? { ...r, ...patch } : r))
  }
  function removeRow(rows: EntryRow[], setRows: (r: EntryRow[]) => void, key: number) {
    if (rows.length > 1) setRows(rows.filter(r => r.key !== key))
  }

  async function saveItems(rows: EntryRow[]) {
    const toSave = rows.filter(r => r.item.trim())
    if (!toSave.length) return
    await supabase.from('expense_items').upsert(
      toSave.map(r => ({ name: r.item.trim(), category: r.category })),
      { onConflict: 'name,category', ignoreDuplicates: true }
    )
  }

  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const valid = incomeRows.filter(r => r.amount)
    if (!valid.length) return
    setLoading(true)
    await supabase.from('transactions').insert(valid.map(r => ({
      user_id: profile.id, type: 'income', date: incomeDate,
      amount: parseFloat(r.amount), category: r.category,
      description: r.item || null, weight_kg: null,
    })))
    setIncomeRows([newRow('Salary')])
    await load(); setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const valid = expenseRows.filter(r => r.amount)
    if (!valid.length) return
    setLoading(true)
    await saveItems(valid)
    await supabase.from('transactions').insert(valid.map(r => ({
      user_id: profile.id, type: 'expense', date: expenseDate,
      amount: parseFloat(r.amount), category: r.category,
      weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : null,
      description: r.item || null,
    })))
    setExpenseRows([newRow('Food')])
    await load(); setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function deleteTransaction(id: string) {
    const ok = await confirmDelete('This transaction will be permanently removed.')
    if (!ok) return
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(t => t.filter(x => x.id !== id))
  }

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense
  const incomeBatch  = incomeRows.reduce((s, r)  => s + (parseFloat(r.amount) || 0), 0)
  const expenseBatch = expenseRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: '#0a0e1a' }}>
      <Navbar name={profile?.name} />
      <div className="max-w-[700px] mx-auto px-4 pt-6 pb-28 sm:pb-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Money</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your income and expenses</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Income',  value: totalIncome,  color: 'text-emerald-400', bg: 'rgba(34,211,238,0.06)',  border: 'border-slate-800' },
            { label: 'Expense', value: totalExpense, color: 'text-red-400',     bg: 'rgba(248,113,113,0.06)', border: 'border-slate-800' },
            { label: 'Balance', value: Math.abs(balance), color: balance >= 0 ? 'text-emerald-400' : 'text-red-400',
              bg: balance >= 0 ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
              border: balance >= 0 ? 'border-emerald-400/20' : 'border-red-400/20',
              prefix: balance < 0 ? '-' : '' },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl p-4 border ${c.border}`} style={{ background: c.bg }}>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.label}</div>
              <div className={`text-lg font-bold ${c.color}`}>{c.prefix ?? ''}৳{fmt(c.value)}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 rounded-xl p-1 mb-6 gap-1">
          {([
            { key: 'overview', label: 'Overview'  },
            { key: 'income',   label: '+ Income'  },
            { key: 'expense',  label: '+ Expense' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all"
              style={{
                background: tab === t.key
                  ? t.key === 'income'  ? 'linear-gradient(135deg,#22d3ee,#34d399)'
                  : t.key === 'expense' ? 'linear-gradient(135deg,#f87171,#f59e0b)'
                  : 'linear-gradient(135deg,#22d3ee,#818cf8)' : 'transparent',
                color: tab === t.key ? 'white' : '#64748b',
              }}>{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          transactions.length === 0
            ? <div className="text-center py-16"><div className="text-5xl mb-3">💰</div>
                <div className="font-semibold text-slate-500">No transactions yet</div>
                <div className="text-sm mt-1 text-slate-600">Add your first income or expense</div></div>
            : <div className="space-y-2">{transactions.map(tx =>
                <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}</div>
        )}

        {/* Income batch */}
        {tab === 'income' && (
          <div className="space-y-5">
            <form onSubmit={saveIncome} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-emerald-400 uppercase tracking-wider">Add Income</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Date</span>
                  <input type="date" max={today} value={incomeDate} onChange={e => setIncomeDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-400" />
                </div>
              </div>

              <div className="space-y-3">
                {incomeRows.map((row, i) => (
                  <IncomeRow key={row.key} row={row} index={i}
                    canRemove={incomeRows.length > 1}
                    onUpdate={p => patchRow(incomeRows, setIncomeRows, row.key, p)}
                    onRemove={() => removeRow(incomeRows, setIncomeRows, row.key)} />
                ))}
              </div>

              <button type="button" onClick={() => setIncomeRows(r => [...r, newRow('Salary')])}
                className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[13px] font-semibold cursor-pointer hover:border-emerald-400/50 hover:text-emerald-400 transition-all bg-transparent">
                + Add Another
              </button>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  {incomeRows.filter(r => r.amount).length} item(s) ·{' '}
                  <span className="text-emerald-400 font-bold">৳{fmt(incomeBatch)}</span>
                </div>
                <button type="submit" disabled={loading || !incomeRows.some(r => r.amount)}
                  className="px-6 py-2.5 rounded-xl font-bold text-[13px] text-white border-none cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#22d3ee,#34d399)' }}>
                  {loading ? 'Saving…' : saved ? '✓ Saved!' : 'Save All'}
                </button>
              </div>
            </form>

            {transactions.filter(t => t.type === 'income').length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Income History</div>
                <div className="space-y-2">
                  {transactions.filter(t => t.type === 'income').map(tx =>
                    <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expense batch */}
        {tab === 'expense' && (
          <div className="space-y-5">
            <form onSubmit={saveExpense} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-red-400 uppercase tracking-wider">Add Expense</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Date</span>
                  <input type="date" max={today} value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-400" />
                </div>
              </div>

              <div className="space-y-3">
                {expenseRows.map((row, i) => (
                  <ExpenseRow key={row.key} row={row} index={i}
                    canRemove={expenseRows.length > 1}
                    onUpdate={p => patchRow(expenseRows, setExpenseRows, row.key, p)}
                    onRemove={() => removeRow(expenseRows, setExpenseRows, row.key)} />
                ))}
              </div>

              <button type="button" onClick={() => setExpenseRows(r => [...r, newRow('Food')])}
                className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[13px] font-semibold cursor-pointer hover:border-red-400/50 hover:text-red-400 transition-all bg-transparent">
                + Add Another
              </button>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  {expenseRows.filter(r => r.amount).length} item(s) ·{' '}
                  <span className="text-red-400 font-bold">৳{fmt(expenseBatch)}</span>
                </div>
                <button type="submit" disabled={loading || !expenseRows.some(r => r.amount)}
                  className="px-6 py-2.5 rounded-xl font-bold text-[13px] text-white border-none cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f87171,#f59e0b)' }}>
                  {loading ? 'Saving…' : saved ? '✓ Saved!' : 'Save All'}
                </button>
              </div>
            </form>

            {transactions.filter(t => t.type === 'expense').length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Expense History</div>
                <div className="space-y-2">
                  {transactions.filter(t => t.type === 'expense').map(tx =>
                    <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Income entry row — single horizontal line ──
function IncomeRow({ row, onUpdate, onRemove, canRemove }: {
  row: EntryRow; index: number; canRemove: boolean
  onUpdate: (p: Partial<EntryRow>) => void; onRemove: () => void
}) {
  const color = catColors[row.category] ?? '#64748b'
  const sel = 'bg-slate-900 border border-slate-800 rounded-[8px] px-2 py-2.5 text-slate-100 text-sm outline-none focus:border-cyan-400 cursor-pointer'
  return (
    <div className="flex items-center gap-2">
      {/* Category */}
      <select value={row.category} onChange={e => onUpdate({ category: e.target.value })}
        className={sel} style={{ color, minWidth: 110 }}>
        {INCOME_CATS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Description */}
      <input type="text" placeholder="Description"
        className="bg-slate-900 border border-slate-800 rounded-[8px] px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600 flex-1 min-w-0"
        value={row.item} onChange={e => onUpdate({ item: e.target.value })} />

      {/* Amount */}
      <div className="relative flex-shrink-0" style={{ width: 110 }}>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color }}>৳</span>
        <input type="number" min="0" step="0.01" placeholder="0.00" required
          className="bg-slate-900 border border-slate-800 rounded-[8px] pl-6 pr-2 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
          value={row.amount} onChange={e => onUpdate({ amount: e.target.value })} />
      </div>

      {canRemove && (
        <button type="button" onClick={onRemove}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-600 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
      )}
    </div>
  )
}

// ── Expense entry row — single horizontal line with item search ──
function ExpenseRow({ row, onUpdate, onRemove, canRemove }: {
  row: EntryRow; index: number; canRemove: boolean
  onUpdate: (p: Partial<EntryRow>) => void; onRemove: () => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const color = catColors[row.category] ?? '#64748b'
  const showWeight = WEIGHT_CATS.has(row.category)
  const sel = 'bg-slate-900 border border-slate-800 rounded-[8px] px-2 py-2.5 text-sm outline-none focus:border-cyan-400 cursor-pointer'

  async function search(q: string) {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return }
    const { data } = await supabase
      .from('expense_items').select('name')
      .eq('category', row.category).ilike('name', `%${q.trim()}%`).limit(6)
    const results = data?.map(d => d.name) ?? []
    setSuggestions(results)
    setOpen(results.length > 0)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Category select */}
      <select value={row.category}
        onChange={e => onUpdate({ category: e.target.value, weight_kg: WEIGHT_CATS.has(e.target.value) ? row.weight_kg : '' })}
        className={sel} style={{ color, minWidth: 108 }}>
        {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Item with autocomplete */}
      <div className="relative flex-1 min-w-0">
        <input type="text" placeholder="Item name…" autoComplete="off"
          value={row.item}
          onChange={e => { onUpdate({ item: e.target.value }); search(e.target.value) }}
          onFocus={() => { if (row.item) search(row.item) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="bg-slate-900 border border-slate-800 rounded-[8px] px-3 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {suggestions.map(s => (
              <button key={s} type="button" onMouseDown={() => { onUpdate({ item: s }); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-slate-800 border-none bg-transparent cursor-pointer transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weight — only for Food/Vegetable/Grocery */}
      {showWeight && (
        <div className="relative flex-shrink-0" style={{ width: 80 }}>
          <input type="number" min="0" step="0.001" placeholder="kg"
            className="bg-slate-900 border border-slate-800 rounded-[8px] px-2 pr-7 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
            value={row.weight_kg} onChange={e => onUpdate({ weight_kg: e.target.value })} />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">kg</span>
        </div>
      )}

      {/* Amount */}
      <div className="relative flex-shrink-0" style={{ width: 100 }}>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color }}>৳</span>
        <input type="number" min="0" step="0.01" placeholder="0.00" required
          className="bg-slate-900 border border-slate-800 rounded-[8px] pl-6 pr-2 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
          value={row.amount} onChange={e => onUpdate({ amount: e.target.value })} />
      </div>

      {canRemove && (
        <button type="button" onClick={onRemove}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-600 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
      )}
    </div>
  )
}

// ── Transaction history row ──
function TransactionRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const isIncome = tx.type === 'income'
  const color = catColors[tx.category] ?? '#64748b'
  return (
    <div className="group flex items-center gap-3 bg-gray-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ background: color + '22', border: `1px solid ${color}33`, color }}>
        {isIncome ? '↑' : '↓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-200 truncate">{tx.description || tx.category}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: color + '22', color }}>{tx.category}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-600">{format(parseISO(tx.date), 'dd MMM yyyy')}</span>
          {tx.weight_kg != null && <span className="text-[11px] text-slate-500 font-semibold">{tx.weight_kg} kg</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-[14px] font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}৳{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        {tx.weight_kg != null && tx.weight_kg > 0 && (
          <div className="text-[10px] text-slate-600">৳{(tx.amount / tx.weight_kg).toFixed(0)}/kg</div>
        )}
      </div>
      <button onClick={() => onDelete(tx.id)}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ml-1 w-7 h-7 flex items-center justify-center rounded-lg border border-transparent text-slate-600 hover:text-red-400 hover:border-red-400/30 bg-transparent cursor-pointer transition-all flex-shrink-0">
        ×
      </button>
    </div>
  )
}
