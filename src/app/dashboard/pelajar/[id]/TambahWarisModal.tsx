'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  studentId: string
  schoolId: string
  onClose: () => void
  onSuccess: () => void
}

const RELATIONSHIP = [
  { value: 'ibu', label: 'Ibu' },
  { value: 'ayah', label: 'Ayah' },
  { value: 'penjaga', label: 'Penjaga' },
]

export default function TambahWarisModal({ studentId, schoolId, onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingName, setExistingName] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('ibu')
  const [isPrimary, setIsPrimary] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim() || null

    // 1. Lookup existing guardian by phone or email
    let guardianId: string | null = null
    let isExisting = false

    const orFilter = trimmedEmail
      ? `phone.eq.${trimmedPhone},email.eq.${trimmedEmail}`
      : `phone.eq.${trimmedPhone}`

    const { data: existing } = await supabase
      .from('guardians')
      .select('id, full_name')
      .eq('school_id', schoolId)
      .or(orFilter)
      .maybeSingle()

    if (existing) {
      guardianId = existing.id
      isExisting = true
    } else {
      // 2. Insert new guardian
      const { data: newGuardian, error: gErr } = await supabase
        .from('guardians')
        .insert({
          school_id: schoolId,
          full_name: fullName.trim(),
          phone: trimmedPhone,
          email: trimmedEmail,
        })
        .select()
        .single()

      if (gErr) {
        setError('Gagal simpan maklumat waris.')
        setLoading(false)
        return
      }
      guardianId = newGuardian.id
    }

    // 3. Check if already linked to this student
    const { data: alreadyLinked } = await supabase
      .from('student_guardians')
      .select('id')
      .eq('student_id', studentId)
      .eq('guardian_id', guardianId)
      .maybeSingle()

    if (alreadyLinked) {
      setError(isExisting
        ? `Waris ini (${existing?.full_name}) sudah dipautkan ke pelajar ini.`
        : 'Waris ini sudah dipautkan ke pelajar ini.')
      setLoading(false)
      return
    }

    // 4. Unset existing primary if needed
    if (isPrimary) {
      await supabase
        .from('student_guardians')
        .update({ is_primary: false })
        .eq('student_id', studentId)
        .eq('is_primary', true)
    }

    // 5. Link guardian to student
    const { error: sgErr } = await supabase
      .from('student_guardians')
      .insert({
        school_id: schoolId,
        student_id: studentId,
        guardian_id: guardianId!,
        relationship,
        is_primary: isPrimary,
      })

    if (sgErr) {
      setError('Gagal link waris ke pelajar.')
      setLoading(false)
      return
    }

    if (isExisting) {
      setExistingName(existing?.full_name ?? null)
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Tambah Waris</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Penuh</label>
            <input
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nama penuh waris"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">No. Telefon</label>
            <input
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Contoh: 0123456789"
              type="tel"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Emel <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Contoh: ibu@email.com"
              type="email"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hubungan</label>
            <div className="flex gap-2">
              {RELATIONSHIP.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRelationship(r.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                    relationship === r.value
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  style={relationship === r.value ? { backgroundColor: '#1B4332' } : {}}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPrimary(p => !p)}
              className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${isPrimary ? '' : 'bg-gray-200'}`}
              style={isPrimary ? { backgroundColor: '#1B4332' } : {}}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPrimary ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Waris Utama</p>
              <p className="text-xs text-gray-400">Invois & notifikasi akan dihantar kepada waris ini</p>
            </div>
          </label>

          {existingName && (
            <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-xl">
              Rekod waris sedia ada digunakan: <span className="font-semibold">{existingName}</span>
            </p>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#1B4332' }}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
