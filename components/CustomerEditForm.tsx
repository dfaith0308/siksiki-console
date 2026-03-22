'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomer, createCustomer } from '@/lib/customers'
import type { Customer } from '@/types'

export default function CustomerEditForm({ customer, isNew }: { customer?: Customer; isNew?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: customer?.name ?? '', type: customer?.type ?? 'restaurant',
    phone: customer?.phone ?? '', business_number: customer?.business_number ?? '',
    industry: customer?.industry ?? '', status: customer?.status ?? 'active', grade: customer?.grade ?? 'normal',
  })

  function set(k: string, v: string) { setForm(p=>({...p,[k]:v})); setSuccess(false) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('거래처명을 입력해주세요.'); return }
    setError('')
    startTransition(async () => {
      try {
        const p = { name:form.name.trim(), type:form.type as never, phone:form.phone||undefined, business_number:form.business_number||undefined, industry:form.industry||undefined, status:form.status as never, grade:form.grade as never }
        if (isNew || !customer) { const c = await createCustomer(p); router.push(`/customers/${c.id}`) }
        else { await updateCustomer(customer.id, p); setSuccess(true); router.refresh() }
      } catch (err: unknown) { setError(err instanceof Error ? err.message : '오류가 발생했습니다.') }
    })
  }

  const FL: React.CSSProperties = { display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--c-text3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div className="card" style={{ overflow:'hidden' }}>
        <div className="section-head"><span className="section-title">{isNew?'신규 거래처 등록':'거래처 정보 편집'}</span></div>
        <div style={{ padding:'18px 20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1', marginBottom:2 }}>
              <label style={FL}>거래처명 <span style={{color:'var(--c-danger)'}}>*</span></label>
              <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} required className="form-input" placeholder="거래처명을 입력해주세요" autoFocus={isNew} />
            </div>
            {([
              { k:'type',   l:'유형',     t:'select', opts:[['restaurant','음식점'],['retail','소매'],['wholesale','도매'],['supplier','공급사']] },
              { k:'grade',  l:'등급',     t:'select', opts:[['vip','VIP'],['core','핵심'],['normal','일반'],['risk','위험']] },
              { k:'status', l:'상태',     t:'select', opts:[['active','활성'],['dormant','휴면'],['churn_risk','이탈위험']] },
              { k:'phone',  l:'전화번호', t:'text',   ph:'010-0000-0000' },
              { k:'business_number', l:'사업자번호', t:'text', ph:'000-00-00000' },
              { k:'industry', l:'업종',  t:'text',   ph:'예: 한식, 카페' },
            ] as const).map(f => (
              <div key={f.k} style={{ marginBottom:2 }}>
                <label style={FL}>{f.l}</label>
                {f.t === 'select' ? (
                  <select value={(form as Record<string,string>)[f.k]} onChange={e=>set(f.k,e.target.value)} className="form-select">
                    {(f.opts as string[][]).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <input type="text" value={(form as Record<string,string>)[f.k]} onChange={e=>set(f.k,e.target.value)} className="form-input" placeholder={'ph' in f ? f.ph : ''} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {error   && <div className="alert-banner alert-r" style={{marginTop:12}}><span>⚠</span><span>{error}</span></div>}
      {success && <div className="alert-banner alert-g" style={{marginTop:12}}><span>✓</span><span>저장되었습니다.</span></div>}
      <div style={{ display:'flex', gap:8, marginTop:14 }}>
        <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">{isPending?'저장 중...':isNew?'등록':'저장'}</button>
        {isNew && <button type="button" onClick={()=>router.back()} className="btn btn-outline btn-sm">취소</button>}
      </div>
    </form>
  )
}
