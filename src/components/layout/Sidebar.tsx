'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  X,
  User,
  ClipboardList,
} from 'lucide-react'
import { logout } from '@/app/login/actions'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pelajar', href: '/dashboard/pelajar', icon: Users },
  { label: 'Yuran & Bayaran', href: '/dashboard/yuran', icon: CreditCard },
  { label: 'Tracker Yuran', href: '/dashboard/tracker', icon: ClipboardList },
  { label: 'Laporan', href: '/dashboard/laporan', icon: BarChart3 },
  { label: 'Tetapan', href: '/dashboard/tetapan', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
  userName?: string
  userRole?: string
}

export default function Sidebar({ onClose, userName, userRole }: SidebarProps) {
  const pathname = usePathname()

  const roleLabel = userRole === 'super_admin'
    ? 'Guru Besar'
    : userRole === 'staff'
    ? 'Staf'
    : 'Admin'

  return (
    <div className="flex flex-col h-full w-64 bg-[#0B4233] text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center shadow-inner">
            {/* Asterisk placeholder for star logo */}
            <span className="text-[#0B4233] text-2xl leading-none">✻</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-wide leading-tight">SRITI</h1>
            <p className="text-[10px] text-green-100 uppercase tracking-wider leading-tight">Sistem Pengurusan<br/>Sekolah</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-white/10 mx-2 mb-2">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-[#0B4233] overflow-hidden flex-shrink-0 border-2 border-white/20">
          <User size={24} />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{userName ?? 'Mohd Hakimi'}</p>
          <p className="text-green-200 text-xs mt-0.5">{roleLabel}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div>
            <p className="text-[10px] text-green-200 font-medium tracking-wide">Online</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-[#0B4233] shadow-md'
                  : 'text-green-50/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#0B4233]' : 'text-green-50/70'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — Logout */}
      <div className="px-3 py-4 mt-auto">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-green-50/90 hover:bg-white/10 hover:text-white transition-all w-full text-left"
          >
            <LogOut size={18} className="text-green-50/70" />
            Log Keluar
          </button>
        </form>
      </div>
    </div>
  )
}
