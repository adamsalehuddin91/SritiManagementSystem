'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, CreditCard, User, Receipt } from 'lucide-react'

const navItems = [
  { label: 'Utama', href: '/parent', icon: Home },
  { label: 'Yuran', href: '/parent/yuran', icon: FileText },
  { label: 'Bayaran', href: '/parent/bayaran', icon: CreditCard },
  { label: 'Resit', href: '/parent/resit', icon: Receipt },
  { label: 'Profil', href: '/parent/profil', icon: User },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 z-20">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/parent' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition"
              >
                <Icon
                  size={20}
                  style={{ color: isActive ? '#0B4233' : '#9CA3AF' }}
                />
                <span
                  className="text-xs font-medium mt-1"
                  style={{ color: isActive ? '#0B4233' : '#9CA3AF' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
