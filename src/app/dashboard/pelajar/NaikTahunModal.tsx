'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, GraduationCap, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

interface Student {
  id: string
  full_name: string
  year_level: number
  student_no: string
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

type Step = 'preview' | 'confirm' | 'done'

const YEAR_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316']

export default function NaikTahunModal({ onClose, onSuccess }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<Step>('preview')
  const [result, setResult] = useState({ naik: 0, tamat: 0 })
  const supabase = createClient()

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, year_level, student_no')
        .eq('status', 'active')
        .order('year_level')
        .order('full_name')
      setStudents(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const byYear = [1, 2, 3, 4, 5, 6].map(y => ({
    year: y,
    students: students.filter(s => s.year_level === y),
  }))

  const naikStudents = students.filter(s => s.year_level < 6)
  const tamatStudents = students.filter(s => s.year_level === 6)

  async function handleConfirm() {
    setProcessing(true)
    try {
      // Naik tahun: 1→2, 2→3, 3→4, 4→5, 5→6
      // Process in reverse to avoid conflicts: 5→6 first, then 4→5, etc.
      for (let yr = 5; yr >= 1; yr--) {
        const ids = naikStudents.filter(s => s.year_level === yr).map(s => s.id)
        if (ids.length === 0) continue
        await supabase
          .from('students')
          .update({ year_level: yr + 1, class_id: null })
          .in('id', ids)
      }

      // Tamat: Tahun 6 → inactive
      if (tamatStudents.length > 0) {
        await supabase
          .from('students')
          .update({ status: 'inactive' })
          .in('id', tamatStudents.map(s => s.id))
      }

      setResult({ naik: naikStudents.length, tamat: tamatStudents.length })
      setStep('done')
    } catch {
      alert('Ralat semasa proses. Sila cuba semula.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
              <GraduationCap size={16} style={{ color: '#1B4332' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Naik Tahun Batch</h2>
              <p className="text-xs text-gray-400">Kemaskini tahun semua pelajar aktif</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pelajar Aktif</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#E8F5E9' }}>
                    <p className="text-2xl font-bold" style={{ color: '#1B4332' }}>{naikStudents.length}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#2E7D32' }}>Naik Tahun</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{tamatStudents.length}</p>
                    <p className="text-xs text-orange-600 mt-0.5">Tamat (T6)</p>
                  </div>
                </div>

                {/* Per-year breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perubahan Tahun</p>
                  {byYear.filter(y => y.students.length > 0).map((y) => (
                    <div
                      key={y.year}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
                      style={{
                        borderColor: y.year === 6 ? '#fed7aa' : '#e5e7eb',
                        backgroundColor: y.year === 6 ? '#fff7ed' : '#f9fafb',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: YEAR_COLORS[y.year - 1] }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Tahun {y.year}
                        </span>
                        <span className="text-xs text-gray-400">({y.students.length} pelajar)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {y.year < 6 ? (
                          <>
                            <span className="text-xs font-semibold text-gray-600">Tahun {y.year}</span>
                            <ArrowRight size={12} className="text-gray-400" />
                            <span className="text-xs font-bold" style={{ color: '#1B4332' }}>Tahun {y.year + 1}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-orange-600">Tamat / Alumni</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warning */}
                <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-0.5">
                    <p className="font-semibold">Perhatian sebelum proceed:</p>
                    <p>• Tindakan ini <span className="font-bold">tidak boleh diundo</span> secara automatik</p>
                    <p>• Kelas (class_id) akan dikosongkan — perlu assign semula</p>
                    <p>• Pelajar Tahun 6 akan bertukar status kepada <span className="font-bold">Tidak Aktif</span></p>
                    <p>• Pastikan invois tahun semasa sudah selesai sebelum naik tahun</p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* STEP: CONFIRM */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                  <AlertTriangle size={28} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">Sahkan Naik Tahun?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-semibold text-gray-700">{naikStudents.length} pelajar</span> akan naik tahun dan{' '}
                    <span className="font-semibold text-orange-600">{tamatStudents.length} pelajar Tahun 6</span> akan ditanda sebagai Tamat.
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 text-center font-medium">
                Tindakan ini <strong>tidak boleh diundo</strong>. Tekan "Naik Tahun Sekarang" untuk teruskan.
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                <CheckCircle2 size={32} style={{ color: '#1B4332' }} />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">Berjaya!</p>
                <p className="text-sm text-gray-500 mt-1">
                  {result.naik} pelajar telah naik tahun.
                  {result.tamat > 0 && ` ${result.tamat} pelajar Tahun 6 telah ditanda sebagai Tamat.`}
                </p>
              </div>
              <div className="w-full bg-gray-50 rounded-xl p-3 text-xs text-gray-600 text-left space-y-1">
                <p>✅ Tahun pelajar dikemaskini</p>
                <p>✅ Kelas dikosongkan — sila assign kelas baru</p>
                {result.tamat > 0 && <p>✅ Pelajar Tahun 6 ditanda Tamat</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          {step === 'preview' && !loading && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={students.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: '#1B4332' }}
              >
                Teruskan
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => setStep('preview')}
                disabled={processing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Balik
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#dc2626' }}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Naik Tahun Sekarang'
                )}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={() => { onSuccess(); onClose() }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95"
              style={{ backgroundColor: '#1B4332' }}
            >
              Tutup & Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
