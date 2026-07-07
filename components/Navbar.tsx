'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/log-food', label: 'Log Food', icon: '🍽️' },
  { href: '/log-activity', label: 'Activity', icon: '🏋️' },
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
    <>
      {/* Top bar */}
      <nav className="bg-gray-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-[100]">
        <div className="max-w-[1100px] mx-auto px-4 flex items-center h-[56px] gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 no-underline shrink-0">
            <span className="text-xl">🥗</span>
            <span className="font-extrabold text-base bg-gradient-to-br from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              CalorieCanvas
            </span>
          </Link>

          {/* Desktop nav items */}
          <div className="hidden sm:flex gap-1 flex-1 ml-4">
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className="no-underline">
                  <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[13px] font-semibold transition-all border ${
                    active
                      ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                  }`}>
                    <span>{item.icon}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            {name && <span className="text-[13px] text-slate-500">Hi, {name.split(' ')[0]}</span>}
            <button
              onClick={signOut}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-transparent text-slate-400 text-xs font-semibold cursor-pointer transition-all hover:border-red-400 hover:text-red-400"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile right side */}
          <div className="sm:hidden ml-auto flex items-center gap-2">
            {name && <span className="text-[11px] text-slate-500">Hi, {name.split(' ')[0]}</span>}
            <button
              onClick={signOut}
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-transparent text-slate-400 text-[11px] font-semibold cursor-pointer hover:border-red-400 hover:text-red-400"
            >
              Out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 border-t border-slate-800">
        <div className="flex">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="flex-1 no-underline">
                <div className={`flex flex-col items-center pt-2 pb-3 gap-0.5 transition-colors ${active ? 'text-cyan-400' : 'text-slate-500'}`}>
                  <span className="text-[20px] leading-none">{item.icon}</span>
                  <span className={`text-[9px] font-semibold ${active ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {item.label === 'Dashboard' ? 'Home' : item.label === 'Log Food' ? 'Food' : item.label}
                  </span>
                  {active && <div className="w-4 h-0.5 rounded-full bg-cyan-400 mt-0.5" />}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
