'use client'

import { Menu, Bell } from 'lucide-react'

interface TopBarProps {
  title: string
  userName?: string
  userRole?: string
  onMenuClick?: () => void
}

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <Menu className="hidden lg:block text-gray-400" size={24} />
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        {/* Notification */}
        <button className="relative text-gray-500 hover:text-gray-700 transition">
          <Bell size={24} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white">
            3
          </span>
        </button>
      </div>
    </header>
  )
}
