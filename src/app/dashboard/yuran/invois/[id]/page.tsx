'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Receipt, MessageCircle, CheckCircle, Clock, AlertCircle, FileText, User, Phone } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
}
const STATUS_LABEL: Record<string, string> = {
  paid: 'Dibayar', pending: 'Pending', overdue: 'Tertunggak', sent: 'Dihantar', draft: 'Draf',
}
const METHOD_LABEL: Record<string, string> = {
  manual_transfer: 'Pindahan Bank', fpx: 'FPX', qr: 'QR Pay', cash: 'Tunai',
}
const PAY_STATUS_STYLE: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
}
const PAY_STATUS_LABEL: Record<string, string> = {
  success: 'Disahkan', pending: 'Menunggu', rejected: 'Ditolak',
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'sent', label: 'Dihantar' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'overdue', label: 'Tertunggak' },
]

interface InvoiceDetail {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
  created_at: string
  students: {
    id: string
    full_name: string
    student_no: string
    year_level: number
    classes: { name: string } | null
  } | null
  guardians: {
    full_name: string
    phone: string
    email: string | null
  } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  status: string
  reference_no: string | null
  payment_proofs: { file_url: string; verification_note: string | null }[]
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = useRef(createClient()).current
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusUpdating, setStatusUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const fetchData = useCallback(async () => {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select(`
        id, invoice_no, invoice_month, invoice_year,
        total_amount, discount_amount, status, created_at,
        students ( id, full_name, student_no, year_level, classes ( name ) ),
        guardians ( full_name, phone, email )
      `)
      .eq('id', id)
      .single()

    if (invErr || !inv) {
      setError('Invois tidak ditemui.')
      setLoading(false)
      return
    }

    setInvoice(inv as unknown as InvoiceDetail)
    setNewStatus((inv as any).status)

    // Payments linked to this invoice
    const { data: allocs } = await supabase
      .from('payment_allocations')
      .select('payments ( id, amount, payment_date, method, status, reference_no, payment_proofs ( file_url, verification_note ) )')
      .eq('invoice_id', id)

    const payList: Payment[] = (allocs ?? [])
      .map((a: any) => a.payments)
      .filter(Boolean)

    setPayments(payList)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusUpdate() {
    if (!invoice || newStatus === invoice.status) return
    setStatusUpdating(true)
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id)
    await fetchData()
    setStatusUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-500">{error ?? 'Ralat tidak diketahui.'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-400 underline mt-2">Kembali</button>
      </div>
    )
  }

  const net = invoice.total_amount - invoice.discount_amount
  const waPhone = invoice.guardians?.phone.replace(/^0/, '') ?? ''

  function openWA() {
    const payLink = `${window.location.origin}/parent/bayar/${invoice!.id}`
    const msg = `Assalamualaikum ${invoice!.guardians?.full_name ?? ''},\n\nYuran ${MONTHS[invoice!.invoice_month - 1]} ${invoice!.invoice_year} bagi *${invoice!.students?.full_name ?? 'anak anda'}* berjumlah *RM ${net.toFixed(2)}* masih belum diselesaikan.\n\nSila akses portal ibu bapa untuk membuat bayaran:\n${payLink}\n\nTerima kasih.\n— SRITI`
    window.open(`https://wa.me/60${waPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{invoice.invoice_no}</h2>
          <p className="text-sm text-gray-500">{MONTHS[invoice.invoice_month - 1]} {invoice.invoice_year}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${STATUS_STYLE[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
      </div>

      {/* ── JUMLAH CARD ── */}
      <div className="rounded-2xl p-5 text-white" style={{ backgroundColor: '#1B4332' }}>
        <p className="text-green-300 text-xs font-medium mb-1">Jumlah Invois</p>
        <p className="text-3xl font-black">RM {net.toFixed(2)}</p>
        {invoice.discount_amount > 0 && (
          <p className="text-green-300 text-xs mt-1">
            Diskaun RM {invoice.discount_amount.toFixed(2)} dikenakan
          </p>
        )}
        <p className="text-green-300 text-xs mt-3">
          Dijana pada {new Date(invoice.created_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── PELAJAR & WARIS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {/* Pelajar */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Pelajar</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {invoice.students?.full_name ?? '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.students?.student_no}
              {invoice.students?.classes?.name && ` · ${invoice.students.classes.name}`}
              {invoice.students?.year_level && ` · Tahun ${invoice.students.year_level}`}
            </p>
          </div>
          {invoice.students && (
            <button
              onClick={() => router.push(`/dashboard/pelajar/${invoice.students!.id}`)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              Profil
            </button>
          )}
        </div>

        {/* Waris */}
        {invoice.guardians ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <User size={16} style={{ color: '#1B4332' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Waris</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{invoice.guardians.full_name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone size={10} /> {invoice.guardians.phone}
                </span>
                {invoice.guardians.email && (
                  <span className="text-xs text-gray-400">{invoice.guardians.email}</span>
                )}
              </div>
            </div>
            {invoice.status !== 'paid' && (
              <button
                onClick={openWA}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition active:scale-95"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle size={13} /> WA
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400">Waris — tiada maklumat</p>
          </div>
        )}
      </div>

      {/* ── KEMASKINI STATUS ── */}
      {invoice.status !== 'paid' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Kemaskini Status</p>
          <div className="flex gap-2">
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:border-green-700 transition"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={statusUpdating || newStatus === invoice.status}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
              style={{ backgroundColor: '#1B4332' }}
            >
              {statusUpdating ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* ── SEJARAH BAYARAN ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Sejarah Bayaran</p>
          {invoice.status === 'paid' && (
            <button
              onClick={() => router.push(`/resit/${invoice.id}`)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              style={{ color: '#1B4332', border: '1px solid #1B4332' }}
            >
              <Receipt size={13} /> Lihat Resit
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Clock size={24} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Tiada rekod bayaran</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map(pay => (
              <div key={pay.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">RM {pay.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pay.payment_date} · {METHOD_LABEL[pay.method] ?? pay.method}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAY_STATUS_STYLE[pay.status] ?? 'bg-gray-50 text-gray-500'}`}>
                    {PAY_STATUS_LABEL[pay.status] ?? pay.status}
                  </span>
                </div>
                {pay.reference_no && (
                  <p className="text-xs text-gray-400 font-mono">Ref: {pay.reference_no}</p>
                )}
                {pay.payment_proofs?.[0]?.file_url && (
                  <a
                    href={pay.payment_proofs[0].file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium underline"
                    style={{ color: '#1B4332' }}
                  >
                    Lihat Bukti Bayaran ↗
                  </a>
                )}
                {pay.payment_proofs?.[0]?.verification_note && (
                  <div className={`px-3 py-2 rounded-lg text-xs ${pay.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    📝 {pay.payment_proofs[0].verification_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
