'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/log-food', label: 'Log Food', icon: '🍽️' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Navbar({ name }: { name?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="bg-gray-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-[100]">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center h-[60px] gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 no-underline mr-6">
          <span className="text-xl">🥗</span>
          <span className="font-extrabold text-base bg-gradient-to-br from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            NutriTrack
          </span>
        </Link>

        <div className="flex gap-1 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="no-underline">
                <div className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[13px] font-semibold transition-all border ${
                  active
                    ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                    : 'bg-transparent text-slate-400 border-transparent'
                }`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          {name && <span className="text-[13px] text-slate-500">Hi, {name.split(' ')[0]}</span>}
          <button
            onClick={signOut}
            className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-transparent text-slate-400 text-xs font-semibold cursor-pointer transition-all hover:border-red-400 hover:text-red-400"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
