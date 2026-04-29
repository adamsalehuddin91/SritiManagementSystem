'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, Clock, XCircle, MessageCircle, Copy, Check,
  ChevronDown, AlertTriangle, Users, Wallet, TrendingUp
} from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

interface StudentRow {
  id: string
  full_name: string
  student_no: string
  year_level: number
  class_name: string | null
  guardian_name: string | null
  guardian_phone: string | null
  invoice_id: string | null
  invoice_status: string | null
  invoice_amount: number | null
}

interface TunggakanRow {
  id: string
  full_name: string
  student_no: string
  class_name: string | null
  guardian_phone: string | null
  months: { month: number; year: number; amount: number; status: string }[]
}

type Tab = 'bulanan' | 'tunggakan'

export default function TrackerPage() {
  const supabase = createClient()
  const schoolIdRef = useRef<string | null>(null)

  const now = new Date()
  const [tab, setTab] = useState<Tab>('bulanan')
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<StudentRow[]>([])
  const [tunggakan, setTunggakan] = useState<TunggakanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Get school_id once
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('school_id').eq('id', user.id).single()
      schoolIdRef.current = data?.school_id ?? null
      fetchAll()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAll = useCallback(async () => {
    const schoolId = schoolIdRef.current
    if (!schoolId) return
    setLoading(true)

    // Fetch students + guardians
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, student_no, year_level, class_id, classes(name), student_guardians(guardians(full_name, phone))')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .order('year_level')
      .order('full_name')

    // Fetch invoices for selected month
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, student_id, status, total_amount')
      .eq('school_id', schoolId)
      .eq('invoice_month', selMonth)
      .eq('invoice_year', selYear)

    // Fetch last 6 months invoices for tunggakan
    const sixMonthsAgo = new Date(selYear, selMonth - 7, 1)
    const { data: oldInvoices } = await supabase
      .from('invoices')
      .select('id, student_id, status, total_amount, invoice_month, invoice_year')
      .eq('school_id', schoolId)
      .neq('status', 'paid')
      .gte('invoice_year', sixMonthsAgo.getFullYear())
      .order('invoice_year')
      .order('invoice_month')

    // Build invoice map
    const invoiceMap = new Map<string, { id: string; status: string; amount: number }>()
    for (const inv of invoices ?? []) {
      invoiceMap.set(inv.student_id, { id: inv.id, status: inv.status, amount: inv.total_amount })
    }

    // Build rows
    const built: StudentRow[] = (students ?? []).map(s => {
      const sg = (s.student_guardians as { guardians: { full_name: string; phone: string } | null }[] | null)?.[0]
      const inv = invoiceMap.get(s.id)
      return {
        id: s.id,
        full_name: s.full_name,
        student_no: s.student_no,
        year_level: s.year_level,
        class_name: (s.classes as { name: string } | null)?.name ?? null,
        guardian_name: sg?.guardians?.full_name ?? null,
        guardian_phone: sg?.guardians?.phone ?? null,
        invoice_id: inv?.id ?? null,
        invoice_status: inv?.status ?? null,
        invoice_amount: inv?.amount ?? null,
      }
    })
    setRows(built)

    // Build tunggakan — group old unpaid by student
    const tMap = new Map<string, TunggakanRow>()
    for (const inv of oldInvoices ?? []) {
      if (!tMap.has(inv.student_id)) {
        const stu = (students ?? []).find(s => s.id === inv.student_id)
        if (!stu) continue
        const sg = (stu.student_guardians as { guardians: { full_name: string; phone: string } | null }[] | null)?.[0]
        tMap.set(inv.student_id, {
          id: stu.id,
          full_name: stu.full_name,
          student_no: stu.student_no,
          class_name: (stu.classes as { name: string } | null)?.name ?? null,
          guardian_phone: sg?.guardians?.phone ?? null,
          months: [],
        })
      }
      tMap.get(inv.student_id)!.months.push({
        month: inv.invoice_month,
        year: inv.invoice_year,
        amount: inv.total_amount,
        status: inv.status,
      })
    }

    // Only show students with 2+ unpaid months
    const tRows = Array.from(tMap.values())
      .filter(r => r.months.length >= 2)
      .sort((a, b) => b.months.length - a.months.length)
    setTunggakan(tRows)

    setLoading(false)
  }, [supabase, selMonth, selYear])

  useEffect(() => {
    if (schoolIdRef.current) fetchAll()
  }, [fetchAll, selMonth, selYear])

  // Stats
  const totalPelajar = rows.length
  const sudahBayar = rows.filter(r => r.invoice_status === 'paid').length
  const belumBayar = rows.filter(r => r.invoice_status !== 'paid').length
  const jumlahKutipan = rows.filter(r => r.invoice_status === 'paid').reduce((s, r) => s + (r.invoice_amount ?? 0), 0)
  const unpaidRows = rows.filter(r => r.invoice_status !== 'paid' && r.invoice_id)

  // Group by class
  const byClass = Array.from(
    rows.reduce((map, r) => {
      const key = r.class_name ?? `Tahun ${r.year_level}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
      return map
    }, new Map<string, StudentRow[]>())
  ).sort(([a], [b]) => a.localeCompare(b))

  function openWA(phone: string, studentName: string, guardianName: string) {
    const clean = phone.replace(/\D/g, '').replace(/^0/, '60')
    const msg = encodeURIComponent(
      `Assalamualaikum ${guardianName},\n\nYuran ${MONTHS[selMonth - 1]} ${selYear} bagi *${studentName}* masih belum dijelaskan.\n\nSila semak portal ibu bapa untuk butiran lanjut.\n\nTerima kasih. 🙏`
    )
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }

  function copyAllNumbers() {
    const nums = unpaidRows
      .map(r => r.guardian_phone?.replace(/\D/g, '').replace(/^0/, '60'))
      .filter(Boolean)
      .join('\n')
    navigator.clipboard.writeText(nums)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function statusBadge(status: string | null) {
    if (status === 'paid') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200"><CheckCircle2 size={11} /> Bayar</span>
    if (status === 'pending') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200"><Clock size={11} /> Pending</span>
    if (status === 'sent') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock size={11} /> Dihantar</span>
    if (status === 'overdue') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle size={11} /> Tertunggak</span>
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-50 text-gray-500 border border-gray-200"><XCircle size={11} /> Tiada invois</span>
  }

  const yearOptions = [selYear - 1, selYear, selYear + 1]

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tracker Yuran</h1>
          <p className="text-xs text-gray-400 mt-0.5">Pantau status bayaran pelajar secara real-time</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
          <button
            onClick={() => setTab('bulanan')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'bulanan' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setTab('tunggakan')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${tab === 'tunggakan' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tunggakan
            {tunggakan.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {tunggakan.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============ TAB: BULANAN ============ */}
      {tab === 'bulanan' && (
        <>
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
              {MONTHS.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setSelMonth(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selMonth === i + 1 ? 'text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={selMonth === i + 1 ? { backgroundColor: '#0B4233' } : {}}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="relative">
              <select
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 outline-none appearance-none pr-8 shadow-sm"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-500">Jumlah Pelajar</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalPelajar}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-xs text-green-700">Sudah Bayar</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{sudahBayar}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalPelajar > 0 ? Math.round(sudahBayar / totalPelajar * 100) : 0}%</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={14} className="text-red-500" />
                  <p className="text-xs text-red-600">Belum Bayar</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{belumBayar}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalPelajar > 0 ? Math.round(belumBayar / totalPelajar * 100) : 0}%</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-500">Kutipan</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">RM {jumlahKutipan.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}</p>
              </div>
            </div>
          )}

          {/* WA Blast Bar */}
          {!loading && unpaidRows.length > 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800">
                  {unpaidRows.length} pelajar belum bayar {MONTHS[selMonth - 1]} {selYear}
                </p>
              </div>
              <button
                onClick={copyAllNumbers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Disalin!' : 'Salin Semua Nombor'}
              </button>
            </div>
          )}

          {/* Table by class */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {byClass.map(([className, classRows]) => {
                const classPaid = classRows.filter(r => r.invoice_status === 'paid').length
                return (
                  <div key={className} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Class header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50" style={{ backgroundColor: '#F0F7F4' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{className}</span>
                        <span className="text-xs text-gray-500">({classRows.length} pelajar)</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#0B4233' }}>
                        {classPaid}/{classRows.length} bayar
                      </span>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-50">
                            <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Pelajar</th>
                            <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Penjaga</th>
                            <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Status</th>
                            <th className="text-right text-xs font-semibold text-gray-400 px-4 py-2.5">Amaun</th>
                            <th className="text-center text-xs font-semibold text-gray-400 px-4 py-2.5">WA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {classRows.map(r => (
                            <tr key={r.id} className={`transition-colors ${r.invoice_status === 'paid' ? 'bg-white' : 'bg-red-50/30 hover:bg-red-50/50'}`}>
                              <td className="px-4 py-2.5">
                                <p className="text-sm font-medium text-gray-900">{r.full_name}</p>
                                <p className="text-xs text-gray-400 font-mono">{r.student_no}</p>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">{r.guardian_name ?? '—'}</td>
                              <td className="px-4 py-2.5">{statusBadge(r.invoice_status)}</td>
                              <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-700">
                                {r.invoice_amount ? `RM ${r.invoice_amount.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {r.invoice_status !== 'paid' && r.guardian_phone ? (
                                  <button
                                    onClick={() => openWA(r.guardian_phone!, r.full_name, r.guardian_name ?? 'Penjaga')}
                                    className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition"
                                    title="Hantar WA reminder"
                                  >
                                    <MessageCircle size={15} />
                                  </button>
                                ) : (
                                  <span className="text-gray-200">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-50">
                      {classRows.map(r => (
                        <div key={r.id} className={`flex items-center justify-between px-4 py-3 ${r.invoice_status !== 'paid' ? 'bg-red-50/30' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.full_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.guardian_name ?? '—'}</p>
                            <div className="mt-1">{statusBadge(r.invoice_status)}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <p className="text-sm font-semibold text-gray-700">
                              {r.invoice_amount ? `RM${r.invoice_amount.toFixed(0)}` : '—'}
                            </p>
                            {r.invoice_status !== 'paid' && r.guardian_phone && (
                              <button
                                onClick={() => openWA(r.guardian_phone!, r.full_name, r.guardian_name ?? 'Penjaga')}
                                className="p-2 rounded-xl bg-green-50 text-green-600"
                              >
                                <MessageCircle size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ============ TAB: TUNGGAKAN ============ */}
      {tab === 'tunggakan' && (
        <>
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <TrendingUp size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">
              Pelajar berikut mempunyai <span className="font-bold">2 bulan atau lebih</span> yuran yang belum dijelaskan dalam tempoh 6 bulan terakhir.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : tunggakan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
              <CheckCircle2 size={32} className="text-green-400 mb-3" />
              <p className="text-sm font-medium text-gray-600">Tiada pelajar dengan tunggakan berbilang bulan</p>
              <p className="text-xs text-gray-400 mt-1">Semua pelajar dalam keadaan bayaran yang baik</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Pelajar</th>
                      <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Kelas</th>
                      <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Bulan Tertunggak</th>
                      <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Jumlah Tertunggak</th>
                      <th className="text-center text-xs font-semibold text-gray-400 px-4 py-3">WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tunggakan.map(r => {
                      const total = r.months.reduce((s, m) => s + m.amount, 0)
                      return (
                        <tr key={r.id} className="hover:bg-red-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{r.full_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{r.student_no}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{r.class_name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {r.months.map((m, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200"
                                >
                                  {MONTHS[m.month - 1]} {m.year}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-sm font-bold text-red-600">RM {total.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{r.months.length} bulan</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.guardian_phone ? (
                              <button
                                onClick={() => {
                                  const clean = r.guardian_phone!.replace(/\D/g, '').replace(/^0/, '60')
                                  const monthList = r.months.map(m => `${MONTHS[m.month - 1]} ${m.year}`).join(', ')
                                  const msg = encodeURIComponent(
                                    `Assalamualaikum,\n\nYuran *${r.full_name}* masih belum dijelaskan bagi bulan: *${monthList}*.\n\nJumlah tertunggak: *RM ${r.months.reduce((s, m) => s + m.amount, 0).toFixed(2)}*\n\nSila hubungi pihak sekolah untuk urusan selanjutnya. Terima kasih. 🙏`
                                  )
                                  window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
                                }}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition"
                              >
                                <MessageCircle size={15} />
                              </button>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {tunggakan.map(r => {
                  const total = r.months.reduce((s, m) => s + m.amount, 0)
                  return (
                    <div key={r.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.full_name}</p>
                          <p className="text-xs text-gray-400">{r.class_name ?? '—'} · {r.student_no}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">RM {total.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{r.months.length} bulan</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.months.map((m, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                            {MONTHS[m.month - 1]} {m.year}
                          </span>
                        ))}
                      </div>
                      {r.guardian_phone && (
                        <button
                          onClick={() => {
                            const clean = r.guardian_phone!.replace(/\D/g, '').replace(/^0/, '60')
                            const monthList = r.months.map(m => `${MONTHS[m.month - 1]} ${m.year}`).join(', ')
                            const msg = encodeURIComponent(
                              `Assalamualaikum,\n\nYuran *${r.full_name}* masih belum dijelaskan bagi bulan: *${monthList}*.\n\nJumlah: *RM ${r.months.reduce((s, m) => s + m.amount, 0).toFixed(2)}*\n\nTerima kasih. 🙏`
                            )
                            window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-semibold w-full justify-center"
                        >
                          <MessageCircle size={13} /> Hantar WA Reminder
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
