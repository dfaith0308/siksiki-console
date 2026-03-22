import React from 'react'

type V = 'green' | 'orange' | 'red' | 'gray' | 'blue'
const VM: Record<V, string> = { green:'badge badge-green', orange:'badge badge-orange', red:'badge badge-red', gray:'badge badge-gray', blue:'badge badge-blue' }

export function Badge({ variant, children }: { variant: V; children: React.ReactNode }) {
  return <span className={VM[variant]}>{children}</span>
}

export function CustomerStatusBadge({ status }: { status: string }) {
  const m: Record<string, { v: V; l: string }> = { active:{v:'green',l:'활성'}, dormant:{v:'gray',l:'휴면'}, churn_risk:{v:'red',l:'이탈위험'} }
  const c = m[status] ?? { v: 'gray' as V, l: status }
  return <Badge variant={c.v}>{c.l}</Badge>
}

export function CustomerGradeBadge({ grade }: { grade: string }) {
  const m: Record<string, { v: V; l: string }> = { vip:{v:'blue',l:'VIP'}, core:{v:'green',l:'핵심'}, normal:{v:'gray',l:'일반'}, risk:{v:'red',l:'위험'} }
  const c = m[grade] ?? { v: 'gray' as V, l: grade }
  return <Badge variant={c.v}>{c.l}</Badge>
}

export function PaymentBadge({ status }: { status: string }) {
  const m: Record<string, { v: V; l: string }> = { paid:{v:'green',l:'완납'}, unpaid:{v:'red',l:'미납'}, partial:{v:'orange',l:'부분납'} }
  const c = m[status] ?? { v: 'gray' as V, l: status }
  return <Badge variant={c.v}>{c.l}</Badge>
}

export function ReceivableStatusBadge({ status }: { status: string }) {
  const m: Record<string, { v: V; l: string }> = { normal:{v:'green',l:'정상'}, warning:{v:'orange',l:'주의'}, risk:{v:'red',l:'위험'}, long_term:{v:'red',l:'장기연체'} }
  const c = m[status] ?? { v: 'gray' as V, l: status }
  return <Badge variant={c.v}>{c.l}</Badge>
}

export function PrioBadge({ level }: { level: 'S' | 'A' | 'B' }) {
  return <span className={`prio prio-${level.toLowerCase()}`}>{level}</span>
}
