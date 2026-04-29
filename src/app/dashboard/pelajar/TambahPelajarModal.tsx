'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, RefreshCw, ChevronRight, ChevronLeft, User, Users } from 'lucide-react'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface Class { id: string; name: string; year_level: number }

type Step = 1 | 2

function parseIcDob(ic: string): string | null {
  const digits = ic.replace(/\D/g, '')
  if (digits.length < 6) return null
  const yy = parseInt(digits.slice(0, 2))
  const mm = parseInt(digits.slice(2, 4))
  const dd = parseInt(digits.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const currentYY = new Date().getFullYear() % 100
  const yyyy = yy <= currentYY ? 2000 + yy : 1900 + yy
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export default function TambahPelajarModal({ onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const [step, setStep] = useState<Step>(1)
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const schoolIdRef = useRef<string | null>(null)

  // Step 1 — Pelajar
  const [studentNo, setStudentNo] = useState('')
  const [generatingNo, setGeneratingNo] = useState(false)
  const [fullName, setFullName] = useState('')
  const [myKidNo, setMyKidNo] = useState('')
  const [gender, setGender] = useState<'L' | 'P' | ''>('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [classId, setClassId] = useState('')

  // Step 2 — Waris
  const [warisNama, setWarisNama] = useState('')
  const [warisPhone, setWarisPhone] = useState('')
  const [warisEmail, setWarisEmail] = useState('')
  const [warisHubungan, setWarisHubungan] = useState('ibu')
  const [sendInvite, setSendInvite] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: schoolId } = await supabase.rpc('get_user_school_id')
      if (schoolId) {
        schoolIdRef.current = schoolId
        await generateNo(schoolId)
      }
      const { data: cls } = await supabase
        .from('classes').select('id, name, year_level').order('year_level')
      setClasses(cls ?? [])
    }
    init()
  }, [])

  async function generateNo(sid?: string) {
    const id = sid ?? schoolIdRef.current
    if (!id) return
    setGeneratingNo(true)
    const { data, error: rpcErr } = await supabase.rpc('generate_student_no', { p_school_id: id })
    if (rpcErr) {
      const year = new Date().getFullYear()
      const { data: last } = await supabase
        .from('students').select('student_no')
        .eq('school_id', id).ilike('student_no', `%-${year}-%`)
        .order('student_no', { ascending: false }).limit(1).single()
      let nextSeq = 1
      if (last?.student_no) {
        const parts = last.student_no.split('-')
        nextSeq = parseInt(parts[parts.length - 1]) + 1
      }
      const { data: school } = await supabase.from('schools').select('code').eq('id', id).single()
      setStudentNo(`${school?.code ?? 'SRITI'}-${year}-${String(nextSeq).padStart(3, '0')}`)
    } else {
      setStudentNo(data ?? '')
    }
    setGeneratingNo(false)
  }

  const filteredClasses = yearLevel ? classes.filter(c => String(c.year_level) === yearLevel) : []

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sid = schoolIdRef.current
    if (!sid) { setError('Sesi tamat. Sila refresh halaman.'); return }
    if (!warisNama || !warisPhone) { setError('Nama dan telefon waris diperlukan.'); return }

    setLoading(true)
    setError(null)

    // 1. Insert student
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .insert({
        school_id: sid,
        student_no: studentNo,
        full_name: fullName,
        mykid_no: myKidNo || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        year_level: Number(yearLevel),
        class_id: classId || null,
        status: 'active',
        registration_date: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single()

    if (studentErr || !student) {
      setError(studentErr?.message.includes('unique') ? 'No. pelajar sudah wujud.' : 'Gagal tambah pelajar.')
      setLoading(false)
      return
    }

    // 2. Insert guardian
    const { data: guardian, error: guardianErr } = await supabase
      .from('guardians')
      .insert({
        school_id: sid,
        full_name: warisNama,
        phone: warisPhone,
        email: warisEmail || null,
      })
      .select('id')
      .single()

    if (guardianErr || !guardian) {
      // Rollback student
      await supabase.from('students').delete().eq('id', student.id)
      setError('Gagal tambah maklumat waris.')
      setLoading(false)
      return
    }

    // 3. Link student ↔ guardian
    const { error: linkErr } = await supabase.from('student_guardians').insert({
      school_id: sid,
      student_id: student.id,
      guardian_id: guardian.id,
      relationship: warisHubungan,
      is_primary: true,
    })

    if (linkErr) {
      await supabase.from('students').delete().eq('id', student.id)
      await supabase.from('guardians').delete().eq('id', guardian.id)
      setError('Gagal kaitkan waris dengan pelajar.')
      setLoading(false)
      return
    }

    // 4. Send invite if email provided + toggle on
    if (sendInvite && warisEmail) {
      await fetch('/api/invite-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianId: guardian.id,
          email: warisEmail,
          fullName: warisNama,
          schoolId: sid,
        }),
      })
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setError(null) }}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {step === 1 ? 'Daftar Pelajar Baru' : 'Maklumat Waris'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-1">
          {[
            { n: 1, label: 'Pelajar', icon: User },
            { n: 2, label: 'Waris', icon: Users },
          ].map(({ n, label, icon: Icon }, idx) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                step === n
                  ? 'text-white'
                  : step > n
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`} style={step === n ? { backgroundColor: '#1B4332' } : {}}>
                <Icon size={12} />
                {label}
              </div>
              {idx === 0 && (
                <div className={`h-px w-6 ${step > 1 ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: PELAJAR ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="px-5 py-4 space-y-4">
            {/* No. Pelajar */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                No. Pelajar
                <span className="text-gray-400 font-normal ml-1">(auto-generate)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={studentNo}
                  onChange={e => setStudentNo(e.target.value)}
                  placeholder={generatingNo ? 'Menjana...' : 'SRITI-2026-001'}
                  required
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono outline-none focus:border-green-700 transition"
                />
                <button
                  type="button"
                  onClick={() => generateNo()}
                  disabled={generatingNo}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  <RefreshCw size={15} className={generatingNo ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Penuh Pelajar</label>
              <input
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nama penuh mengikut MyKid"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
              />
            </div>

            {/* No. MyKid / IC */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">No. MyKid / No. IC</label>
              <input
                value={myKidNo}
                onChange={e => {
                  setMyKidNo(e.target.value)
                  const dob = parseIcDob(e.target.value)
                  if (dob) setDateOfBirth(dob)
                }}
                placeholder="000101-10-1234"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono outline-none focus:border-green-700 transition"
              />
            </div>

            {/* Jantina & Tarikh Lahir */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Jantina</label>
                <div className="flex gap-2">
                  {([['L', 'Lelaki'], ['P', 'Perempuan']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGender(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        gender === val ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      style={gender === val ? { backgroundColor: '#1B4332' } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tarikh Lahir</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
                />
              </div>
            </div>

            {/* Tahun & Kelas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tahun</label>
                <select
                  required
                  value={yearLevel}
                  onChange={e => { setYearLevel(e.target.value); setClassId('') }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
                >
                  <option value="">Pilih tahun</option>
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <option key={y} value={y}>Tahun {y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kelas</label>
                <select
                  value={classId}
                  onChange={e => setClassId(e.target.value)}
                  disabled={!yearLevel || filteredClasses.length === 0}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none disabled:opacity-50"
                >
                  <option value="">Pilih kelas</option>
                  {filteredClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Batal
              </button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition"
                style={{ backgroundColor: '#1B4332' }}>
                Seterusnya <ChevronRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: WARIS ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

            {/* Ringkasan pelajar */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#1B4332' }}>
                {fullName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                <p className="text-xs text-gray-400">{studentNo} · Tahun {yearLevel}</p>
              </div>
            </div>

            {/* Hubungan */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hubungan</label>
              <div className="flex gap-2">
                {['ibu', 'ayah', 'penjaga'].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setWarisHubungan(h)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition capitalize ${
                      warisHubungan === h
                        ? 'text-white border-transparent'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={warisHubungan === h ? { backgroundColor: '#1B4332' } : {}}
                  >
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama waris */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Penuh Waris</label>
              <input
                required
                value={warisNama}
                onChange={e => setWarisNama(e.target.value)}
                placeholder="Nama penuh ibu / ayah / penjaga"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">No. Telefon</label>
              <input
                required
                type="tel"
                value={warisPhone}
                onChange={e => setWarisPhone(e.target.value)}
                placeholder="0123456789"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                E-mel
                <span className="text-gray-400 font-normal ml-1">(optional — untuk akses portal)</span>
              </label>
              <input
                type="email"
                value={warisEmail}
                onChange={e => setWarisEmail(e.target.value)}
                placeholder="contoh@email.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
              />
            </div>

            {/* Hantar jemputan toggle */}
            {warisEmail && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setSendInvite(p => !p)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${sendInvite ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendInvite ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-xs text-gray-700 font-medium">
                  Hantar jemputan log masuk ke e-mel waris
                </span>
              </label>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep(1); setError(null) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Kembali
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                style={{ backgroundColor: '#1B4332' }}>
                {loading ? 'Menyimpan...' : 'Daftar Pelajar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
