'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, User, FileText, Plus, Star, Send,
  CheckCircle, Pencil, X as XIcon, Camera, MapPin, Calendar,
  BadgeCheck, Receipt, Edit2
} from 'lucide-react'
import Link from 'next/link'
import TambahWarisModal from './TambahWarisModal'

interface StudentDetail {
  id: string
  student_no: string
  full_name: string
  mykid_no: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  photo_url: string | null
  registration_date: string | null
  year_level: number
  status: string
  classes: { id: string; name: string } | null
  student_guardians: {
    relationship: string
    is_primary: boolean
    guardian_id: string
    guardians: { full_name: string; phone: string; email: string | null }
  }[]
}

interface Invoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
}

interface ClassOption { id: string; name: string; year_level: number }

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']

const invoiceStatusStyle: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
}
const invoiceStatusLabel: Record<string, string> = {
  paid: 'Dibayar', pending: 'Pending', overdue: 'Tertunggak', draft: 'Draf', sent: 'Dihantar',
}

const TABS = [
  { key: 'profil', label: 'Profil' },
  { key: 'penjaga', label: 'Penjaga' },
  { key: 'yuran', label: 'Sejarah Yuran' },
]

// ── Edit Profile Modal ───────────────────────────────────────────────────────

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

interface EditPelajarModalProps {
  student: StudentDetail
  classes: ClassOption[]
  onClose: () => void
  onSuccess: () => void
}

