'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  reference_no: string | null
  guardians: { full_name: string } | null
  payment_proofs: { id: string; file_url: string }[]
  payment_allocations: {
    invoice_id: string
    amount: number
    invoices: {
      invoice_no: string
      invoice_month: number
      invoice_year: number
      students: { full_name: string; student_no: string; classes: { name: string } | null } | null
    } | null
  }[]
}

interface Props {
  payment: Payment
  onClose: () => void
  onSuccess: () => void
}

export default function VerifyModal({ payment, onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [verifiedInvoiceId, setVerifiedInvoiceId] = useState<string | null>(null)

  async function handleVerify(action: 'verify' | 'reject') {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('payments').update({
      status: action === 'verify' ? 'success' : 'rejected',
    }).eq('id', payment.id)

    await supabase.from('payment_proofs').update({
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
      verification_note: note || null,
    }).eq('payment_id', payment.id)

    // If verified — update invoice status to paid
    if (action === 'verify') {
      for (const alloc of payment.payment_allocations) {
        await supabase.from('invoices').update({ status: 'paid' })
          .eq('id', alloc.invoice_id)
      }
      const firstInvoiceId = payment.payment_allocations[0]?.invoice_id ?? null
      setVerifiedInvoiceId(firstInvoiceId)
    }

    onSuccess()
  }

  const methodLabel: Record<string, string> = {
    manual_transfer: 'Manual Transfer', fpx: 'FPX', qr: 'QR', cash: 'Tunai',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Semak Bukti Bayaran</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Student / Invoice Info */}
          {payment.payment_allocations.map((alloc, i) => {
            const inv = alloc.invoices
            const student = inv?.students
            return (
              <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#1B4332' }}>
                  {student?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{student?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{student?.classes?.name ?? '—'} · {student?.student_no ?? '—'}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#1B4332' }}>
                    {inv ? `${MONTHS[inv.invoice_month - 1]} ${inv.invoice_year} · ${inv.invoice_no}` : '—'}
                  </p>
                </div>
              </div>
            )
          })}

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Ibu Bapa / Waris</span>
              <span className="text-sm font-medium text-gray-900">{payment.guardians?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Jumlah</span>
              <span className="text-sm font-bold" style={{ color: '#1B4332' }}>RM {payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Kaedah</span>
              <span className="text-sm text-gray-700">{methodLabel[payment.method]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Tarikh</span>
              <span className="text-sm text-gray-700">{payment.payment_date}</span>
            </div>
            {payment.reference_no && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">No. Rujukan</span>
                <span className="text-sm font-mono text-gray-700">{payment.reference_no}</span>
              </div>
            )}
          </div>

          {/* Proof Image */}
          {payment.payment_proofs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Bukti Bayaran</p>
              {payment.payment_proofs.map(proof => (
                <a
                  key={proof.id}
                  href={proof.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={proof.file_url}
                    alt="Bukti bayaran"
                    className="w-full rounded-xl border border-gray-200 object-contain max-h-64"
                  />
                  <p className="text-xs text-center text-blue-600 mt-1">Klik untuk buka penuh</p>
                </a>
              ))}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nota (optional)
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="cth: Bayaran disahkan via bank"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
            />
          </div>

        </div>

        {/* Actions — fixed at bottom */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3 flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={() => handleVerify('reject')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-60"
            >
              <XCircle size={15} /> Tolak
            </button>
            <button
              onClick={() => handleVerify('verify')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#1B4332' }}
            >
              <CheckCircle size={15} /> Sahkan
            </button>
          </div>

          {verifiedInvoiceId && (
            <button
              onClick={() => router.push(`/resit/${verifiedInvoiceId}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition"
              style={{ borderColor: '#1B4332', color: '#1B4332' }}
            >
              <FileText size={15} /> Lihat Resit Rasmi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
