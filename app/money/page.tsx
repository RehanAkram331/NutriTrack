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
  category: string
  description: string | null
  date: string
}

interface Profile { id: string; name: string }

const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other']
const EXPENSE_CATS = ['Food', 'Transport', 'Housing', 'Healthcare', 'Entertainment', 'Education', 'Shopping', 'Utilities', 'Other']

const inputCls = 'bg-slate-900 border border-slate-800 rounded-[10px] px-4 py-3 text-slate-100 w-full text-sm transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 outline-none placeholder:text-slate-400'
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-[0.05em] mb-1.5'

const catColors: Record<string, string> = {
  Salary: '#22d3ee', Freelance: '#34d399', Business: '#818cf8', Investment: '#f59e0b',
  Gift: '#f472b6', Food: '#f87171', Transport: '#fb923c', Housing: '#a78bfa',
  Healthcare: '#2dd4bf', Entertainment: '#e879f9', Education: '#60a5fa',
  Shopping: '#fbbf24', Utilities: '#94a3b8', Other: '#64748b',
}

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

  const [incomeForm, setIncomeForm] = useState({ amount: '', category: 'Salary', description: '', date: today })
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'Food', description: '', date: today })
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

  async function saveIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !incomeForm.amount) return
    setLoading(true)
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'income',
      amount: parseFloat(incomeForm.amount),
      category: incomeForm.category,
      description: incomeForm.description || null,
      date: incomeForm.date,
    })
    setIncomeForm({ amount: '', category: 'Salary', description: '', date: today })
    await load()
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !expenseForm.amount) return
    setLoading(true)
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'expense',
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category,
      description: expenseForm.description || null,
      date: expenseForm.date,
    })
    setExpenseForm({ amount: '', category: 'Food', description: '', date: today })
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

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  const incomeList = transactions.filter(t => t.type === 'income')
  const expenseList = transactions.filter(t => t.type === 'expense')

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
            { key: 'overview', label: 'Overview' },
            { key: 'income',   label: '+ Income' },
            { key: 'expense',  label: '+ Expense' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all"
              style={{
                background: tab === t.key
                  ? t.key === 'income' ? 'linear-gradient(135deg,#22d3ee,#34d399)'
                  : t.key === 'expense' ? 'linear-gradient(135deg,#f87171,#f59e0b)'
                  : 'linear-gradient(135deg,#22d3ee,#818cf8)'
                  : 'transparent',
                color: tab === t.key ? 'white' : '#64748b',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div>
            {transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <div className="text-5xl mb-3">💰</div>
                <div className="font-semibold text-slate-500">No transactions yet</div>
                <div className="text-sm mt-1">Add your first income or expense</div>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Income tab ── */}
        {tab === 'income' && (
          <div className="space-y-5">
            <form onSubmit={saveIncome} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="text-[13px] font-bold text-emerald-400 uppercase tracking-wider">Add Income</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount (৳)</label>
                  <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00"
                    value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input className={inputCls} type="date" max={today}
                    value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {INCOME_CATS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setIncomeForm(f => ({ ...f, category: c }))}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all"
                      style={{
                        background: incomeForm.category === c ? (catColors[c] + '22') : 'transparent',
                        borderColor: incomeForm.category === c ? catColors[c] : '#1e293b',
                        color: incomeForm.category === c ? catColors[c] : '#64748b',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Description (optional)</label>
                <input className={inputCls} placeholder="e.g. Monthly salary"
                  value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <button type="submit" disabled={loading || !incomeForm.amount}
                className="w-full py-3 rounded-xl font-bold text-[14px] text-white border-none cursor-pointer disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#22d3ee,#34d399)' }}>
                {loading ? 'Saving…' : saved ? '✓ Saved!' : 'Save Income'}
              </button>
            </form>

            {/* Income history */}
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

        {/* ── Expense tab ── */}
        {tab === 'expense' && (
          <div className="space-y-5">
            <form onSubmit={saveExpense} className="bg-gray-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="text-[13px] font-bold text-red-400 uppercase tracking-wider">Add Expense</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount (৳)</label>
                  <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00"
                    value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input className={inputCls} type="date" max={today}
                    value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setExpenseForm(f => ({ ...f, category: c }))}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all"
                      style={{
                        background: expenseForm.category === c ? (catColors[c] + '22') : 'transparent',
                        borderColor: expenseForm.category === c ? catColors[c] : '#1e293b',
                        color: expenseForm.category === c ? catColors[c] : '#64748b',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Description (optional)</label>
                <input className={inputCls} placeholder="e.g. Grocery shopping"
                  value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <button type="submit" disabled={loading || !expenseForm.amount}
                className="w-full py-3 rounded-xl font-bold text-[14px] text-white border-none cursor-pointer disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#f87171,#f59e0b)' }}>
                {loading ? 'Saving…' : saved ? '✓ Saved!' : 'Save Expense'}
              </button>
            </form>

            {/* Expense history */}
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

function TransactionRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const isIncome = tx.type === 'income'
  const color = catColors[tx.category] ?? '#64748b'
  return (
    <div className="group flex items-center gap-3 bg-gray-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
        style={{ background: color + '22', border: `1px solid ${color}33` }}>
        {isIncome ? '↑' : '↓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-200 truncate">
            {tx.description || tx.category}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: color + '22', color }}>
            {tx.category}
          </span>
        </div>
        <div className="text-[11px] text-slate-600 mt-0.5">
          {format(parseISO(tx.date), 'dd MMM yyyy')}
        </div>
      </div>
      <div className={`text-[14px] font-bold flex-shrink-0 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
        {isIncome ? '+' : '-'}৳{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>
      <button onClick={() => onDelete(tx.id)}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ml-1 w-7 h-7 flex items-center justify-center rounded-lg border border-transparent text-slate-600 hover:text-red-400 hover:border-red-400/30 bg-transparent cursor-pointer transition-all flex-shrink-0">
        ×
      </button>
    </div>
  )
}
