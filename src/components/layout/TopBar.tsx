'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, Bell, CheckCircle, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface PendingInvoice {
  id: string
  invoice_no: string
  total_amount: number
  invoice_month: number
  invoice_year: number
  students: { full_name: string } | null
}

interface TopBarProps {
  title: string
  userName?: string
  userRole?: string
  onMenuClick?: () => void
}

const MONTHS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis']

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingList, setPendingList] = useState<PendingInvoice[]>([])
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchPending() {
    const { data, count } = await supabase
      .from('invoices')
      .select('id, invoice_no, total_amount, invoice_month, invoice_year, students(full_name)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    setPendingCount(count ?? 0)
    setPendingList((data ?? []) as unknown as PendingInvoice[])
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-4">
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
        <div className="relative" ref={popoverRef}>
          {/* Bell button */}
          <button
            onClick={() => setOpen(v => !v)}
            className="relative text-gray-500 hover:text-gray-700 transition p-1"
          >
            <Bell size={24} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {/* Popover */}
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-bold text-gray-800">Notifikasi Pembayaran</span>
                {pendingCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                    {pendingCount} pending
                  </span>
                )}
              </div>

              {/* List */}
              {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <CheckCircle size={32} className="text-green-400" />
                  <p className="text-sm font-medium">Tiada pembayaran pending</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {pendingList.map(inv => (
                    <li key={inv.id}>
                      <Link
                        href={`/dashboard/yuran/invois/${inv.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition group"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {(inv.students as unknown as { full_name: string } | null)?.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {inv.invoice_no} · {MONTHS[(inv.invoice_month ?? 1) - 1]} {inv.invoice_year}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-800">
                            RM {Number(inv.total_amount).toFixed(2)}
                          </p>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-500 transition ml-auto" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Footer */}
              {pendingCount > 0 && (
                <div className="border-t border-gray-100">
                  <Link
                    href="/dashboard/yuran?status=pending"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-1 py-3 text-xs font-bold text-green-700 hover:bg-green-50 transition"
                  >
                    Lihat semua {pendingCount} pending
                    <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
