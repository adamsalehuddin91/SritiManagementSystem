'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Receipt, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Invoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
  students: { full_name: string } | null
}

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const statusStyle: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const statusLabel: Record<string, string> = {
  paid: 'Dibayar', pending: 'Menunggu Pengesahan', overdue: 'Tertunggak', sent: 'Belum Bayar',
}

export default function ParentYuranPage() {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filterTab, setFilterTab] = useState<'belum_bayar' | 'selesai'>('belum_bayar')
  const [childFilter, setChildFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('guardian_id').eq('id', user.id).single()
      if (!profile?.guardian_id) { setLoading(false); return }

      const { data: links } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', profile.guardian_id)

      const studentIds = links?.map(l => l.student_id) ?? []

      if (studentIds.length > 0) {
        const { data } = await supabase
          .from('invoices')
          .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status, students(full_name)')
          .in('student_id', studentIds)
          .order('invoice_year', { ascending: false })
          .order('invoice_month', { ascending: false })

        setInvoices(data ?? [])
      }
      setLoading(false)
    }
    fetch()
  }, [supabase])

  // Computed stats
  const belumBayarInvoices = invoices.filter(i => i.status !== 'paid')
  const selesaiInvoices = invoices.filter(i => i.status === 'paid')
  
  // Unique children
  const children = useMemo(() => {
    const names = invoices.map(i => i.students?.full_name).filter(Boolean) as string[]
    return Array.from(new Set(names))
  }, [invoices])

  // Filtered lists
  const currentList = filterTab === 'belum_bayar' ? belumBayarInvoices : selesaiInvoices
  const displayedInvoices = childFilter 
    ? currentList.filter(i => i.students?.full_name === childFilter)
    : currentList

  const totalBelumBayar = belumBayarInvoices.reduce((acc, inv) => acc + (inv.total_amount - inv.discount_amount), 0)

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 bg-white">
        <h1 className="text-gray-900 text-xl font-bold">Senarai Yuran</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tabs: Belum Bayar & Selesai */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setFilterTab('belum_bayar')}
            className={`pb-2 text-sm font-bold relative ${filterTab === 'belum_bayar' ? 'text-[#0B4233]' : 'text-gray-400'}`}
          >
            Belum Bayar ({belumBayarInvoices.length})
            {filterTab === 'belum_bayar' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B4233] rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setFilterTab('selesai')}
            className={`pb-2 text-sm font-bold relative ${filterTab === 'selesai' ? 'text-[#0B4233]' : 'text-gray-400'}`}
          >
            Selesai ({selesaiInvoices.length})
            {filterTab === 'selesai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B4233] rounded-t-full"></div>
            )}
          </button>
        </div>

        {/* Child Filter Pill */}
        {children.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {children.map(child => {
              const isActive = childFilter === child
              return (
                <button
                  key={child}
                  onClick={() => setChildFilter(isActive ? null : child)}
                  className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                    isActive 
                      ? 'bg-[#E8F5E9] border-[#0B4233] text-[#0B4233]' 
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {/* Dummy initial */}
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isActive ? 'bg-[#0B4233] text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {child.charAt(0)}
                  </div>
                  {child.split(' ')[0]}
                  {isActive && <X size={12} />}
                </button>
              )
            })}
          </div>
        )}

        {/* Invoice Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : displayedInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl shadow-sm border border-gray-100">
              <FileText size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Tiada invois</p>
            </div>
          ) : (
            displayedInvoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Yuran Bulanan {MONTHS[inv.invoice_month - 1]}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium mt-1 inline-block ${statusStyle[inv.status] ?? 'bg-gray-50 text-gray-500'}`}>
                      {statusLabel[inv.status] ?? inv.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#0B4233' }}>
                    {inv.students?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{inv.students?.full_name}</span>
                </div>

                <p className="text-xs text-gray-400 mb-4 font-mono">
                  01 {MONTHS[inv.invoice_month - 1]} {inv.invoice_year} · {inv.invoice_no}
                </p>

                {inv.status === 'paid' ? (
                  <button
                    onClick={() => router.push(`/resit/${inv.id}`)}
                    className="w-full py-2.5 bg-gray-50 text-[#0B4233] border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition"
                  >
                    <Receipt size={14} /> Lihat Resit
                  </button>
                ) : (
                  <Link 
                    href={`/parent/bayar/${inv.id}`}
                    className="block text-center w-full py-2.5 border rounded-xl text-xs font-bold transition active:scale-95"
                    style={{ borderColor: '#0B4233', color: '#0B4233' }}
                  >
                    Pilih Untuk Bayar
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Bayar Semua Bar */}
      {filterTab === 'belum_bayar' && belumBayarInvoices.length > 0 && !loading && (
        <div className="fixed bottom-[72px] left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Jumlah Perlu Dibayar</span>
            <span className="text-lg font-bold text-gray-900">RM {totalBelumBayar.toFixed(2)}</span>
          </div>
          <Link
            href={`/parent/bayar/${belumBayarInvoices[0]?.id}`}
            className="flex items-center justify-center w-full py-3.5 rounded-xl text-white text-sm font-bold transition active:scale-95"
            style={{ backgroundColor: '#0B4233' }}
          >
            Bayar Semua ({belumBayarInvoices.length})
          </Link>
        </div>
      )}
    </div>
  )
}
