'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Users, Tag, Shirt } from 'lucide-react'

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

interface FeeType {
  id: string
  name: string
  type: string
}

interface Item {
  fee_type_id: string
  description: string
  amount: string
  category: string
  has_size: boolean
  size: string
}

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
const CATEGORIES = ['Yuran Sekolah', 'Perbekalan Buku', 'Uniform', 'Pelbagai']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']

const CATEGORY_COLOR: Record<string, string> = {
  'Yuran Sekolah':   'bg-blue-50 text-blue-700',
  'Perbekalan Buku': 'bg-amber-50 text-amber-700',
  'Uniform':         'bg-purple-50 text-purple-700',
  'Pelbagai':        'bg-gray-100 text-gray-600',
}

export default function JanaInvoisModal({ onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const [students, setStudents] = useState<Student[]>([])
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year] = useState(new Date().getFullYear())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const schoolIdRef = useRef<string | null>(null)
  const [siblings, setSiblings] = useState(0)
  const [siblingIds, setSiblingIds] = useState<string[]>([])
  const [discountSibling, setDiscountSibling] = useState(false)
  const [discountRamadan, setDiscountRamadan] = useState(false)
  const [discountManual, setDiscountManual] = useState('')
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [jibgExcluded, setJibgExcluded] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: sid } = await supabase.rpc('get_user_school_id')
      schoolIdRef.current = sid
      const [{ data: stu }, { data: fee }] = await Promise.all([
        supabase.from('students')
          .select('id, full_name, student_no, year_level, student_guardians(guardian_id, is_primary)')
          .eq('status', 'active').order('full_name'),
        supabase.from('fee_types').select('id, name, type').eq('is_active', true),
      ])
      setStudents(stu ?? [])
      setFeeTypes(fee ?? [])
    }
    init()
  }, [])

  async function onStudentChange(studentId: string) {
    setSelectedStudent(studentId)
    setDiscountSibling(false)
    setSiblings(0)
    setItems([])
    setPresetsLoaded(false)
    setJibgExcluded(false)
    setSiblingIds([])

    const student = students.find(s => s.id === studentId)
    if (!student) return

    // Sibling detection
    const primaryGuardian = student.student_guardians?.find(g => g.is_primary) ?? student.student_guardians?.[0]
    let detectedSibIds: string[] = []
    if (primaryGuardian?.guardian_id) {
      const sibs = students.filter(s =>
        s.id !== studentId &&
        s.student_guardians?.some(sg => sg.guardian_id === primaryGuardian.guardian_id)
      )
      detectedSibIds = sibs.map(s => s.id)
      setSiblings(sibs.length)
      setSiblingIds(detectedSibIds)
      if (sibs.length > 0) setDiscountSibling(true)
    }

    // Auto-populate from fee_presets
    if (student.year_level && schoolIdRef.current) {
      const { data: presets } = await supabase
        .from('fee_presets')
        .select('fee_type_id, description, default_amount, category, has_size')
        .eq('school_id', schoolIdRef.current)
        .eq('year_level', student.year_level)
        .eq('is_active', true)

      if (presets && presets.length > 0) {
        const sorted = [...presets].sort((a, b) => {
          const ci = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
          return ci !== 0 ? ci : b.default_amount - a.default_amount
        })

        let populated = sorted.map(p => ({
          fee_type_id: p.fee_type_id ?? '',
          description: p.description,
          amount: String(p.default_amount),
          category: p.category ?? 'Yuran Sekolah',
          has_size: p.has_size ?? false,
          size: '',
        }))

        // JIBG per-family: check if sibling already has JIBG invoice this year
        if (detectedSibIds.length > 0) {
          const { data: sibInvoices } = await supabase
            .from('invoices')
            .select('id')
            .in('student_id', detectedSibIds)
            .eq('invoice_year', new Date().getFullYear())
            .neq('status', 'draft')

          const sibInvIds = (sibInvoices ?? []).map(i => i.id)

          if (sibInvIds.length > 0) {
            const { data: jibgFound } = await supabase
              .from('invoice_items')
              .select('id')
              .in('invoice_id', sibInvIds)
              .ilike('description', '%JIBG%')
              .limit(1)

            if (jibgFound && jibgFound.length > 0) {
              populated = populated.filter(i => !i.description.toLowerCase().includes('jibg'))
              setJibgExcluded(true)
            }
          }
        }

        setItems(populated)
        setPresetsLoaded(true)
      }
    }
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { fee_type_id: '', description: '', amount: '', category: 'Pelbagai', has_size: false, size: '' }])
  }

  const total = items.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0)
  const siblingDiscount = discountSibling ? total * 0.10 : 0
  const ramadanDiscount = discountRamadan ? total * 0.10 : 0
  const manualDiscount = parseFloat(discountManual) || 0
  const totalDiscount = Math.min(siblingDiscount + ramadanDiscount + manualDiscount, total)
  const netTotal = total - totalDiscount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || items.length === 0) return
    setLoading(true)
    setError(null)

    const sid = schoolIdRef.current
    const student = students.find(s => s.id === selectedStudent)
    const primaryGuardian = student?.student_guardians?.find(g => g.is_primary) ?? student?.student_guardians?.[0]

    const { data: lastInv } = await supabase
      .from('invoices').select('invoice_no')
      .ilike('invoice_no', `INV-${year}-%`)
      .order('invoice_no', { ascending: false }).limit(1).single()

    let nextSeq = 1
    if (lastInv?.invoice_no) nextSeq = parseInt(lastInv.invoice_no.split('-')[2]) + 1
    const invoiceNo = `INV-${year}-${String(nextSeq).padStart(4, '0')}`

    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      school_id: sid,
      student_id: selectedStudent,
      guardian_id: primaryGuardian?.guardian_id ?? null,
      invoice_no: invoiceNo,
      invoice_month: Number(month),
      invoice_year: year,
      total_amount: total,
      discount_amount: totalDiscount,
      status: 'sent',
    }).select().single()

    if (invErr) { setError('Gagal jana invois.'); setLoading(false); return }

    await supabase.from('invoice_items').insert(
      items.map(item => {
        const desc = item.has_size && item.size ? `${item.description} (${item.size})` : item.description
        return {
          school_id: sid,
          invoice_id: inv.id,
          fee_type_id: item.fee_type_id || null,
          description: desc,
          quantity: 1,
          unit_price: parseFloat(item.amount),
          amount: parseFloat(item.amount),
          price_snapshot: parseFloat(item.amount),
        }
      })
    )

    onSuccess()
  }

  // Group items by category for display
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: items.map((item, idx) => ({ ...item, idx })).filter(item => item.category === cat),
  })).filter(g => g.items.length > 0)

  // Ungrouped (manual adds with unknown category)
  const ungrouped = items.map((item, idx) => ({ ...item, idx })).filter(item => !CATEGORIES.includes(item.category))

  const selectedStudentData = students.find(s => s.id === selectedStudent)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Jana Invois</h2>
            {presetsLoaded && selectedStudentData && (
              <p className="text-xs text-green-700 mt-0.5">
                {items.length} item auto-diisi · Tahun {selectedStudentData.year_level}
                {jibgExcluded && <span className="ml-2 text-amber-600">· JIBG dikecualikan (adik-beradik)</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Pelajar + Bulan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pelajar</label>
              <select required value={selectedStudent} onChange={e => onStudentChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none">
                <option value="">Pilih pelajar</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} (Thn {s.year_level})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bulan</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none">
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m} {year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items — grouped by category */}
          {items.length === 0 && !selectedStudent && (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
              Pilih pelajar untuk auto-isi item yuran
            </div>
          )}

          {items.length === 0 && selectedStudent && (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
              Tiada preset untuk tahun ini — tambah item manual di bawah
            </div>
          )}

          {grouped.map(({ category, items: catItems }) => (
            <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLOR[category]}`}>
                  {category}
                </span>
                <span className="text-xs text-gray-400">
                  RM {catItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0).toFixed(2)}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                {catItems.map(item => (
                  <div key={item.idx} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{item.description}</p>
                      {/* Size selector for uniform items */}
                      {item.has_size && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Shirt size={11} className="text-purple-400 flex-shrink-0" />
                          {SIZES.map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateItem(item.idx, 'size', item.size === sz ? '' : sz)}
                              className={`text-xs px-2 py-0.5 rounded-md border transition ${
                                item.size === sz
                                  ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">RM</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => updateItem(item.idx, 'amount', e.target.value)}
                          className="w-24 pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-right outline-none focus:border-green-600"
                        />
                      </div>
                      <button type="button" onClick={() => removeItem(item.idx)}
                        className="p-1 text-gray-300 hover:text-red-400 transition">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Ungrouped manual items */}
          {ungrouped.map(item => (
            <div key={item.idx} className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-xl">
              <input placeholder="Keterangan"
                value={item.description} onChange={e => updateItem(item.idx, 'description', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none" />
              <div className="relative flex-shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">RM</span>
                <input type="number" value={item.amount}
                  onChange={e => updateItem(item.idx, 'amount', e.target.value)}
                  className="w-24 pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm text-right outline-none" />
              </div>
              <button type="button" onClick={() => removeItem(item.idx)}
                className="p-1 text-gray-300 hover:text-red-400 transition">
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Tambah item button */}
          <button type="button" onClick={addItem}
            className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-xs font-semibold text-gray-400 hover:border-gray-300 hover:text-gray-500 transition">
            + Tambah Item Lain
          </button>

          {/* Diskaun */}
          {items.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Tag size={12} /> Diskaun
              </p>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">Adik-beradik</span>
                  {siblings > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#1B4332', backgroundColor: '#ECFDF5' }}>
                      {siblings} adik-beradik
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">-10%</span>
                  <input type="checkbox" checked={discountSibling}
                    onChange={e => setDiscountSibling(e.target.checked)} className="w-4 h-4 accent-green-700" />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Ramadan</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">-10%</span>
                  <input type="checkbox" checked={discountRamadan}
                    onChange={e => setDiscountRamadan(e.target.checked)} className="w-4 h-4 accent-green-700" />
                </div>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">Lain-lain (RM)</span>
                <input type="number" placeholder="0.00" min="0" value={discountManual}
                  onChange={e => setDiscountManual(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none text-right" />
              </div>
            </div>
          )}

          {/* Total */}
          {items.length > 0 && (
            <div className="py-3 px-4 rounded-xl space-y-1.5" style={{ backgroundColor: '#F0FDF4' }}>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal ({items.length} item)</span>
                <span>RM {total.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Diskaun</span>
                  <span>- RM {totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-green-200">
                <span className="text-sm font-bold text-gray-800">Jumlah Bersih</span>
                <span className="text-lg font-black" style={{ color: '#1B4332' }}>RM {netTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={loading || items.length === 0 || !selectedStudent}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#1B4332' }}>
              {loading ? 'Menjana...' : `Jana Invois${items.length > 0 ? ` (${items.length} item)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
