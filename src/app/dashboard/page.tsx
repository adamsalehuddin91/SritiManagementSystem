'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
}
const statusLabel: Record<string, string> = {
  pending: 'Pending', success: 'Disahkan', rejected: 'Ditolak',
}
const methodLabel: Record<string, string> = {
  manual_transfer: 'Transfer', cash: 'Tunai', fpx: 'FPX', qr: 'QR',
}

interface RecentPayment {
  id: string
  amount: number
  method: string
  status: string
  created_at: string
  payment_allocations: {
    invoices: {
      students: { full_name: string; classes: { name: string } | null } | null
    } | null
  }[]
}

interface Stats {
  totalStudents: number
  kutipanBulanIni: number
  tunggakan: number
  pelajarBayar: number
  totalInvoisBulanIni: number
  pendingVerifikasi: number
}

export default function DashboardPage() {
  const supabase = useRef(createClient()).current
  const [adminName, setAdminName] = useState('Admin')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const todayStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${currentYear}`
  const greeting = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Tengah Hari' : 'Selamat Petang'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, school_id')
        .eq('id', user.id)
        .single()

      if (!profile?.school_id) { setLoading(false); return }

      setAdminName(profile.full_name?.split(' ')[0] ?? 'Admin')
      setSchoolId(profile.school_id)
      const sid = profile.school_id

      const [
        { count: totalStudents },
        { data: paidInvoices },
        { data: unpaidInvoices },
        { count: pendingVerifikasi },
        { data: payments },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true })
          .eq('school_id', sid).eq('status', 'active'),

        supabase.from('invoices').select('total_amount, discount_amount, student_id, students(status)')
          .eq('school_id', sid).eq('status', 'paid')
          .eq('invoice_month', currentMonth).eq('invoice_year', currentYear),

        supabase.from('invoices').select('total_amount, discount_amount, students(status)')
          .eq('school_id', sid).in('status', ['sent', 'pending', 'overdue']),

        supabase.from('payments').select('*', { count: 'exact', head: true })
          .eq('school_id', sid).eq('status', 'pending'),

        supabase.from('payments')
          .select('id, amount, method, status, created_at, payment_allocations(invoices(students(full_name, classes(name))))')
          .eq('school_id', sid)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const activePaid = (paidInvoices ?? []).filter((i: any) => i.students?.status !== 'inactive')
      const activeUnpaid = (unpaidInvoices ?? []).filter((i: any) => i.students?.status !== 'inactive')
      const kutipan = activePaid.reduce((s: number, i: any) => s + i.total_amount - i.discount_amount, 0)
      const tunggakan = activeUnpaid.reduce((s: number, i: any) => s + i.total_amount - i.discount_amount, 0)
      const uniquePaidStudents = new Set(activePaid.map((i: any) => i.student_id)).size

      setStats({
        totalStudents: totalStudents ?? 0,
        kutipanBulanIni: kutipan,
        tunggakan,
        pelajarBayar: uniquePaidStudents,
        totalInvoisBulanIni: (paidInvoices?.length ?? 0) + (unpaidInvoices?.length ?? 0),
        pendingVerifikasi: pendingVerifikasi ?? 0,
      })

      setRecentPayments((payments ?? []) as unknown as RecentPayment[])
      setLoading(false)
    }
    load()
  }, [supabase, currentMonth, currentYear])

  const collectionRate = stats && stats.totalStudents > 0
    ? Math.round((stats.pelajarBayar / stats.totalStudents) * 100)
    : 0

  const statCards = stats ? [
    {
      label: 'Jumlah Pelajar',
      value: stats.totalStudents.toString(),
      sub: 'Pelajar aktif',
      icon: Users, color: '#1B4332', bg: '#ECFDF5',
    },
    {
      label: 'Kutipan Bulan Ini',
      value: `RM ${stats.kutipanBulanIni.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`,
      sub: `${MONTHS[currentMonth - 1]} ${currentYear}`,
      icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4',
    },
    {
      label: 'Tunggakan',
      value: `RM ${stats.tunggakan.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`,
      sub: `${stats.totalStudents - stats.pelajarBayar} pelajar belum bayar`,
      icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2',
    },
    {
      label: 'Dah Bayar',
      value: stats.pelajarBayar.toString(),
      sub: `daripada ${stats.totalStudents} pelajar`,
      icon: CheckCircle, color: '#2563EB', bg: '#EFF6FF',
    },
  ] : []

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{greeting}, {adminName} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">{todayStr}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recent Payments */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Bayaran Terkini</h3>
                <Link href="/dashboard/yuran" className="text-xs font-medium" style={{ color: '#1B4332' }}>
                  Lihat semua →
                </Link>
              </div>
              {recentPayments.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-sm text-gray-400">Tiada bayaran lagi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentPayments.map(p => {
                    const student = p.payment_allocations?.[0]?.invoices?.students
                    const name = student?.full_name ?? '—'
                    const kelas = student?.classes?.name ?? '—'
                    const date = new Date(p.created_at)
                    const dateStr = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
                    return (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1B4332' }}>
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                            <p className="text-xs text-gray-400">{kelas} · {methodLabel[p.method] ?? p.method}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusStyle[p.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {statusLabel[p.status] ?? p.status}
                          </span>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-900">RM {p.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{dateStr}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">

              {/* Koleksi Progress */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Koleksi {MONTHS[currentMonth - 1]} {currentYear}</h3>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs text-gray-500">{stats?.pelajarBayar} / {stats?.totalStudents} pelajar</span>
                  <span className="text-xs font-semibold" style={{ color: '#1B4332' }}>{collectionRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${collectionRate}%`, backgroundColor: '#22C55E' }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{(stats?.totalStudents ?? 0) - (stats?.pelajarBayar ?? 0)} pelajar belum bayar</p>
              </div>

              {/* Pending Verification */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Perlu Disahkan</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.pendingVerifikasi ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">bukti bayaran menunggu semakan</p>
                <Link
                  href="/dashboard/yuran"
                  className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-white transition block text-center"
                  style={{ backgroundColor: '#1B4332' }}
                >
                  Semak Sekarang
                </Link>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
