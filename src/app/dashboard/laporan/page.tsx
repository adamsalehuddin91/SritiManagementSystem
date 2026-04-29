'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle } from 'lucide-react'

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

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(String)

export default function LaporanPage() {
  const supabase = useRef(createClient()).current
  const [tab, setTab] = useState('kutipan')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR))

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status, students(full_name, student_no, status), guardians(full_name, phone)')
      .eq('invoice_year', Number(yearFilter))
      .order('invoice_month', { ascending: true })
    setInvoices((data ?? []) as unknown as Invoice[])
    setLoading(false)
  }, [supabase, yearFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const net = (inv: Invoice) => inv.total_amount - inv.discount_amount

  const activeInvoices = invoices.filter(i => i.students?.status !== 'inactive')

  // Kutipan stats
  const totalDijana = activeInvoices.reduce((s, i) => s + net(i), 0)
  const totalDibayar = activeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + net(i), 0)
  const totalBaki = totalDijana - totalDibayar
  const peratusKutipan = totalDijana > 0 ? (totalDibayar / totalDijana) * 100 : 0

  // Monthly breakdown
  const monthly = MONTHS.map((label, idx) => {
    const month = idx + 1
    const rows = activeInvoices.filter(i => i.invoice_month === month)
    const dijana = rows.reduce((s, i) => s + net(i), 0)
    const dibayar = rows.filter(i => i.status === 'paid').reduce((s, i) => s + net(i), 0)
    return { label, dijana, dibayar, baki: dijana - dibayar }
  })

  // Tunggakan
  const tunggakan = activeInvoices.filter(inv => ['pending', 'overdue', 'sent'].includes(inv.status))

  const statusStyle: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
    sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  }
  const statusLabel: Record<string, string> = {
    pending: 'Pending', overdue: 'Tertunggak', sent: 'Dihantar',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ringkasan kutipan yuran dan tunggakan</p>
        </div>
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#0B4233] shadow-sm"
        >
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'kutipan', label: 'Kutipan Yuran' },
            { key: 'tunggakan', label: 'Tunggakan' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                tab === key
                  ? 'border-[#0B4233] text-[#0B4233]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── TAB: Kutipan Yuran ── */}
          {tab === 'kutipan' && (
            <div className="space-y-5">

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 font-medium">Kutipan</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">RM {totalDibayar.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 font-medium">Dijana</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">RM {totalDijana.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 font-medium">Peratus Kutipan</p>
                  <p className="text-xl font-bold text-orange-500 mt-1">{peratusKutipan.toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 font-medium">Tunggakan</p>
                  <p className="text-xl font-bold text-red-500 mt-1">RM {totalBaki.toFixed(2)}</p>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-900">Pecahan Bulanan {yearFilter}</p>
                </div>

                {invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-sm text-gray-400">Tiada invois untuk tahun {yearFilter}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/60 border-b border-gray-100">
                            <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 w-20">Bulan</th>
                            <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Dijana (RM)</th>
                            <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Dibayar (RM)</th>
                            <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Baki (RM)</th>
                            <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 w-40">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {monthly.map(({ label, dijana, dibayar, baki }) => {
                            const pct = dijana > 0 ? (dibayar / dijana) * 100 : 0
                            const isEmpty = dijana === 0
                            return (
                              <tr key={label} className={isEmpty ? 'opacity-40' : 'hover:bg-gray-50/50 transition-colors'}>
                                <td className="px-5 py-3 text-sm font-medium text-gray-700">{label}</td>
                                <td className="px-5 py-3 text-sm text-right text-gray-600">{isEmpty ? '—' : dijana.toFixed(2)}</td>
                                <td className="px-5 py-3 text-sm font-semibold text-right text-emerald-600">{isEmpty ? '—' : dibayar.toFixed(2)}</td>
                                <td className="px-5 py-3 text-sm text-right text-red-500">{isEmpty ? '—' : baki.toFixed(2)}</td>
                                <td className="px-5 py-3">
                                  {!isEmpty && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-emerald-500 transition-all"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50/60 border-t border-gray-100 font-semibold">
                            <td className="px-5 py-3 text-sm text-gray-700">Jumlah</td>
                            <td className="px-5 py-3 text-sm text-right text-gray-700">{totalDijana.toFixed(2)}</td>
                            <td className="px-5 py-3 text-sm text-right text-emerald-600">{totalDibayar.toFixed(2)}</td>
                            <td className="px-5 py-3 text-sm text-right text-red-500">{totalBaki.toFixed(2)}</td>
                            <td className="px-5 py-3 text-sm text-gray-400">{peratusKutipan.toFixed(1)}% kutipan</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-50">
                      {monthly.filter(m => m.dijana > 0).map(({ label, dijana, dibayar, baki }) => {
                        const pct = dijana > 0 ? (dibayar / dijana) * 100 : 0
                        return (
                          <div key={label} className="px-4 py-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-700">{label} {yearFilter}</p>
                              <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Dijana: <span className="font-medium text-gray-700">RM {dijana.toFixed(2)}</span></span>
                              <span>Dibayar: <span className="font-medium text-emerald-600">RM {dibayar.toFixed(2)}</span></span>
                              <span>Baki: <span className="font-medium text-red-500">RM {baki.toFixed(2)}</span></span>
                            </div>
                          </div>
                        )
                      })}
                      {monthly.every(m => m.dijana === 0) && (
                        <div className="py-12 text-center text-sm text-gray-400">Tiada invois untuk tahun {yearFilter}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Tunggakan ── */}
          {tab === 'tunggakan' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {tunggakan.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                    <CheckCircle size={22} className="text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Tiada tunggakan</p>
                  <p className="text-xs text-gray-400 mt-1">Semua invois telah dibayar</p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-50">
                          <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Pelajar</th>
                          <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Invois</th>
                          <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Bulan</th>
                          <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Jumlah</th>
                          <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                          <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Waris</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tunggakan.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-gray-900">{inv.students?.full_name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{inv.students?.student_no}</p>
                            </td>
                            <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{inv.invoice_no}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-700">
                              {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">
                              RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[inv.status]}`}>
                                {statusLabel[inv.status]}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {inv.guardians?.phone ? (
                                <a
                                  href={`https://wa.me/60${inv.guardians.phone.replace(/^0/, '')}?text=Assalamualaikum%20${encodeURIComponent(inv.guardians.full_name)}%2C%20invois%20yuran%20${encodeURIComponent(inv.invoice_no)}%20bagi%20${encodeURIComponent(MONTHS[inv.invoice_month - 1])}%20${inv.invoice_year}%20masih%20belum%20dijelaskan.%20Mohon%20segera%20layari%20portal%20ibu%20bapa%20untuk%20membuat%20bayaran.%20Terima%20kasih.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-700 hover:underline font-medium"
                                >
                                  WA {inv.guardians.full_name}
                                </a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden divide-y divide-gray-50">
                    {tunggakan.map(inv => (
                      <div key={inv.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{inv.students?.full_name ?? '—'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {inv.invoice_no} · {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                            </p>
                            {inv.guardians?.phone && (
                              <a
                                href={`https://wa.me/60${inv.guardians.phone.replace(/^0/, '')}?text=Assalamualaikum%20${encodeURIComponent(inv.guardians.full_name)}%2C%20invois%20yuran%20${encodeURIComponent(inv.invoice_no)}%20masih%20belum%20dijelaskan.%20Mohon%20layari%20portal%20ibu%20bapa%20untuk%20membuat%20bayaran.%20Terima%20kasih.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-700 font-medium mt-1 inline-block"
                              >
                                WA {inv.guardians.full_name} →
                              </a>
                            )}
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            <p className="text-sm font-bold text-gray-900">RM {(inv.total_amount - inv.discount_amount).toFixed(2)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[inv.status]}`}>
                              {statusLabel[inv.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
