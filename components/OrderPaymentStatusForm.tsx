'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderPaymentStatus } from '@/lib/orders'
import type { PaymentStatus } from '@/types'

export default function OrderPaymentStatusForm({ orderId, currentStatus }: { orderId: string; currentStatus: PaymentStatus }) {

  // 👉 이거 추가 (핵심)
  if (typeof window === 'undefined') {
    return null
  }

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<PaymentStatus>(currentStatus)
  const [saved,  setSaved]  = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as PaymentStatus
    setStatus(next); setSaved(false)
    startTransition(async () => {
      await updateOrderPaymentStatus(orderId, next)
      setSaved(true); router.refresh()
    })
  }

  const bc = status === 'paid' ? 'var(--c-success-border)' : status === 'unpaid' ? 'var(--c-danger-border)' : 'var(--c-warning-border)'
  const tc = status === 'paid' ? 'var(--c-success-text)' : status === 'unpaid' ? 'var(--c-danger-text)' : 'var(--c-warning-text)'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <select value={status} onChange={handleChange} disabled={isPending}
        style={{ padding:'5px 28px 5px 10px', borderRadius:'var(--r-sm)', border:`1px solid ${bc}`, background:`var(--c-white) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center`, fontSize:'0.78rem', fontWeight:700, color:tc, fontFamily:'inherit', appearance:'none', cursor:isPending?'not-allowed':'pointer', outline:'none', opacity:isPending?0.6:1 }}>
        <option value="unpaid">미납</option>
        <option value="paid">완납</option>
        <option value="partial">부분납</option>
      </select>
      {isPending && <span style={{ fontSize:'0.7rem', color:'var(--c-text3)' }}>저장 중...</span>}
      {saved && !isPending && <span style={{ fontSize:'0.72rem', color:'var(--c-success-text)', fontWeight:600 }}>✓</span>}
    </div>
  )
}