function EditPelajarModal({ student, classes, onClose, onSuccess }: EditPelajarModalProps) {
  const supabase = useRef(createClient()).current
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(student.full_name)
  const [myKidNo, setMyKidNo] = useState(student.mykid_no ?? '')
  const [gender, setGender] = useState(student.gender ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(student.date_of_birth ?? '')
  const [address, setAddress] = useState(student.address ?? '')
  const [yearLevel, setYearLevel] = useState(String(student.year_level))
  const [classId, setClassId] = useState(student.classes?.id ?? '')
  const [status, setStatus] = useState(student.status)

  const filteredClasses = yearLevel ? classes.filter(c => String(c.year_level) === yearLevel) : []

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('students')
      .update({
        full_name: fullName,
        mykid_no: myKidNo || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        address: address || null,
        year_level: Number(yearLevel),
        class_id: classId || null,
        status,
      })
      .eq('id', student.id)
    setSaving(false)
    if (err) { setError('Gagal simpan. Cuba lagi.'); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <h2 className="text-base font-bold text-gray-900">Edit Maklumat Pelajar</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Penuh</label>
            <input
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition"
            />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tahun</label>
              <select
                required
                value={yearLevel}
                onChange={e => { setYearLevel(e.target.value); setClassId('') }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
              >
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
                disabled={filteredClasses.length === 0}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none disabled:opacity-50"
              >
                <option value="">Pilih kelas</option>
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Alamat</label>
            <textarea
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="No. rumah, jalan, kawasan, poskod, negeri"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="graduated">Tamat/Lulus</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#1B4332' }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PelajarDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profil')

  // Modals
  const [showEdit, setShowEdit] = useState(false)
  const [showTambahWaris, setShowTambahWaris] = useState(false)

  // Guardian invite state
  const [inviting, setInviting] = useState<string | null>(null)
  const [invitedEmails, setInvitedEmails] = useState<Set<string>>(new Set())
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set())
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Inline phone/email edit
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: s }, { data: inv }, { data: sid }, { data: cls }] = await Promise.all([
      supabase
        .from('students')
        .select(`
          id, student_no, full_name, mykid_no, gender, date_of_birth,
          address, photo_url, registration_date, year_level, status,
          classes(id, name),
          student_guardians(relationship, is_primary, guardian_id, guardians(full_name, phone, email))
        `)
        .eq('id', id as string)
        .single(),
      supabase
        .from('invoices')
        .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status')
        .eq('student_id', id as string)
        .order('invoice_year', { ascending: false })
        .order('invoice_month', { ascending: false }),
      supabase.rpc('get_user_school_id'),
      supabase.from('classes').select('id, name, year_level').order('year_level'),
    ])
    setStudent(s as unknown as StudentDetail | null)
    setInvoices(inv ?? [])
    setSchoolId(sid)
    setClasses(cls ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleInvite(guardianEmail: string, guardianFullName: string, guardianId: string) {
    if (!schoolId) return
    setInviting(guardianEmail)
    setInviteError(null)
    const res = await fetch('/api/invite-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardianId, email: guardianEmail, fullName: guardianFullName, schoolId }),
    })
    const result = await res.json()
    setInviting(null)
    if (!res.ok) { setInviteError(result.error ?? 'Gagal hantar jemputan.') }
    else if (result.existing) { setExistingEmails(prev => new Set(prev).add(guardianEmail)) }
    else { setInvitedEmails(prev => new Set(prev).add(guardianEmail)) }
  }

  async function handleSavePhone(guardianId: string) {
    if (!phoneDraft.trim()) return
    setSavingPhone(true)
    const { error } = await supabase.from('guardians').update({ phone: phoneDraft.trim() }).eq('id', guardianId)
    setSavingPhone(false)
    if (!error) { setEditingPhoneId(null); fetchData() }
  }

  async function handleSaveEmail(guardianId: string) {
    setSavingEmail(true)
    const { error } = await supabase.from('guardians').update({ email: emailDraft.trim() || null }).eq('id', guardianId)
    setSavingEmail(false)
    if (!error) { setEditingEmailId(null); fetchData() }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Pelajar tidak dijumpai.</p>
        <button onClick={() => router.back()} className="text-sm mt-2" style={{ color: '#1B4332' }}>← Kembali</button>
      </div>
    )
  }

  const totalDue = invoices.reduce((s, i) => s + i.total_amount - i.discount_amount, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount - i.discount_amount, 0)
  const totalBaki = totalDue - totalPaid

  const genderLabel = student.gender === 'L' ? 'Lelaki' : student.gender === 'P' ? 'Perempuan' : null
  const regDate = student.registration_date
    ? new Date(student.registration_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
    : student.status ? new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Back */}
      <Link href="/dashboard/pelajar" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#1B4332' }}>
        <ArrowLeft size={16} /> Senarai Pelajar
      </Link>

      {/* ── PROFILE HEADER CARD ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">

          {/* Avatar / Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: '#1B4332' }}>
                  {student.full_name.charAt(0)}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
            >
              <Camera size={11} className="text-gray-500" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">{student.full_name}</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{student.student_no}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    Tahun {student.year_level} · {student.classes?.name ?? '—'}
                  </span>
                  {genderLabel && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{genderLabel}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  student.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  {student.status === 'active' ? 'Aktif' : student.status === 'graduated' ? 'Tamat' : 'Tidak Aktif'}
                </span>
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === key
                  ? 'border-[#0B4233] text-[#0B4233]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {key === 'penjaga' && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {student.student_guardians?.length ?? 0}
                </span>
              )}
              {key === 'yuran' && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {invoices.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ══ TAB: PROFIL ══ */}
      {activeTab === 'profil' && (
        <div className="space-y-4">

          {/* Maklumat Peribadi */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Maklumat Peribadi</p>
              <button onClick={() => setShowEdit(true)} className="text-gray-400 hover:text-gray-600 transition">
                <Pencil size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">No. MyKid / IC</p>
                  <p className={`text-sm font-medium mt-0.5 font-mono ${student.mykid_no ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {student.mykid_no ?? 'Belum diisi'}
                  </p>
                </div>
              </div>

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Jantina</p>
                  <p className={`text-sm font-medium mt-0.5 ${genderLabel ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {genderLabel ?? 'Belum diisi'}
                  </p>
                </div>
              </div>

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Tarikh Lahir</p>
                  <p className={`text-sm font-medium mt-0.5 ${student.date_of_birth ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {student.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Belum diisi'}
                  </p>
                </div>
              </div>

              <div className="flex items-start px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} style={{ color: '#1B4332' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Alamat</p>
                  <p className={`text-sm font-medium mt-0.5 leading-relaxed ${student.address ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {student.address ?? 'Belum diisi'}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Maklumat Sekolah */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Maklumat Sekolah</p>
            </div>
            <div className="divide-y divide-gray-50">

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">No. Pelajar</p>
                  <p className="text-sm font-medium font-mono text-gray-900 mt-0.5">{student.student_no}</p>
                </div>
              </div>

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <User size={14} style={{ color: '#1B4332' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Tahun & Kelas</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    Tahun {student.year_level} · {student.classes?.name ?? '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Tarikh Daftar</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{regDate}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Dokumen (placeholder) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Dokumen</p>
            </div>
            <div className="px-5 py-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-2">
                <FileText size={18} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Tiada dokumen dilampirkan</p>
              <p className="text-xs text-gray-300 mt-1">MyKid, Sijil Lahir, dan lain-lain</p>
              <button
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                onClick={() => alert('Fungsi muat naik dokumen akan diaktifkan selepas storage bucket dikonfigurasi.')}
              >
                + Muat Naik Dokumen
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ══ TAB: PENJAGA ══ */}
      {activeTab === 'penjaga' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Maklumat Penjaga / Waris</p>
            {(student.student_guardians?.length ?? 0) < 2 && (
              <button
                onClick={() => setShowTambahWaris(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                style={{ color: '#1B4332', backgroundColor: '#ECFDF5' }}
              >
                <Plus size={13} /> Tambah Waris
              </button>
            )}
          </div>

          {(student.student_guardians?.length ?? 0) === 0 ? (
            <div className="text-center py-10">
              <User size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Tiada maklumat waris</p>
              <button
                onClick={() => setShowTambahWaris(true)}
                className="text-xs font-semibold mt-2"
                style={{ color: '#1B4332' }}
              >
                + Tambah waris sekarang
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {student.student_guardians.map((sg, i) => (
                <div key={i} className="px-5 py-4 space-y-3">

                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                      {sg.guardians.full_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{sg.guardians.full_name}</p>
                        {sg.is_primary && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                            <Star size={9} className="fill-amber-400 text-amber-400" /> Utama
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{sg.relationship}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  {editingPhoneId === sg.guardian_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        autoFocus
                        value={phoneDraft}
                        onChange={e => setPhoneDraft(e.target.value)}
                        placeholder="0123456789"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-green-600"
                      />
                      <button onClick={() => handleSavePhone(sg.guardian_id)} disabled={savingPhone}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#1B4332' }}>
                        {savingPhone ? '...' : 'Simpan'}
                      </button>
                      <button onClick={() => setEditingPhoneId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-fit">
                      <Phone size={12} className="text-gray-400 flex-shrink-0" />
                      <a href={`tel:${sg.guardians.phone}`} className="hover:underline">{sg.guardians.phone}</a>
                      <button
                        onClick={() => { setEditingPhoneId(sg.guardian_id); setPhoneDraft(sg.guardians.phone) }}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  {editingEmailId === sg.guardian_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        autoFocus
                        value={emailDraft}
                        onChange={e => setEmailDraft(e.target.value)}
                        placeholder="email@contoh.com"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-green-600"
                      />
                      <button onClick={() => handleSaveEmail(sg.guardian_id)} disabled={savingEmail}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#1B4332' }}>
                        {savingEmail ? '...' : 'Simpan'}
                      </button>
                      <button onClick={() => setEditingEmailId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <Mail size={12} className="text-gray-400 flex-shrink-0" />
                        {sg.guardians.email
                          ? <a href={`mailto:${sg.guardians.email}`} className="hover:underline">{sg.guardians.email}</a>
                          : <span className="text-gray-400 italic">Tiada e-mel</span>
                        }
                        <button
                          onClick={() => { setEditingEmailId(sg.guardian_id); setEmailDraft(sg.guardians.email ?? '') }}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil size={10} />
                        </button>
                      </div>

                      {sg.guardians.email && (
                        existingEmails.has(sg.guardians.email) ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                            <CheckCircle size={12} /> Set kata laluan dihantar
                          </span>
                        ) : invitedEmails.has(sg.guardians.email) ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700">
                            <CheckCircle size={12} /> Jemputan dihantar
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInvite(sg.guardians.email!, sg.guardians.full_name, sg.guardian_id)}
                            disabled={inviting === sg.guardians.email}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-60"
                            style={{ backgroundColor: '#ECFDF5', borderColor: '#BBF7D0', color: '#15803D' }}
                          >
                            <Send size={12} />
                            {inviting === sg.guardians.email ? 'Menghantar...' : 'Hantar Jemputan'}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {inviteError && inviting === null && (
                    <p className="text-xs text-red-600">{inviteError}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: YURAN ══ */}
      {activeTab === 'yuran' && (
        <div className="space-y-4">

          {/* Fee Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Jumlah Dijana</p>
              <p className="text-lg font-bold text-gray-900 mt-1">RM {totalDue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Dibayar</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">RM {totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Baki</p>
              <p className={`text-lg font-bold mt-1 ${totalBaki > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                RM {totalBaki.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Invoice List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Senarai Invois</p>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-10">
                <Receipt size={24} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Tiada invois lagi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/yuran/invois/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {MONTHS[inv.invoice_month - 1]} {inv.invoice_year}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{inv.invoice_no}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${invoiceStatusStyle[inv.status]}`}>
                        {invoiceStatusLabel[inv.status]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        RM {(inv.total_amount - inv.discount_amount).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Modals ── */}
      {showEdit && (
        <EditPelajarModal
          student={student}
          classes={classes}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); setLoading(true); fetchData() }}
        />
      )}

      {showTambahWaris && schoolId && (
        <TambahWarisModal
          studentId={student.id}
          schoolId={schoolId}
          onClose={() => setShowTambahWaris(false)}
          onSuccess={() => { setShowTambahWaris(false); setLoading(true); fetchData() }}
        />
      )}

    </div>
  )
}
