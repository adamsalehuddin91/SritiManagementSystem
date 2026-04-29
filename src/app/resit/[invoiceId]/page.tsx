'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'

const MONTHS_FULL = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]

const ONES = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima',
  'enam', 'tujuh', 'lapan', 'sembilan', 'sepuluh',
  'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
  'enam belas', 'tujuh belas', 'lapan belas', 'sembilan belas',
]
const TENS = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh',
  'enam puluh', 'tujuh puluh', 'lapan puluh', 'sembilan puluh']

function toWordsMY(n: number): string {
  if (n === 0) return 'sifar'
  const parts: string[] = []
  const ribu = Math.floor(n / 1000)
  const ratus = Math.floor((n % 1000) / 100)
  const baki = n % 100
  if (ribu > 0) parts.push(ribu === 1 ? 'seribu' : `${toWordsMY(ribu)} ribu`)
  if (ratus > 0) parts.push(ratus === 1 ? 'seratus' : `${ONES[ratus]} ratus`)
  if (baki > 0) {
    if (baki < 20) {
      parts.push(ONES[baki])
    } else {
      const t = Math.floor(baki / 10)
      const o = baki % 10
      parts.push(o > 0 ? `${TENS[t]} ${ONES[o]}` : TENS[t])
    }
  }
  return parts.join(' ')
}

