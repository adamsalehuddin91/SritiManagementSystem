'use client'
import { useParams, redirect } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResitRedirect() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/resit/${invoiceId}`)
  }, [invoiceId, router])
  return null
}
