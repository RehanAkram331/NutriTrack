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

// A single row in the batch entry form
interface EntryRow {
  key: number
  category: string
  amount: string
  weight_kg: string
  description: string
}

const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other']
const EXPENSE_CATS = [
  'Food', 'Vegetable', 'Grocery', 'Transport', 'Bike',
  'Housing', 'Healthcare', 'Entertainment', 'Education',
  'Shopping', 'Utilities', 'Other',
]

const inputCls = 'bg-slate-950 border border-slate-800 rounded-[8px] px-3 py-2.5 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/10 outline-none placeholder:text-slate-600'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5'

const catColors: Record<string, string> = {
  Salary: '#22d3ee', Freelance: '#34d399', Business: '#818cf8', Investment: '#f59e0b',
  Gift: '#f472b6',
  Food: '#f87171', Vegetable: '#4ade80', Grocery: '#fb923c', Transport: '#60a5fa',
  Bike: '#a78bfa', Housing: '#818cf8', Healthcare: '#2dd4bf', Entertainment: '#e879f9',
  Education: '#60a5fa', Shopping: '#fbbf24', Utilities: '#94a3b8', Other: '#64748b',
}

const WEIGHT_CATS = new Set(['Vegetable', 'Grocery', 'Food'])

let rowKey = 0
const newRow = (category: string): EntryRow => ({ key: ++rowKey, category, amount: '', weight_kg: '', description: '' })

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
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions(data ?? [])
  }, [router])

  useEffect(() => { load() }, [load])

  // ── helpers ──
  function updateRow(rows: EntryRow[], setRows: (r: EntryRow[]) => void, key: number, patch: Partial<EntryRow>) {
    setRows(rows.map(r => r.key === key ? { ...r, ...patch } : r))
  }
  function removeRow(rows: EntryRow[], setRows: (r: EntryRow[]) => void, key: number) {
    if (rows.length === 1) return
    setRows(rows.filter(r => r.key !== key))
  }

  // ── save income batch ──
  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const valid = incomeRows.filter(r => r.amount)
    if (!valid.length) return
    setLoading(true)
    await supabase.from('transactions').insert(
      valid.map(r => ({
        user_id: profile.id,
        type: 'income',
        date: incomeDate,
        amount: parseFloat(r.amount),
        category: r.category,
        description: r.description || null,
        weight_kg: null,
      }))
    )
    setIncomeRows([newRow('Salary')])
    await load()
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── save expense batch ──
  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const valid = expenseRows.filter(r => r.amount)
    if (!valid.length) return
    setLoading(true)
    await supabase.from('transactions').insert(
      valid.map(r => ({
        user_id: profile.id,
        type: 'expense',
        date: expenseDate,
        amount: parseFloat(r.amount),
        category: r.category,
        weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : null,
        description: r.description || null,
      }))
    )
    setExpenseRows([newRow('Food')])
    await load()
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteTransaction(id: string) {
    const ok = await confirmDelete('This transaction will be permanently removed.')
    if (!ok) return
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(t => t.filter(x => x.id !== id))
  }

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense
  const incomeList   = transactions.filter(t => t.type === 'income')
  const expenseList  = transactions.filter(t => t.type === 'expense')

  const incomeBatchTotal  = incomeRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const expenseBatchTotal = expenseRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: '#0a0e1a' }}>
      <Navbar name={profile?.name} />
      <div className="max-w-[700px] mx-auto px-4 pt-6 pb-28 sm:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Money</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your income and expenses</p>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl p-4 border border-slate-800" style={{ background: 'rgba(34,211,238,0.06)' }}>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Income</div>
            <div className="text-lg font-bold text-emerald-400">৳{fmt(totalIncome)}</div>
          </div>
          <div className="rounded-2xl p-4 border border-slate-800" style={{ background: 'rgba(248,113,113,0.06)' }}>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Expense</div>
            <div className="text-lg font-bold text-red-400">৳{fmt(totalExpense)}</div>
          </div>
          <div className={`rounded-2xl p-4 border ${balance >= 0 ? 'border-emerald-400/20' : 'border-red-400/20'}`}
            style={{ background: balance >= 0 ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)' }}>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Balance</div>
            <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {balance < 0 ? '-' : ''}৳{fmt(Math.abs(balance))}
            </div>
          </div>
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
                  : 'linear-gradient(135deg,#22d3ee,#818cf8)'
                  : 'transparent',
                color: tab === t.key ? 'white' : '#64748b',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div>
            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">💰</div>
                <div className="font-semibold text-slate-500">No transactions yet</div>
                <div className="text-sm mt-1 text-slate-600">Add your first income or expense</div>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Income batch ── */}
        {tab === 'income' && (
          <div className="space-y-5">
            <form onSubmit={saveIncome} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-emerald-400 uppercase tracking-wider">Add Income</div>
                <div>
                  <label className="text-[11px] text-slate-500 mr-2">Date</label>
                  <input type="date" max={today} value={incomeDate}
                    onChange={e => setIncomeDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-400" />
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {incomeRows.map((row, i) => (
                  <IncomeEntryRow key={row.key} row={row} index={i}
                    onUpdate={patch => updateRow(incomeRows, setIncomeRows, row.key, patch)}
                    onRemove={() => removeRow(incomeRows, setIncomeRows, row.key)}
                    canRemove={incomeRows.length > 1} />
                ))}
              </div>

              {/* Add row */}
              <button type="button"
                onClick={() => setIncomeRows(r => [...r, newRow('Salary')])}
                className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[13px] font-semibold cursor-pointer hover:border-emerald-400/40 hover:text-emerald-400 transition-all bg-transparent">
                + Add Another
              </button>

              {/* Total + Save */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  {incomeRows.filter(r => r.amount).length} item{incomeRows.filter(r => r.amount).length !== 1 ? 's' : ''} ·{' '}
                  <span className="text-emerald-400 font-bold">৳{fmt(incomeBatchTotal)}</span>
                </div>
                <button type="submit" disabled={loading || !incomeRows.some(r => r.amount)}
                  className="px-6 py-2.5 rounded-xl font-bold text-[13px] text-white border-none cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#22d3ee,#34d399)' }}>
                  {loading ? 'Saving…' : saved ? '✓ Saved!' : `Save All`}
                </button>
              </div>
            </form>

            {incomeList.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Income History</div>
                <div className="space-y-2">
                  {incomeList.map(tx => <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Expense batch ── */}
        {tab === 'expense' && (
          <div className="space-y-5">
            <form onSubmit={saveExpense} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-red-400 uppercase tracking-wider">Add Expense</div>
                <div>
                  <label className="text-[11px] text-slate-500 mr-2">Date</label>
                  <input type="date" max={today} value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-400" />
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {expenseRows.map((row, i) => (
                  <ExpenseEntryRow key={row.key} row={row} index={i}
                    onUpdate={patch => updateRow(expenseRows, setExpenseRows, row.key, patch)}
                    onRemove={() => removeRow(expenseRows, setExpenseRows, row.key)}
                    canRemove={expenseRows.length > 1} />
                ))}
              </div>

              {/* Add row */}
              <button type="button"
                onClick={() => setExpenseRows(r => [...r, newRow('Food')])}
                className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[13px] font-semibold cursor-pointer hover:border-red-400/40 hover:text-red-400 transition-all bg-transparent">
                + Add Another
              </button>

              {/* Total + Save */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  {expenseRows.filter(r => r.amount).length} item{expenseRows.filter(r => r.amount).length !== 1 ? 's' : ''} ·{' '}
                  <span className="text-red-400 font-bold">৳{fmt(expenseBatchTotal)}</span>
                </div>
                <button type="submit" disabled={loading || !expenseRows.some(r => r.amount)}
                  className="px-6 py-2.5 rounded-xl font-bold text-[13px] text-white border-none cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f87171,#f59e0b)' }}>
                  {loading ? 'Saving…' : saved ? '✓ Saved!' : `Save All`}
                </button>
              </div>
            </form>

            {expenseList.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Expense History</div>
                <div className="space-y-2">
                  {expenseList.map(tx => <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Income row component ──
function IncomeEntryRow({ row, index, onUpdate, onRemove, canRemove }: {
  row: EntryRow; index: number
  onUpdate: (p: Partial<EntryRow>) => void
  onRemove: () => void; canRemove: boolean
}) {
  const color = catColors[row.category] ?? '#64748b'
  return (
    <div className="rounded-xl border border-slate-800 p-3 space-y-2.5" style={{ background: '#0a0e1a' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">#{index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-slate-600 hover:text-red-400 text-lg leading-none bg-transparent border-none cursor-pointer">×</button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {INCOME_CATS.map(c => (
          <button key={c} type="button" onClick={() => onUpdate({ category: c })}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all"
            style={{
              background: row.category === c ? (catColors[c] + '22') : 'transparent',
              borderColor: row.category === c ? catColors[c] : '#1e293b',
              color: row.category === c ? catColors[c] : '#475569',
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold" style={{ color }}>৳</span>
          <input type="number" min="0" step="0.01" placeholder="Amount" required
            className="bg-slate-950 border border-slate-800 rounded-[8px] pl-6 pr-3 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
            value={row.amount} onChange={e => onUpdate({ amount: e.target.value })} />
        </div>
        <input type="text" placeholder="Description (optional)"
          className="bg-slate-950 border border-slate-800 rounded-[8px] px-3 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
          value={row.description} onChange={e => onUpdate({ description: e.target.value })} />
      </div>
    </div>
  )
}

// ── Expense row component ──
function ExpenseEntryRow({ row, index, onUpdate, onRemove, canRemove }: {
  row: EntryRow; index: number
  onUpdate: (p: Partial<EntryRow>) => void
  onRemove: () => void; canRemove: boolean
}) {
  const color = catColors[row.category] ?? '#64748b'
  const showWeight = WEIGHT_CATS.has(row.category)
  return (
    <div className="rounded-xl border border-slate-800 p-3 space-y-2.5" style={{ background: '#0a0e1a' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">#{index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-slate-600 hover:text-red-400 text-lg leading-none bg-transparent border-none cursor-pointer">×</button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {EXPENSE_CATS.map(c => (
          <button key={c} type="button"
            onClick={() => onUpdate({ category: c, weight_kg: WEIGHT_CATS.has(c) ? row.weight_kg : '' })}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all"
            style={{
              background: row.category === c ? (catColors[c] + '22') : 'transparent',
              borderColor: row.category === c ? catColors[c] : '#1e293b',
              color: row.category === c ? catColors[c] : '#475569',
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className={`grid gap-2 ${showWeight ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color }}>৳</span>
          <input type="number" min="0" step="0.01" placeholder="Amount" required
            className="bg-slate-950 border border-slate-800 rounded-[8px] pl-6 pr-3 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
            value={row.amount} onChange={e => onUpdate({ amount: e.target.value })} />
        </div>
        {showWeight && (
          <div className="relative">
            <input type="number" min="0" step="0.001" placeholder="Weight"
              className="bg-slate-950 border border-slate-800 rounded-[8px] px-3 pr-8 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
              value={row.weight_kg} onChange={e => onUpdate({ weight_kg: e.target.value })} />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">kg</span>
          </div>
        )}
        <input type="text" placeholder="Description"
          className="bg-slate-950 border border-slate-800 rounded-[8px] px-3 py-2.5 text-slate-100 w-full text-sm outline-none focus:border-cyan-400 placeholder:text-slate-600"
          value={row.description} onChange={e => onUpdate({ description: e.target.value })} />
      </div>
    </div>
  )
}

// ── Transaction row ──
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
          <span className="text-[13px] font-semibold text-slate-200 truncate">
            {tx.description || tx.category}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: color + '22', color }}>
            {tx.category}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-600">{format(parseISO(tx.date), 'dd MMM yyyy')}</span>
          {tx.weight_kg != null && (
            <span className="text-[11px] text-slate-500 font-semibold">{tx.weight_kg} kg</span>
          )}
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
