'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, Wallet, CreditCard, Users, FileText, Receipt } from 'lucide-react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
  students: { full_name: string; year_level: number; classes: { name: string } | null } | null
}

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const statusStyle: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
}

const statusLabel: Record<string, string> = {
  paid: 'Dibayar', pending: 'Pending', overdue: 'Tertunggak', sent: 'Belum Bayar', draft: 'Draf',
}

export default function ParentDashboard() {
  const supabase = useRef(createClient()).current
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users').select('full_name, guardian_id').eq('id', user.id).single()

      setUserName(profile?.full_name ?? 'Ibu Bapa')

      if (profile?.guardian_id) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id')
          .eq('guardian_id', profile.guardian_id)

        const studentIds = links?.map(l => l.student_id) ?? []

        if (studentIds.length > 0) {
          const { data: inv } = await supabase
            .from('invoices')
            .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status, students(full_name, year_level, classes(name))')
            .in('student_id', studentIds)
            .order('invoice_year', { ascending: false })
            .order('invoice_month', { ascending: false })
            .limit(10)

          setInvoices(inv ?? [])
        }
      }

      setLoading(false)
    }
    fetch()
  }, [supabase])

  const unpaid = invoices.filter(i => i.status !== 'paid')
  const totalUnpaid = unpaid.reduce((s, i) => s + i.total_amount - i.discount_amount, 0)
  const currentMonth = invoices.find(i => i.invoice_month === new Date().getMonth() + 1 && i.invoice_year === new Date().getFullYear())

  return (
    <div className="flex flex-col pb-24">
      {/* Green Header */}
      <div className="px-5 pt-12 pb-16 rounded-b-[2rem]" style={{ backgroundColor: '#0B4233' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mt-0.5">Hello, {userName.split(' ')[0]}</h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 overflow-hidden">
            <span className="text-white text-lg font-bold">{userName.charAt(0)}</span>
          </div>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <p className="text-green-300 text-xs font-medium">Bulan Ini</p>
            <p className="text-white text-2xl font-bold mt-1">
              {currentMonth
                ? `RM ${(currentMonth.total_amount - currentMonth.discount_amount).toFixed(2)}`
                : '—'}
            </p>
            <span className={`text-xs px-2.5 py-1 rounded-full mt-2 inline-block font-medium ${currentMonth?.status === 'paid' ? 'bg-green-400/30 text-green-200' : 'bg-yellow-400/20 text-yellow-200'}`}>
              {currentMonth ? (currentMonth.status === 'paid' ? 'Aktif' : statusLabel[currentMonth.status]) : 'Tiada invois'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <p className="text-green-300 text-xs font-medium">Tunggakan</p>
            <p className="text-white text-2xl font-bold mt-1">RM {totalUnpaid.toFixed(2)}</p>
            <p className="text-green-300 text-xs mt-2 font-medium">{unpaid.length} invois belum bayar</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 -mt-6 space-y-6">

        {/* Pilihan Pantas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {[
              { label: 'Yuran', href: '/parent/yuran', icon: Wallet },
              { label: 'Bayaran', href: '/parent/bayaran', icon: CreditCard },
              { label: 'Resit', href: '/parent/resit', icon: Receipt },
              { label: 'Anak Saya', href: '/parent/profil', icon: Users },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                  <Icon size={20} style={{ color: '#0B4233' }} />
                </div>
                <span className="text-xs font-medium text-gray-600">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900">Invois Terkini</h3>
            <Link href="/parent/yuran" className="text-xs font-medium" style={{ color: '#1B4332' }}>
              Lihat semua →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">Tiada invois lagi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.slice(0, 5).map(inv => (
                <Link
                  key={inv.id}
                  href={inv.status !== 'paid' ? `/parent/bayar/${inv.id}` : '#'}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {inv.students?.full_name} · {inv.invoice_no}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[inv.status]}`}>
                        {statusLabel[inv.status]}
                      </span>
                    </div>
                    {inv.status !== 'paid' && <ChevronRight size={14} className="text-gray-300" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pay Now CTA */}
        {unpaid.length > 0 && (
          <Link
            href={`/parent/bayar/${unpaid[0].id}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white text-sm font-bold transition active:scale-95 mt-4"
            style={{ backgroundColor: '#0B4233' }}
          >
            Bayar Sekarang — RM {(unpaid[0].total_amount - unpaid[0].discount_amount).toFixed(2)}
          </Link>
        )}
      </div>
    </div>
  )
}
