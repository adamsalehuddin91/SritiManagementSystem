'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Trash2, Users, ChevronRight, Pencil, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import TambahPelajarModal from './TambahPelajarModal'
import NaikTahunModal from './NaikTahunModal'

interface Student {
  id: string
  student_no: string
  full_name: string
  mykid_no: string | null
  gender: string | null
  year_level: number
  status: string
  classes: { name: string } | null
}

export default function PelajarPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showNaikTahun, setShowNaikTahun] = useState(false)
  const [undoToast, setUndoToast] = useState<{ student: Student; countdown: number } | null>(null)
  const supabase = createClient()
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, student_no, full_name, mykid_no, gender, year_level, status, classes(name)')
      .eq('status', 'active')
      .order('year_level')
      .order('full_name')

    setStudents((data ?? []) as Student[])
    setFiltered((data ?? []) as Student[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  useEffect(() => {
    let result = students
    if (search) {
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_no.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (yearFilter) {
      result = result.filter(s => String(s.year_level) === yearFilter)
    }
    setFiltered(result)
  }, [search, yearFilter, students])

  const statusStyle = (status: string) =>
    status === 'active'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-gray-50 text-gray-500 border border-gray-200'

  // Stats computed from real data
  const totalPelajar = students.length
  const jumlahLelaki = students.filter(s => s.gender === 'L').length
  const jumlahPerempuan = students.filter(s => s.gender === 'P').length
  const uniqueKelas = new Set(students.map(s => s.classes?.name).filter(Boolean)).size
  const byYear = [1,2,3,4,5,6].map(y => ({ year: y, count: students.filter(s => s.year_level === y).length }))
  const YEAR_COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#f97316']

  function handleDelete(student: Student) {
    // Clear any in-flight delete
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    // Optimistic removal
    setStudents(prev => prev.filter(s => s.id !== student.id))

    let remaining = 5
    setUndoToast({ student, countdown: remaining })

    countdownRef.current = setInterval(() => {
      remaining -= 1
      setUndoToast(t => t ? { ...t, countdown: remaining } : null)
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
      }
    }, 1000)

    deleteTimerRef.current = setTimeout(async () => {
      await supabase.from('students').update({ status: 'inactive' }).eq('id', student.id)
      setUndoToast(null)
    }, 5000)
  }

  function handleUndo() {
    if (!undoToast) return
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    // Restore student back into list in sorted position
    setStudents(prev => {
      const restored = [...prev, undoToast.student]
      return restored.sort((a, b) =>
        a.year_level !== b.year_level
          ? a.year_level - b.year_level
          : a.full_name.localeCompare(b.full_name)
      )
    })
    setUndoToast(null)
  }

  return (
    <div className="space-y-4">

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 w-full sm:w-72 shadow-sm">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari nama atau no. IC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none flex-1 sm:flex-none"
          >
            <option value="">Semua Tahun</option>
            {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
          <button
            onClick={() => setShowNaikTahun(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm whitespace-nowrap border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            <GraduationCap size={16} /> Naik Tahun
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition active:scale-95 shadow-sm whitespace-nowrap"
            style={{ backgroundColor: '#0B4233' }}
          >
            <Plus size={16} /> Tambah Pelajar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <Users size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Tiada pelajar dijumpai</p>
            <p className="text-xs text-gray-400 mt-1">Cuba ubah carian atau tambah pelajar baru</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5 w-12">#</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5">Nama Pelajar</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5">No. MyKid / IC</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5">Tahun</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5">Kelas</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2.5">Status</th>
                    <th className="text-center text-xs font-semibold text-gray-600 px-4 py-2.5">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s, index) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                      <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{index + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{s.student_no}</p>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{s.mykid_no ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">Tahun {s.year_level}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{s.classes?.name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-3 py-1 rounded-full font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                          Aktif
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-3">
                          <Link href={`/dashboard/pelajar/${s.id}`} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition">
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(s => (
                <Link
                  key={s.id}
                  href={`/dashboard/pelajar/${s.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: '#1B4332' }}
                    >
                      {s.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.mykid_no ?? s.student_no} · Tahun {s.year_level} · {s.classes?.name ?? '—'}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-500 rounded-l-xl" />
              <p className="text-xs text-gray-500 font-medium mb-1">Jumlah Pelajar</p>
              <h3 className="text-3xl font-bold text-gray-900">{totalPelajar}</h3>
              <p className="text-xs text-gray-400 mt-1">Pelajar aktif</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Lelaki</p>
              <h3 className="text-3xl font-bold text-[#1e3a8a]">{jumlahLelaki}</h3>
              <p className="text-xs text-gray-400 mt-1">{totalPelajar > 0 ? Math.round(jumlahLelaki/totalPelajar*100) : 0}%</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Perempuan</p>
              <h3 className="text-3xl font-bold text-[#ef4444]">{jumlahPerempuan}</h3>
              <p className="text-xs text-gray-400 mt-1">{totalPelajar > 0 ? Math.round(jumlahPerempuan/totalPelajar*100) : 0}%</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Kelas</p>
              <h3 className="text-3xl font-bold text-gray-900">{uniqueKelas}</h3>
              <p className="text-xs text-gray-400 mt-1">kelas aktif</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <p className="text-sm font-bold text-gray-900 mb-3">Pelajar Mengikut Tahun</p>
              {totalPelajar > 0 ? (
                <div className="relative w-28 h-28 rounded-full mx-auto" style={{
                  background: `conic-gradient(${byYear.map((y, i) => {
                    const pct = (y.count / totalPelajar) * 100
                    const prev = byYear.slice(0, i).reduce((s, x) => s + (x.count / totalPelajar) * 100, 0)
                    return `${YEAR_COLORS[i]} ${prev.toFixed(1)}% ${(prev + pct).toFixed(1)}%`
                  }).join(', ')})`
                }}>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">{totalPelajar}</span>
                  </div>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
                  <span className="text-xs text-gray-400">Tiada data</span>
                </div>
              )}
            </div>
            <div className="text-xs space-y-1.5 flex-1 w-full">
              {byYear.filter(y => y.count > 0).map((y, i) => (
                <div key={y.year} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: YEAR_COLORS[i] }} />
                    <span className="text-gray-600">Tahun {y.year}</span>
                  </div>
                  <span className="font-medium text-gray-900">{y.count} ({totalPelajar > 0 ? Math.round(y.count/totalPelajar*100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TambahPelajarModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchStudents() }}
        />
      )}

      {showNaikTahun && (
        <NaikTahunModal
          onClose={() => setShowNaikTahun(false)}
          onSuccess={() => { setShowNaikTahun(false); fetchStudents() }}
        />
      )}

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl text-sm">
          <span className="text-gray-300">Dipadam:</span>
          <span className="font-semibold truncate max-w-[180px]">{undoToast.student.full_name}</span>
          <span className="text-gray-400 tabular-nums">{undoToast.countdown}s</span>
          <button
            onClick={handleUndo}
            className="ml-1 px-3 py-1 rounded-lg font-semibold text-xs transition active:scale-95"
            style={{ backgroundColor: '#22C55E', color: '#fff' }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
