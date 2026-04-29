'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface Student {
  id: string
  full_name: string
  student_no: string
  year_level: number
  student_guardians: { guardian_id: string; is_primary: boolean }[]
}

interface FeeType { id: string; name: string }

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

type Step = 'setup' | 'preview' | 'done'

export default function JanaBulkModal({ onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const [step, setStep] = useState<Step>('setup')
  const [students, setStudents] = useState<Student[]>([])
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [existingInvoiceStudentIds, setExistingInvoiceStudentIds] = useState<Set<string>>(new Set())
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const year = new Date().getFullYear()
  const [items, setItems] = useState<{ fee_type_id: string; description: string; amount: string }[]>([])
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generated, setGenerated] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const schoolIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: sid } = await supabase.rpc('get_user_school_id')
      schoolIdRef.current = sid

      const [{ data: stu }, { data: fee }] = await Promise.all([
        supabase.from('students')
          .select('id, full_name, student_no, year_level, student_guardians(guardian_id, is_primary)')
          .eq('status', 'active').order('year_level').order('full_name'),
        supabase.from('fee_types').select('id, name').eq('is_active', true),
      ])
      setStudents(stu ?? [])
      setFeeTypes(fee ?? [])
      setLoading(false)
    }
    init()
  }, [])

  async function handlePreview() {
    if (items.length === 0) return
    setLoading(true)

    // Check which students already have invoice for this month
    const { data: existing } = await supabase
      .from('invoices')
      .select('student_id')
      .eq('invoice_month', Number(month))
      .eq('invoice_year', year)

    setExistingInvoiceStudentIds(new Set((existing ?? []).map(e => e.student_id)))
    setLoading(false)
    setStep('preview')
  }

  function toggleDeselect(studentId: string) {
    setDeselected(prev => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  const total = items.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0)

  const eligibleStudents = students.filter(s =>
    !existingInvoiceStudentIds.has(s.id) && !deselected.has(s.id)
  )
  const skippedCount = students.filter(s => existingInvoiceStudentIds.has(s.id)).length

  async function handleGenerate() {
    if (eligibleStudents.length === 0) return
    setGenerating(true)
    setError(null)
    setProgress(0)

    const sid = schoolIdRef.current
    let successCount = 0

    // Get last invoice number
    const { data: lastInv } = await supabase
      .from('invoices').select('invoice_no')
      .ilike('invoice_no', `INV-${year}-%`)
      .order('invoice_no', { ascending: false }).limit(1).single()

    let nextSeq = 1
    if (lastInv?.invoice_no) {
      nextSeq = parseInt(lastInv.invoice_no.split('-')[2]) + 1
    }

    // Track families that already received JIBG — per-family rule
    const jibgFamilies = new Set<string>()

    for (let i = 0; i < eligibleStudents.length; i++) {
      const student = eligibleStudents[i]
      const primaryGuardian = student.student_guardians?.find(g => g.is_primary) ?? student.student_guardians?.[0]
      const guardianId = primaryGuardian?.guardian_id ?? null
      const invoiceNo = `INV-${year}-${String(nextSeq).padStart(4, '0')}`
      nextSeq++

      // JIBG per-family: exclude for 2nd+ sibling
      const studentItems = items.filter(item => {
        if (item.description.toLowerCase().includes('jibg')) {
          if (guardianId && jibgFamilies.has(guardianId)) return false
        }
        return true
      })
      if (guardianId) jibgFamilies.add(guardianId)

      const studentTotal = studentItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          school_id: sid,
          student_id: student.id,
          guardian_id: guardianId,
          invoice_no: invoiceNo,
          invoice_month: Number(month),
          invoice_year: year,
          total_amount: studentTotal,
          discount_amount: 0,
          status: 'sent',
        })
        .select().single()

      if (!invErr && inv) {
        await supabase.from('invoice_items').insert(
          studentItems.map(item => ({
            school_id: sid,
            invoice_id: inv.id,
            fee_type_id: item.fee_type_id || null,
            description: item.description,
            quantity: 1,
            unit_price: parseFloat(item.amount),
            amount: parseFloat(item.amount),
            price_snapshot: parseFloat(item.amount),
          }))
        )
        successCount++
      }

      setProgress(Math.round(((i + 1) / eligibleStudents.length) * 100))
    }

    setGenerated(successCount)
    setGenerating(false)
    setStep('done')
  }

  function addItem() {
    setItems(prev => [...prev, { fee_type_id: '', description: '', amount: '' }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: string, value: string) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function onFeeTypeChange(i: number, feeTypeId: string) {
    const ft = feeTypes.find(f => f.id === feeTypeId)
    updateItem(i, 'fee_type_id', feeTypeId)
    if (ft) updateItem(i, 'description', ft.name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={step === 'done' ? onClose : onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Jana Invois — Semua Pelajar</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'setup' && 'Tetapkan bulan & item yuran'}
              {step === 'preview' && `${eligibleStudents.length} pelajar akan dijana`}
              {step === 'done' && 'Selesai'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* Step: Setup */}
          {step === 'setup' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bulan</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m} {year}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Item Yuran</label>
                  <button type="button" onClick={addItem}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ color: '#1B4332', backgroundColor: '#ECFDF5' }}>
                    + Tambah Item
                  </button>
                </div>
                {items.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                    Klik "Tambah Item" untuk masukkan yuran
                  </p>
                )}
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <select value={item.fee_type_id} onChange={e => onFeeTypeChange(i, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none">
                          <option value="">Pilih jenis yuran</option>
                          {feeTypes.map(ft => (
                            <option key={ft.id} value={ft.id}>{ft.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input placeholder="Keterangan" value={item.description}
                            onChange={e => updateItem(i, 'description', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none" />
                          <input type="number" placeholder="RM" value={item.amount}
                            onChange={e => updateItem(i, 'amount', e.target.value)}
                            className="w-24 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none" />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeItem(i)}
                        className="mt-1 p-1.5 text-gray-400 hover:text-red-500 transition">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {items.length > 0 && (
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl">
                  <span className="text-sm font-semibold text-gray-700">Jumlah setiap pelajar</span>
                  <span className="text-base font-bold" style={{ color: '#1B4332' }}>RM {total.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Users size={15} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  {loading ? 'Memuatkan...' : `${students.length} pelajar aktif dalam sistem`}
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{eligibleStudents.length}</p>
                  <p className="text-xs text-green-600 mt-0.5">Akan dijana</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-yellow-700">{skippedCount}</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Dah ada invois</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-700">{deselected.size}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Tidak dipilih</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-2.5 px-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Jumlah per invois</span>
                <span className="text-sm font-bold" style={{ color: '#1B4332' }}>RM {total.toFixed(2)}</span>
              </div>

              {items.some(i => i.description.toLowerCase().includes('jibg')) && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                  <span className="flex-shrink-0 mt-0.5">⚠️</span>
                  <span>Yuran JIBG dikira per keluarga — adik-beradik ke-2 dan seterusnya akan dikecualikan JIBG secara automatik.</span>
                </div>
              )}

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Senarai Pelajar ({students.filter(s => !existingInvoiceStudentIds.has(s.id)).length} layak)
              </p>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {students.map(student => {
                  const hasExisting = existingInvoiceStudentIds.has(student.id)
                  const isDeselected = deselected.has(student.id)
                  return (
                    <div key={student.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition ${
                        hasExisting ? 'bg-gray-50 border-gray-100 opacity-50' :
                        isDeselected ? 'bg-gray-50 border-gray-200' :
                        'bg-white border-gray-100 hover:border-gray-200'
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {!hasExisting && (
                          <input type="checkbox" checked={!isDeselected}
                            onChange={() => toggleDeselect(student.id)}
                            className="w-4 h-4 rounded accent-green-700 flex-shrink-0" />
                        )}
                        {hasExisting && <div className="w-4 h-4 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${hasExisting || isDeselected ? 'text-gray-400' : 'text-gray-900'}`}>
                            {student.full_name}
                          </p>
                          <p className="text-xs text-gray-400">Thn {student.year_level} · {student.student_no}</p>
                        </div>
                      </div>
                      {hasExisting && (
                        <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                          Dah ada
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            </div>
          )}

          {/* Step: Generating / Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <p className="text-base font-bold text-gray-900">{generated} invois berjaya dijana</p>
              <p className="text-sm text-gray-500">
                {MONTHS[Number(month) - 1]} {year}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-50 flex-shrink-0">
          {generating && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Menjana invois...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: '#22C55E' }} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step === 'done' ? (
              <button onClick={onSuccess}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: '#1B4332' }}>
                Selesai
              </button>
            ) : (
              <>
                <button type="button" onClick={step === 'preview' ? () => setStep('setup') : onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  {step === 'preview' ? '← Balik' : 'Batal'}
                </button>
                <button
                  onClick={step === 'setup' ? handlePreview : handleGenerate}
                  disabled={loading || generating || items.length === 0 || (step === 'preview' && eligibleStudents.length === 0)}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                  style={{ backgroundColor: '#1B4332' }}>
                  {loading ? 'Memuatkan...' :
                   step === 'setup' ? `Preview (${students.length} pelajar) →` :
                   generating ? 'Menjana...' :
                   `Jana ${eligibleStudents.length} Invois`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
