'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/pelajar': 'Pelajar',
  '/dashboard/yuran': 'Yuran & Bayaran',
  '/dashboard/laporan': 'Laporan',
  '/dashboard/rph': 'RPH',
  '/dashboard/tetapan': 'Tetapan',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState<string>('Admin')
  const [userRole, setUserRole] = useState<string>('admin')
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'
  const supabase = useRef(createClient()).current

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      if (data) {
        setUserName(data.full_name ?? 'Admin')
        setUserRole(data.role ?? 'admin')
      }
    }
    loadUser()
  }, [supabase])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar — desktop (always visible) */}
      <aside className="hidden lg:flex flex-shrink-0">
        <Sidebar userName={userName} userRole={userRole} />
      </aside>

      {/* Sidebar — mobile (drawer overlay) */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-40 lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} userName={userName} userRole={userRole} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
