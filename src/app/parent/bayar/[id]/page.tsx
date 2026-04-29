'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react'

interface Invoice {
  id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: string
  students: { full_name: string } | null
  invoice_items: { description: string; amount: number }[]
}

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

interface BankInfo {
  name: string
  bank_name: string | null
  bank_account_no: string | null
  bank_account_name: string | null
  bank_reference_note: string | null
}

export default function BayarPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = useRef(createClient()).current
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
  const [step, setStep] = useState<'detail' | 'upload' | 'success'>('detail')
  const [file, setFile] = useState<File | null>(null)
  const [refNo, setRefNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const guardianIdRef = useRef<string | null>(null)
  const schoolIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('guardian_id, school_id').eq('id', user.id).single()
      guardianIdRef.current = profile?.guardian_id
      schoolIdRef.current = profile?.school_id

      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('name, bank_name, bank_account_no, bank_account_name, bank_reference_note')
          .eq('id', profile.school_id)
          .single()
        if (school) setBankInfo(school)
      }

      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_month, invoice_year, total_amount, discount_amount, status, students(full_name), invoice_items(description, amount)')
        .eq('id', id as string).single()
      setInvoice(data)
    }
    fetch()
  }, [id, supabase])

  async function compressImage(original: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(original)
      img.onload = () => {
        const MAX = 900
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(blob => resolve(blob ?? original), 'image/jpeg', 0.70)
      }
      img.onerror = () => resolve(original)
      img.src = url
    })
  }

  async function handleSubmit() {
    if (!file || !invoice) return
    setLoading(true)
    setError(null)

    const sid = schoolIdRef.current
    const gid = guardianIdRef.current

    const compressed = await compressImage(file)
    const filePath = `payment-proofs/${Date.now()}.jpg`
    const { error: uploadErr } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, compressed, { contentType: 'image/jpeg' })

    if (uploadErr) { setError('Gagal upload gambar. Cuba semula.'); setLoading(false); return }

    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath)

    // Create payment
    const { data: pay, error: payErr } = await supabase.from('payments').insert({
      school_id: sid,
      guardian_id: gid,
      amount: invoice.total_amount - invoice.discount_amount,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'manual_transfer',
      status: 'pending',
      reference_no: refNo || null,
    }).select().single()

    if (payErr) { setError('Gagal hantar bayaran.'); setLoading(false); return }

    // Link payment to invoice
    await supabase.from('payment_allocations').insert({
      school_id: sid,
      payment_id: pay.id,
      invoice_id: invoice.id,
      amount: invoice.total_amount - invoice.discount_amount,
    })

    // Save proof
    await supabase.from('payment_proofs').insert({
      school_id: sid,
      payment_id: pay.id,
      file_url: urlData.publicUrl,
    })

    // Update invoice status to pending
    await supabase.from('invoices').update({ status: 'pending' }).eq('id', invoice.id)

    setStep('success')
    setLoading(false)
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  const amount = invoice.total_amount - invoice.discount_amount

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ backgroundColor: '#1B4332' }}>
        <button onClick={() => step === 'upload' ? setStep('detail') : router.back()} className="text-green-300 mb-4 flex items-center gap-1">
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 className="text-white text-lg font-bold">Buat Bayaran</h1>
        <p className="text-green-300 text-xs mt-0.5">{invoice.invoice_no}</p>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">

        {/* Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Bayaran Dihantar!</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xs">
              Bukti bayaran telah dihantar. Admin akan mengesahkan dalam masa 1-2 hari bekerja.
            </p>
            <button
              onClick={() => router.push('/parent')}
              className="mt-6 px-6 py-3 rounded-2xl text-white text-sm font-bold"
              style={{ backgroundColor: '#1B4332' }}
            >
              Kembali ke Utama
            </button>
          </div>
        )}

        {/* Step 1: Invoice Detail */}
        {step === 'detail' && (
          <>
            {/* Invoice Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900">Ringkasan Invois</h3>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pelajar</span>
                  <span className="font-medium text-gray-900">{invoice.students?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bulan</span>
                  <span className="text-gray-700">{MONTHS[invoice.invoice_month - 1]} {invoice.invoice_year}</span>
                </div>
                <div className="h-px bg-gray-50 my-1" />
                {invoice.invoice_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className="text-gray-900">RM {item.amount.toFixed(2)}</span>
                  </div>
                ))}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Diskaun</span>
                    <span>- RM {invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-900">Jumlah</span>
                  <span className="text-base font-bold" style={{ color: '#1B4332' }}>RM {amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Maklumat Akaun Bank</h3>
              {bankInfo ? (
                <div className="space-y-2">
                  {bankInfo.bank_account_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Nama Akaun</span>
                      <span className="font-medium text-gray-900">{bankInfo.bank_account_name}</span>
                    </div>
                  )}
                  {bankInfo.bank_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bank</span>
                      <span className="text-gray-700">{bankInfo.bank_name}</span>
                    </div>
                  )}
                  {bankInfo.bank_account_no && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">No. Akaun</span>
                      <span className="font-mono font-bold text-gray-900">{bankInfo.bank_account_no}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Maklumat bank belum dikemaskini.</p>
              )}
              <div className="mt-3 p-3 bg-yellow-50 rounded-xl">
                <p className="text-xs text-yellow-700">
                  {bankInfo?.bank_reference_note
                    ? bankInfo.bank_reference_note
                    : <>Sila masukkan <strong>{invoice.invoice_no}</strong> sebagai rujukan semasa transfer.</>
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep('upload')}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold"
              style={{ backgroundColor: '#1B4332' }}
            >
              Saya Dah Bayar — Upload Bukti
            </button>
          </>
        )}

        {/* Step 2: Upload Proof */}
        {step === 'upload' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900">Jumlah Bayaran</h3>
                <span className="text-lg font-bold" style={{ color: '#1B4332' }}>RM {amount.toFixed(2)}</span>
              </div>

              {/* Ref No */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  No. Rujukan Bank <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={refNo}
                  onChange={e => setRefNo(e.target.value)}
                  placeholder="cth: TXN202604280001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono outline-none"
                />
              </div>

              {/* Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bukti Bayaran</label>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-300 transition bg-gray-50">
                  {file ? (
                    <div className="text-center">
                      <CheckCircle size={28} className="text-green-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-gray-600">Klik untuk upload screenshot</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — max 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60"
              style={{ backgroundColor: '#1B4332' }}
            >
              {loading ? 'Menghantar...' : 'Hantar Bukti Bayaran'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
