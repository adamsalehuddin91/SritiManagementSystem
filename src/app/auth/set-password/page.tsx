'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

export default function SetPasswordPage() {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        // Sign out current session first, then load parent's recovery session
        await supabase.auth.signOut()
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error) {
          setReady(true)
        } else {
          setError('Pautan tidak sah atau telah tamat tempoh.')
        }
        return
      }

      // Fallback: listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true)
      })
      return () => subscription.unsubscribe()
    }
    init()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Kata laluan tidak sepadan.'); return }
    if (password.length < 6) { setError('Kata laluan minimum 6 aksara.'); return }

    setLoading(true)
    setError(null)

    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    // Check role and redirect accordingly
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const dest = profile?.role === 'parent' ? '/parent' : '/dashboard'
      router.replace(dest)
    } else {
      router.replace('/parent')
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Mengesahkan pautan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
            style={{ backgroundColor: '#1B4332' }}
          >
            🏫
          </div>
          <h1 className="text-xl font-bold text-gray-900">SRITI</h1>
          <p className="text-sm text-gray-500 mt-1">Portal Ibu Bapa</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3 pb-1">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <KeyRound size={18} style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Set Kata Laluan</p>
              <p className="text-xs text-gray-500">Minimum 6 aksara</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kata Laluan Baru</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 aksara"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ulang Kata Laluan</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Masukkan semula kata laluan"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-700 focus:bg-white transition"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 active:scale-95"
              style={{ backgroundColor: '#1B4332' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan & Log Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
