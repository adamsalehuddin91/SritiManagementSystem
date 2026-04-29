'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

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

const methodLabel: Record<string, string> = {
  manual_transfer: 'Manual Transfer', fpx: 'FPX', qr: 'QR', cash: 'Tunai',
}

export default function StatusPage() {
  const supabase = useRef(createClient()).current
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('guardian_id').eq('id', user.id).single()
      if (!profile?.guardian_id) { setLoading(false); return }

      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_date, method, status, reference_no, payment_proofs(verification_note, verified_at), payment_allocations(amount, invoices(invoice_no, invoice_month, invoice_year))')
        .eq('guardian_id', profile.guardian_id)
        .order('created_at', { ascending: false })

      setPayments(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  function StatusIcon({ status }: { status: string }) {
    if (status === 'success') return <CheckCircle size={20} className="text-green-500" />
    if (status === 'rejected') return <XCircle size={20} className="text-red-500" />
    return <Clock size={20} className="text-yellow-500" />
  }

  const statusLabel: Record<string, string> = {
    pending: 'Menunggu Pengesahan',
    success: 'Disahkan',
    failed: 'Gagal',
    rejected: 'Ditolak',
  }

  const statusStyle: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ backgroundColor: '#1B4332' }}>
        <h1 className="text-white text-lg font-bold">Status Bayaran</h1>
        <p className="text-green-300 text-xs mt-0.5">{payments.length} rekod bayaran</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock size={32} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">Tiada rekod bayaran</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(pay => {
              const inv = pay.payment_allocations?.[0]?.invoices
              return (
                <div key={pay.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        <StatusIcon status={pay.status} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">RM {pay.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{pay.payment_date} · {methodLabel[pay.method]}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[pay.status]}`}>
                      {statusLabel[pay.status]}
                    </span>
                  </div>

                  {inv && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600">
                      Invois: {inv.invoice_no} — {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                    </div>
                  )}

                  {pay.reference_no && (
                    <p className="text-xs text-gray-400 mt-2">Ref: {pay.reference_no}</p>
                  )}

                  {pay.payment_proofs?.[0]?.verification_note && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-xl">
                      <p className="text-xs text-yellow-700">
                        Nota: {pay.payment_proofs[0].verification_note}
                      </p>
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
