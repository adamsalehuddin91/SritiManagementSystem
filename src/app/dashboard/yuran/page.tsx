'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, CheckCircle, Clock, AlertCircle, FileText, Eye, Users, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import JanaInvoisModal from './JanaInvoisModal'
import JanaBulkModal from './JanaBulkModal'
import VerifyModal from './VerifyModal'

interface Invoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
  students: { full_name: string; student_no: string; status: string } | null
  guardians: { full_name: string; phone: string } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  status: string
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

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const statusStyle: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
}

const statusLabel: Record<string, string> = {
  paid: 'Dibayar', pending: 'Pending', overdue: 'Tertunggak',
  draft: 'Draf', sent: 'Dihantar', success: 'Berjaya', rejected: 'Ditolak',
}

const methodLabel: Record<string, string> = {
  manual_transfer: 'Manual', fpx: 'FPX', qr: 'QR', cash: 'Tunai',
}

type Tab = 'invois' | 'verify'

export default function YuranPage() {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('invois')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1))
  const [yearFilter] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [showJana, setShowJana] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [verifyPayment, setVerifyPayment] = useState<Payment | null>(null)
  const schoolIdRef = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    if (!schoolIdRef.current) {
      const { data } = await supabase.rpc('get_user_school_id')
      schoolIdRef.current = data
    }

    const [{ data: inv }, { data: pay }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status, students(full_name, student_no, status), guardians(full_name, phone)')
        .order('invoice_year', { ascending: false })
        .order('invoice_month', { ascending: false }),
      supabase
        .from('payments')
        .select('id, amount, payment_date, method, status, reference_no, guardians(full_name), payment_proofs(id, file_url), payment_allocations(invoice_id, amount, invoices(invoice_no, invoice_month, invoice_year, students(full_name, student_no, classes(name))))')
        .order('created_at', { ascending: false }),
    ])

    setInvoices(inv ?? [])
    setPayments(pay ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredInvoices = invoices.filter(inv => {
    if (inv.students?.status === 'inactive') return false
    const matchSearch = !search ||
      inv.students?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_no.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || inv.status === statusFilter
    const matchMonth = !monthFilter || String(inv.invoice_month) === monthFilter
    const matchYear = !yearFilter || String(inv.invoice_year) === yearFilter
    return matchSearch && matchStatus && matchMonth && matchYear
  })

  const pendingVerify = payments.filter(p => p.status === 'pending' && p.payment_proofs.length > 0)

  // Stats — exclude inactive students
  const activeInvoices = invoices.filter(i => i.students?.status !== 'inactive')
  const totalKutipan = activeInvoices
    .filter(i => i.status === 'paid' && String(i.invoice_month) === monthFilter)
    .reduce((s, i) => s + i.total_amount - i.discount_amount, 0)
  const totalPending = activeInvoices.filter(i => i.status === 'pending' && String(i.invoice_month) === monthFilter).length
  const totalOverdue = activeInvoices.filter(i => i.status === 'overdue').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Yuran & Bayaran</h2>
          <p className="text-sm text-gray-500 mt-0.5">{MONTHS[Number(monthFilter) - 1]} {yearFilter}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition active:scale-95"
          >
            <Users size={16} /> Jana Semua
          </button>
          <button
            onClick={() => setShowJana(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition active:scale-95"
            style={{ backgroundColor: '#1B4332' }}
          >
            <Plus size={16} /> Jana Invois
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center mb-2">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">RM {totalKutipan.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Kutipan Bulan Ini</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center mb-2">
            <Clock size={16} className="text-yellow-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{totalPending}</p>
          <p className="text-xs text-gray-500 mt-0.5">Belum Bayar</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-2">
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-lg font-bold text-gray-900">{totalOverdue}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tertunggak</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['invois', 'Senarai Invois'], ['verify', `Verify Bukti${pendingVerify.length > 0 ? ` (${pendingVerify.length})` : ''}`]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Invois */}
      {tab === 'invois' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex-1 min-w-48">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari nama atau no. invois..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-full"
              />
            </div>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none"
            >
              <option value="">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="sent">Dihantar</option>
              <option value="pending">Pending</option>
              <option value="paid">Dibayar</option>
              <option value="overdue">Tertunggak</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <FileText size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Tiada invois dijumpai</p>
                <p className="text-xs text-gray-400 mt-1">Jana invois baru atau tukar filter</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50/50 border-b border-gray-50">
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">No. Invois</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Pelajar</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Bulan</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Jumlah</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Waris</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => router.push(`/dashboard/yuran/invois/${inv.id}`)}
                              className="text-sm font-mono text-gray-500 hover:text-green-700 hover:underline transition text-left"
                            >
                              {inv.invoice_no}
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => router.push(`/dashboard/yuran/invois/${inv.id}`)}
                              className="text-left hover:opacity-70 transition"
                            >
                              <p className="text-sm font-medium text-gray-900">{inv.students?.full_name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{inv.students?.student_no}</p>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">
                            RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[inv.status]}`}>
                              {statusLabel[inv.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {inv.guardians && inv.status !== 'paid' ? (
                              <button
                                onClick={() => {
                                  const net = inv.total_amount - inv.discount_amount
                                  const payLink = `${window.location.origin}/parent/bayar/${inv.id}`
                                  const msg = `Assalamualaikum ${inv.guardians!.full_name},\n\nYuran ${MONTHS[inv.invoice_month - 1]} ${inv.invoice_year} bagi *${inv.students?.full_name ?? 'anak anda'}* berjumlah *RM ${net.toFixed(2)}* masih belum diselesaikan.\n\nSila akses portal ibu bapa untuk membuat bayaran:\n${payLink}\n\nTerima kasih.\n— SRITI`
                                  window.open(`https://wa.me/60${inv.guardians!.phone.replace(/^0/, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                                }}
                                className="flex items-center gap-1 text-xs font-medium hover:underline"
                                style={{ color: '#25D366' }}
                              >
                                <MessageCircle size={12} /> WA {inv.guardians.full_name.split(' ')[0]}
                              </button>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {inv.status === 'paid' ? (
                              <button
                                onClick={() => router.push(`/resit/${inv.id}`)}
                                className="text-green-700 hover:text-green-900 transition"
                                title="Lihat Resit"
                              >
                                <Eye size={16} />
                              </button>
                            ) : (
                              <Eye size={16} className="text-gray-200 cursor-not-allowed" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredInvoices.map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => router.push(`/dashboard/yuran/invois/${inv.id}`)}
                      className="w-full px-4 py-3.5 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inv.students?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {inv.invoice_no} · {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">RM {(inv.total_amount - inv.discount_amount).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[inv.status]}`}>
                            {statusLabel[inv.status]}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Verify */}
      {tab === 'verify' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {pendingVerify.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle size={22} className="text-green-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">Semua bukti bayaran telah disemak</p>
              <p className="text-xs text-gray-400 mt-1">Tiada bukti bayaran yang menunggu</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingVerify.map(pay => {
                const student = pay.payment_allocations?.[0]?.invoices?.students
                const inv = pay.payment_allocations?.[0]?.invoices
                return (
                  <div key={pay.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1B4332' }}>
                        {student?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{student?.full_name ?? pay.guardians?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">
                          {inv ? `${MONTHS[inv.invoice_month - 1]} ${inv.invoice_year} · ` : ''}{pay.guardians?.full_name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">RM {pay.amount.toFixed(2)} · {methodLabel[pay.method]} · {pay.payment_date}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setVerifyPayment(pay)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition flex-shrink-0 ml-3"
                      style={{ backgroundColor: '#1B4332' }}
                    >
                      <Eye size={13} /> Semak
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showJana && (
        <JanaInvoisModal
          onClose={() => setShowJana(false)}
          onSuccess={() => { setShowJana(false); fetchData() }}
        />
      )}
      {showBulk && (
        <JanaBulkModal
          onClose={() => setShowBulk(false)}
          onSuccess={() => { setShowBulk(false); fetchData() }}
        />
      )}
      {verifyPayment && (
        <VerifyModal
          payment={verifyPayment}
          onClose={() => setVerifyPayment(null)}
          onSuccess={() => { setVerifyPayment(null); fetchData() }}
        />
      )}
    </div>
  )
}