function amountToWords(amount: number): string {
  const ringgit = Math.floor(amount)
  const sen = Math.round((amount - ringgit) * 100)
  let result = toWordsMY(ringgit) + ' ringgit'
  if (sen > 0) result += ` ${toWordsMY(sen)} sen`
  result += ' sahaja'
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const METHOD_LABEL: Record<string, string> = {
  manual_transfer: 'Pindahan Bank',
  fpx: 'FPX',
  qr: 'QR Pay',
  cash: 'Tunai',
}

interface ReceiptData {
  receiptNo: string
  invoiceMonth: number
  invoiceYear: number
  guardianName: string
  studentName: string
  studentNo: string
  amount: number
  paymentDate: string
  method: string
  schoolName: string
  referenceNo: string | null
}

export default function ResitPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select(`
          id, invoice_no, invoice_month, invoice_year, total_amount,
          students ( full_name, student_no ),
          guardians ( full_name ),
          school_id
        `)
        .eq('id', invoiceId)
        .single()

      if (invErr || !inv) {
        setError('Invois tidak ditemui.')
        setLoading(false)
        return
      }

      const { data: allocs } = await supabase
        .from('payment_allocations')
        .select('payment_id, amount, payments ( amount, payment_date, method, reference_no, status )')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })
        .limit(1)

      const alloc = allocs?.[0] as any
      const payment = alloc?.payments

      if (!payment || payment.status !== 'success') {
        setError('Tiada pembayaran yang disahkan untuk invois ini.')
        setLoading(false)
        return
      }

      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', (inv as any).school_id)
        .single()

      const student = (inv as any).students
      const guardian = (inv as any).guardians

      setData({
        receiptNo: (inv as any).invoice_no,
        invoiceMonth: (inv as any).invoice_month,
        invoiceYear: (inv as any).invoice_year,
        guardianName: guardian?.full_name ?? '—',
        studentName: student?.full_name ?? '—',
        studentNo: student?.student_no ?? '—',
        amount: payment.amount,
        paymentDate: payment.payment_date,
        method: payment.method,
        referenceNo: payment.reference_no ?? null,
        schoolName: school?.name ?? 'SRITI',
      })
      setLoading(false)
    }
    load()
  }, [invoiceId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">{error ?? 'Ralat tidak diketahui.'}</p>
          <button onClick={() => router.back()} className="text-sm text-gray-500 underline">Kembali</button>
        </div>
      </div>
    )
  }

  const bulan = MONTHS_FULL[data.invoiceMonth - 1] ?? ''
  const amountWords = amountToWords(data.amount)

  return (
    <>
      {/* Screen controls — hidden on print */}
      <div className="print:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#1B4332' }}
        >
          <Printer size={15} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* Receipt */}
      <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center p-4 print:p-0">
        <div
          className="bg-white w-full max-w-md print:max-w-none print:w-full shadow-sm print:shadow-none"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-3 mb-4 text-center px-6 pt-6 print:px-8 print:pt-8">
            <p className="text-base font-bold leading-snug" style={{ fontFamily: 'serif' }}>
              بسم الله الرحمن الرحيم
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Sekolah Rendah Integrasi Teras Islam
            </p>
            <h1 className="text-lg font-black tracking-wide mt-1 uppercase">
              {data.schoolName}
            </h1>
          </div>

          {/* RESIT RASMI */}
          <div className="text-center px-6 mb-5">
            <div className="inline-block border-2 border-gray-800 px-6 py-1.5">
              <p className="text-sm font-black tracking-widest uppercase">Resit Rasmi</p>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              No: <span className="font-bold text-gray-900">{data.receiptNo}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-6 print:px-8 space-y-4 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-600 whitespace-nowrap w-44">Diterima daripada</span>
              <span className="text-gray-400 mr-1">:</span>
              <span className="font-semibold text-gray-900">{data.guardianName}</span>
            </div>

            <div className="flex gap-2">
              <span className="text-gray-600 whitespace-nowrap w-44">Bagi pihak pelajar</span>
              <span className="text-gray-400 mr-1">:</span>
              <div>
                <span className="font-semibold text-gray-900">{data.studentName}</span>
                <span className="text-xs text-gray-500 ml-2">({data.studentNo})</span>
              </div>
            </div>

            <div className="border border-gray-300 rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Sebanyak Ringgit Malaysia:</p>
              <p className="font-bold text-gray-900 leading-snug">{amountWords}</p>
            </div>

            <div className="flex gap-2">
              <span className="text-gray-600 whitespace-nowrap w-44">Untuk bayaran</span>
              <span className="text-gray-400 mr-1">:</span>
              <span className="font-semibold text-gray-900">Yuran {bulan} {data.invoiceYear}</span>
            </div>

            <div className="flex gap-2">
              <span className="text-gray-600 whitespace-nowrap w-44">Tarikh</span>
              <span className="text-gray-400 mr-1">:</span>
              <span className="font-semibold text-gray-900">{formatDate(data.paymentDate)}</span>
            </div>

            <div className="flex gap-4">
              <div className="flex gap-2 flex-1">
                <span className="text-gray-600 whitespace-nowrap w-44">RM</span>
                <span className="text-gray-400 mr-1">:</span>
                <span className="font-bold text-gray-900">{data.amount.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-600">Kaedah</span>
                <span className="text-gray-400 mr-1">:</span>
                <span className="font-semibold text-gray-900">{METHOD_LABEL[data.method] ?? data.method}</span>
              </div>
            </div>

            {data.referenceNo && (
              <div className="flex gap-2">
                <span className="text-gray-600 whitespace-nowrap w-44">No. Rujukan</span>
                <span className="text-gray-400 mr-1">:</span>
                <span className="font-mono text-gray-900">{data.referenceNo}</span>
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="px-6 print:px-8 mt-8 mb-6 print:mt-10 print:mb-8">
            <div className="flex justify-between items-end">
              <div className="text-center">
                <div className="border-b border-gray-400 w-36 mb-1" />
                <p className="text-xs text-gray-500">Tandatangan Penerima</p>
                <p className="text-xs text-gray-400 mt-0.5">Bendahari / Staf SRITI</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 w-28 mb-1" />
                <p className="text-xs text-gray-500">Tarikh</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 mx-6 print:mx-8 pt-3 pb-6 print:pb-8 text-center">
            <p className="text-xs text-gray-400">
              Resit ini adalah sah tanpa tandatangan jika dijana secara digital.
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Sistem Pengurusan SRITI — {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5; margin: 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
