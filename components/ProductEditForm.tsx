'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct, updateProduct } from '@/lib/products'
import { fmtNum } from '@/components/ui/Number'
import type { Product } from '@/types'

export default function ProductEditForm({ product }: { product?: Product }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name:product?.name??'', category:product?.category??'', supply_price:String(product?.supply_price??''), base_price:String(product?.base_price??''), reorder_cycle_days:String(product?.reorder_cycle_days??'14') })

  const sp = parseFloat(form.supply_price) || 0
  const bp = parseFloat(form.base_price)   || 0
  const margin = bp > 0 ? (((bp - sp) / bp) * 100) : 0
  const mc = margin < 10 ? 'var(--c-danger-text)' : margin < 20 ? 'var(--c-warning-text)' : 'var(--c-success-text)'

  function set(k: string, v: string) { setForm(p=>({...p,[k]:v})); setSuccess(false) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('상품명을 입력해주세요.'); return }
    if (sp <= 0) { setError('공급가를 입력해주세요.'); return }
    if (bp <= 0) { setError('판매 기준가를 입력해주세요.'); return }
    setError('')
    startTransition(async () => {
      try {
        const p = { name:form.name.trim(), category:form.category.trim()||undefined, supply_price:sp, base_price:bp, reorder_cycle_days:parseInt(form.reorder_cycle_days)||14 }
        if (product) { await updateProduct(product.id, p); setSuccess(true); router.refresh() }
        else { const c = await createProduct(p); router.push(`/products/${c.id}`) }
      } catch (err: unknown) { setError(err instanceof Error ? err.message : '오류가 발생했습니다.') }
    })
  }

  const FL: React.CSSProperties = { display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--c-text3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="card" style={{ overflow:'hidden' }}>
        <div className="section-head"><span className="section-title">{product?'상품 정보 편집':'신규 상품 등록'}</span></div>
        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={FL}>상품명 <span style={{color:'var(--c-danger)'}}>*</span></label>
              <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} required className="form-input" placeholder="상품명 입력" autoFocus={!product} />
            </div>
            <div>
              <label style={FL}>카테고리</label>
              <input type="text" value={form.category} onChange={e=>set('category',e.target.value)} className="form-input" placeholder="예: 육류, 채소" />
            </div>
            <div>
              <label style={FL}>재주문 주기 (일)</label>
              <input type="number" min={1} value={form.reorder_cycle_days} onChange={e=>set('reorder_cycle_days',e.target.value)} className="form-input form-input-mono" />
            </div>
            <div>
              <label style={FL}>공급가 (원) <span style={{color:'var(--c-danger)'}}>*</span></label>
              <input type="number" min={0} step="1" value={form.supply_price} onChange={e=>set('supply_price',e.target.value)} required className="form-input form-input-mono" placeholder="0" />
              {sp > 0 && <div style={{ fontSize:'0.7rem', color:'var(--c-text3)', marginTop:3, textAlign:'right', fontFamily:'JetBrains Mono,monospace' }}>{fmtNum(sp)}원</div>}
            </div>
            <div>
              <label style={FL}>판매 기준가 (원) <span style={{color:'var(--c-danger)'}}>*</span></label>
              <input type="number" min={0} step="1" value={form.base_price} onChange={e=>set('base_price',e.target.value)} required className="form-input form-input-mono" placeholder="0" />
              {bp > 0 && <div style={{ fontSize:'0.7rem', color:'var(--c-text3)', marginTop:3, textAlign:'right', fontFamily:'JetBrains Mono,monospace' }}>{fmtNum(bp)}원</div>}
            </div>
          </div>
          {sp > 0 && bp > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:'var(--r-md)', background: margin<10?'var(--c-danger-bg)':margin<20?'var(--c-warning-bg)':'var(--c-success-bg)', border:`1px solid ${margin<10?'var(--c-danger-border)':margin<20?'var(--c-warning-border)':'var(--c-success-border)'}` }}>
              <span style={{ fontSize:'0.78rem', color:mc, fontWeight:600 }}>마진율 (자동 계산)</span>
              <span className="mono" style={{ fontSize:'1.4rem', fontWeight:700, color:mc }}>{margin.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
      {error   && <div className="alert-banner alert-r"><span>⚠</span><span>{error}</span></div>}
      {success && <div className="alert-banner alert-g"><span>✓</span><span>저장되었습니다.</span></div>}
      <div style={{ display:'flex', gap:8 }}>
        <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">{isPending?'저장 중...':product?'저장':'등록'}</button>
        {!product && <button type="button" onClick={()=>router.back()} className="btn btn-outline btn-sm">취소</button>}
      </div>
    </form>
  )
}
