'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Receipt, FileText } from 'lucide-react'

interface PaidInvoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  students: { full_name: string } | null
}

const MONTHS_FULL = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

export default function ParentResitPage() {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [invoices, setInvoices] = useState<PaidInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
      if (studentIds.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, students ( full_name )')
        .in('student_id', studentIds)
        .eq('status', 'paid')
        .order('invoice_year', { ascending: false })
        .order('invoice_month', { ascending: false })

      setInvoices((data ?? []) as unknown as PaidInvoice[])
      setLoading(false)
    }
    load()
  }, [supabase])

  // Group by year
  const grouped = invoices.reduce<Record<number, PaidInvoice[]>>((acc, inv) => {
    const y = inv.invoice_year
    if (!acc[y]) acc[y] = []
    acc[y].push(inv)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 rounded-b-[2rem]" style={{ backgroundColor: '#0B4233' }}>
        <h1 className="text-white text-lg font-bold">Resit Rasmi</h1>
        <p className="text-green-300 text-xs mt-0.5">{invoices.length} resit tersedia</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3">
              <FileText size={28} className="text-gray-200" />
            </div>
            <p className="text-sm font-medium text-gray-500">Tiada resit lagi</p>
            <p className="text-xs text-gray-400 mt-1">Resit akan muncul selepas bayaran disahkan</p>
          </div>
        ) : (
          <div className="space-y-5">
            {years.map(year => (
              <div key={year}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{year}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {grouped[year].map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => router.push(`/resit/${inv.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#E8F5E9' }}
                      >
                        <Receipt size={18} style={{ color: '#0B4233' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          Yuran {MONTHS_FULL[inv.invoice_month - 1]}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {inv.invoice_no}
                          {inv.students?.full_name && ` · ${inv.students.full_name}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: '#0B4233' }}>
                          RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 mt-0.5 font-medium">Lihat Resit →</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
