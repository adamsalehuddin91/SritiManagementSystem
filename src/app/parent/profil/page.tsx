'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Phone, Mail, BookOpen, KeyRound, LogOut, ChevronRight, Eye, EyeOff, GraduationCap } from 'lucide-react'

interface StudentInfo {
  id: string
  full_name: string
  student_no: string
  year_level: number
  class_name: string | null
}

interface ProfileData {
  fullName: string
  email: string
  phone: string
}

export default function ParentProfilPage() {
  const supabase = useRef(createClient()).current
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Password change
  const [showPassForm, setShowPassForm] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)
  const [passDone, setPassDone] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email, guardian_id')
        .eq('id', user.id)
        .single()

      let phone = ''
      if (userData?.guardian_id) {
        const { data: guardian } = await supabase
          .from('guardians')
          .select('phone')
          .eq('id', userData.guardian_id)
          .single()
        phone = guardian?.phone ?? ''

        const { data: links } = await supabase
          .from('student_guardians')
          .select('students ( id, full_name, student_no, year_level, classes ( name ) )')
          .eq('guardian_id', userData.guardian_id)

        const studentList: StudentInfo[] = (links ?? []).map((l: any) => {
          const s = l.students
          return {
            id: s.id,
            full_name: s.full_name,
            student_no: s.student_no,
            year_level: s.year_level,
            class_name: s.classes?.name ?? null,
          }
        })
        setStudents(studentList)
      }

      setProfile({
        fullName: userData?.full_name ?? '',
        email: userData?.email ?? user.email ?? '',
        phone,
      })
      setLoading(false)
    }
    load()
  }, [supabase, router])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirmPass) { setPassError('Kata laluan tidak sepadan.'); return }
    if (newPass.length < 6) { setPassError('Minimum 6 aksara.'); return }

    setPassLoading(true)
    setPassError(null)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) {
      setPassError(error.message)
    } else {
      setPassDone(true)
      setNewPass('')
      setConfirmPass('')
      setTimeout(() => { setShowPassForm(false); setPassDone(false) }, 2500)
    }
    setPassLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.fullName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col pb-28 bg-gray-50 min-h-screen">

      {/* ── HEADER ── */}
      <div className="px-5 pt-12 pb-8 rounded-b-[2rem]" style={{ backgroundColor: '#0B4233' }}>
        <h1 className="text-white text-lg font-bold mb-6">Profil Saya</h1>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{initials || '?'}</span>
          </div>
          <div>
            <p className="text-white text-base font-bold leading-tight">{profile.fullName}</p>
            <p className="text-green-300 text-xs mt-0.5">{profile.email}</p>
            <div className="mt-2 inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5">
              <span className="text-green-200 text-xs font-medium">Ibu Bapa / Penjaga</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── ANAK SAYA ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Anak Saya</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <GraduationCap size={28} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Tiada maklumat pelajar</p>
                <p className="text-xs text-gray-300 mt-1">Sila hubungi pihak sekolah</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {students.map((student, idx) => (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                      style={{ backgroundColor: '#0B4233' }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {student.student_no}
                        {student.class_name && ` · ${student.class_name}`}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#E8F5E9' }}
                    >
                      <BookOpen size={11} style={{ color: '#0B4233' }} />
                      <span className="text-xs font-semibold" style={{ color: '#0B4233' }}>
                        Tahun {student.year_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MAKLUMAT AKAUN ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Maklumat Akaun</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <User size={14} style={{ color: '#0B4233' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Nama Penuh</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.fullName || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Phone size={14} style={{ color: '#0B4233' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">No. Telefon</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.phone || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Mail size={14} style={{ color: '#0B4233' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">E-mel</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TETAPAN AKAUN ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Tetapan Akaun</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Tukar Kata Laluan toggle */}
            <button
              onClick={() => {
                setShowPassForm(p => !p)
                setPassError(null)
                setPassDone(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <KeyRound size={14} className="text-blue-600" />
              </div>
              <p className="flex-1 text-sm font-semibold text-gray-900 text-left">Tukar Kata Laluan</p>
              <ChevronRight
                size={16}
                className={`text-gray-300 transition-transform duration-200 ${showPassForm ? 'rotate-90' : ''}`}
              />
            </button>

            {showPassForm && (
              <div className="px-4 pb-4 border-t border-gray-50">
                {passDone ? (
                  <div className="mt-3 flex items-center gap-2 px-3 py-3 bg-green-50 rounded-xl">
                    <span className="text-green-700 text-sm font-medium">✓ Kata laluan berjaya dikemas kini.</span>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3 pt-3">
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="Kata laluan baru (min. 6 aksara)"
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      placeholder="Ulang kata laluan baru"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 focus:bg-white transition"
                    />
                    {passError && (
                      <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{passError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={passLoading}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                      style={{ backgroundColor: '#0B4233' }}
                    >
                      {passLoading ? 'Menyimpan...' : 'Simpan Kata Laluan'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="border-t border-gray-50" />

            {/* Log Keluar */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <LogOut size={14} className="text-red-500" />
              </div>
              <p className="flex-1 text-sm font-semibold text-red-500 text-left">Log Keluar</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
