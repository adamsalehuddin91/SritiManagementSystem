'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  status: string
  reference_no: string | null
  payment_proofs: { verification_note: string | null; verified_at: string | null }[]
  payment_allocations: {
    amount: number
    invoices: { invoice_no: string; invoice_month: number; invoice_year: number } | null
  }[]
}

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const METHOD_LABEL: Record<string, string> = {
  manual_transfer: 'Pindahan Bank', fpx: 'FPX', qr: 'QR Pay', cash: 'Tunai',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pengesahan',
  success: 'Disahkan',
  rejected: 'Ditolak',
  failed: 'Gagal',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={18} className="text-green-500" />
  if (status === 'rejected' || status === 'failed') return <XCircle size={18} className="text-red-500" />
  return <Clock size={18} className="text-yellow-500" />
}

export default function BayaranPage() {
  const supabase = useRef(createClient()).current
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('guardian_id').eq('id', user.id).single()
      if (!profile?.guardian_id) { setLoading(false); return }

      const { data } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date, method, status, reference_no,
          payment_proofs ( verification_note, verified_at ),
          payment_allocations ( amount, invoices ( invoice_no, invoice_month, invoice_year ) )
        `)
        .eq('guardian_id', profile.guardian_id)
        .order('created_at', { ascending: false })

      setPayments((data ?? []) as unknown as Payment[])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 rounded-b-[2rem]" style={{ backgroundColor: '#0B4233' }}>
        <h1 className="text-white text-lg font-bold">Sejarah Bayaran</h1>
        <p className="text-green-300 text-xs mt-0.5">{payments.length} rekod bayaran</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3">
              <CreditCard size={28} className="text-gray-200" />
            </div>
            <p className="text-sm font-medium text-gray-500">Tiada rekod bayaran</p>
            <p className="text-xs text-gray-400 mt-1">Bayaran anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(pay => {
              const inv = (pay.payment_allocations as any)?.[0]?.invoices
              const note = pay.payment_proofs?.[0]?.verification_note
              return (
                <div key={pay.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        <StatusIcon status={pay.status} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">RM {pay.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {pay.payment_date} · {METHOD_LABEL[pay.method] ?? pay.method}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[pay.status] ?? 'bg-gray-50 text-gray-500'}`}>
                      {STATUS_LABEL[pay.status] ?? pay.status}
                    </span>
                  </div>

                  {/* Invoice tag */}
                  {inv && (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500">Untuk invois:</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {inv.invoice_no} — {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                      </span>
                    </div>
                  )}

                  {/* Reference no */}
                  {pay.reference_no && (
                    <p className="text-xs text-gray-400 font-mono">No. Rujukan: {pay.reference_no}</p>
                  )}

                  {/* Rejection / verification note */}
                  {note && (
                    <div className={`px-3 py-2 rounded-xl text-xs ${pay.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                      Nota: {note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
