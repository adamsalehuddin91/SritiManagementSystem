'use client'

import { useState } from 'react'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Green Header */}
      <div
        className="flex flex-col items-center justify-center pt-14 pb-10 px-6"
        style={{ backgroundColor: '#1B4332' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4">
          <span className="text-2xl font-bold" style={{ color: '#1B4332' }}>SRITI</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide">SRITI</h1>
        <p className="text-green-200 text-sm mt-1">Sistem Pengurusan Sekolah</p>
      </div>

      {/* Form Card */}
      <div className="flex-1 flex flex-col justify-start -mt-4 rounded-t-3xl bg-white shadow-xl px-6 pt-8 pb-10 max-w-md w-full mx-auto">

        <h2 className="text-xl font-bold text-gray-900 mb-1">Selamat Datang</h2>
        <p className="text-sm text-gray-500 mb-6">Log masuk untuk akses sistem</p>

        <form action={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emel
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="contoh@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': '#1B4332' } as React.CSSProperties}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Laluan
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': '#1B4332' } as React.CSSProperties}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 text-xs">⚠</span>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold mt-2 transition active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: '#1B4332' }}
          >
            {loading ? 'Sedang log masuk...' : 'Log Masuk'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">atau</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Info */}
        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Akaun anda akan disediakan oleh pihak pentadbiran sekolah.
          <br />
          Hubungi pejabat sekolah untuk bantuan.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <span className="font-semibold" style={{ color: '#1B4332' }}>SwiftApps</span>
        </p>
      </div>

    </div>
  )
}
