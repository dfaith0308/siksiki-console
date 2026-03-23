'use client'

import { useState, useCallback, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder, getAutofillPrice } from '@/lib/orders'
import { fmtNum } from '@/components/ui/Number'
import type { Customer, Product } from '@/types'

interface Line { _id:string; product_id:string; qty:number; unit_price:number; supply_price:number; sales_amount:number; cost_amount:number; margin_amount:number; _loading:boolean }

function recalc(l: Line): Line {
  const s = Number((l.qty*l.unit_price).toFixed(2)), c = Number((l.qty*l.supply_price).toFixed(2))
  return { ...l, sales_amount:s, cost_amount:c, margin_amount:Number((s-c).toFixed(2)) }
}
function newLine(): Line { return { _id:crypto.randomUUID(), product_id:'', qty:1, unit_price:0, supply_price:0, sales_amount:0, cost_amount:0, margin_amount:0, _loading:false } }

// 거래처 검색 자동완성 컴포넌트
function CustomerSearch({ customers, value, onChange, autoFocus }: {
  customers: Customer[]
  value: string
  onChange: (id: string) => void
  autoFocus?: boolean
}) {
  const selected = customers.find(c => c.id === value)
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim() === ''
    ? customers
    : customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    setQuery(selected?.name ?? '')
  }, [value, selected?.name])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(c: Customer) {
    onChange(c.id)
    setQuery(c.name)
    setOpen(false)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
    if (e.target.value === '') onChange('')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder="거래처명 검색..."
        className="form-input"
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--c-white)', border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: 220, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                background: c.id === value ? 'var(--c-primary-light)' : 'transparent',
                color: c.id === value ? 'var(--c-primary)' : 'var(--c-text)',
                fontWeight: c.id === value ? 700 : 400,
              }}
              onMouseEnter={e => { if (c.id !== value) (e.target as HTMLDivElement).style.background = 'var(--c-surf)' }}
              onMouseLeave={e => { if (c.id !== value) (e.target as HTMLDivElement).style.background = 'transparent' }}
            >
              {c.name}
              {c.industry && <span style={{ fontSize: '0.75rem', color: 'var(--c-text3)', marginLeft: 8 }}>{c.industry}</span>}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query.trim() !== '' && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--c-white)', border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '12px', fontSize: '0.82rem', color: 'var(--c-text3)', marginTop: 2,
        }}>
          검색 결과 없음
        </div>
      )}
    </div>
  )
}

export default function OrderForm({ customers, products, defaultCustomerId }: { customers:Customer[]; products:Product[]; defaultCustomerId?:string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [customerId, setCustomerId]   = useState(defaultCustomerId ?? '')
  const [orderDate,  setOrderDate]    = useState(new Date().toISOString().split('T')[0])
  const [payMethod,  setPayMethod]    = useState('외상')
  const [payStat,    setPayStat]      = useState<'paid'|'unpaid'|'partial'>('unpaid')
  const [lines,      setLines]        = useState<Line[]>([newLine()])
  const [error,      setError]        = useState('')
  const pRefs = useRef<(HTMLSelectElement|null)[]>([])
  const qRefs = useRef<(HTMLInputElement|null)[]>([])

  const totalSales  = lines.reduce((s,l)=>s+l.sales_amount,0)
  const totalCost   = lines.reduce((s,l)=>s+l.cost_amount,0)
  const totalMargin = totalSales - totalCost
  const marginRate  = totalSales > 0 ? ((totalMargin/totalSales)*100).toFixed(1) : '0.0'

  const autofill = useCallback(async (id:string, pid:string, cid:string) => {
    if (!pid) return
    setLines(p=>p.map(l=>l._id===id?{...l,_loading:true}:l))
    try {
      const prices = cid ? await getAutofillPrice(cid,pid) : (() => { const p=products.find(x=>x.id===pid); return p?{unit_price:Number(p.base_price),supply_price:Number(p.supply_price)}:null })()
      if (prices) setLines(p=>p.map(l=>l._id===id?recalc({...l,unit_price:prices.unit_price,supply_price:prices.supply_price,_loading:false}):l))
    } catch {
      const p=products.find(x=>x.id===pid)
      if (p) setLines(prev=>prev.map(l=>l._id===id?recalc({...l,unit_price:Number(p.base_price),supply_price:Number(p.supply_price),_loading:false}):l))
      else setLines(p=>p.map(l=>l._id===id?{...l,_loading:false}:l))
    }
  }, [products])

  function handleProductChange(id:string, pid:string, idx:number) {
    setLines(p=>p.map(l=>l._id===id?{...l,product_id:pid}:l))
    autofill(id,pid,customerId)
    setTimeout(()=>qRefs.current[idx]?.focus(),80)
  }

  function handleCustomerChange(cid:string) {
    setCustomerId(cid)
    lines.forEach(l=>{ if(l.product_id) autofill(l._id,l.product_id,cid) })
  }

  function addLine() {
    const nl=newLine(); setLines(p=>[...p,nl])
    setTimeout(()=>pRefs.current[lines.length]?.focus(),60)
  }

  function handleQtyKey(e:React.KeyboardEvent, idx:number) {
    if (e.key==='Enter') { e.preventDefault(); if(idx===lines.length-1) addLine(); else pRefs.current[idx+1]?.focus() }
  }

  function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setError('')
    if (!customerId)                    { setError('거래처를 선택해주세요.'); return }
    if (!orderDate)                     { setError('주문일을 입력해주세요.'); return }
    if (lines.some(l=>!l.product_id))   { setError('모든 품목의 상품을 선택해주세요.'); return }
    if (lines.some(l=>l.qty<=0))        { setError('수량을 입력해주세요.'); return }
    startTransition(async () => {
      try {
        await createOrder({ customer_id:customerId, order_date:orderDate, payment_method:payMethod||undefined, payment_status:payStat, items:lines.map(l=>({ product_id:l.product_id,qty:l.qty,unit_price:l.unit_price,supply_price:l.supply_price })) })
        router.push('/orders'); router.refresh()
      } catch (err:unknown) { setError(err instanceof Error?err.message:'주문 등록 중 오류가 발생했습니다.') }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:1100 }}>
      <div className="card" style={{ overflow:'hidden' }}>
        <div className="section-head"><span className="section-title">주문 기본 정보</span></div>
        <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:14 }}>
          <div>
            <label className="form-label">거래처 <span style={{color:'var(--c-danger)'}}>*</span></label>
            <CustomerSearch
              customers={customers}
              value={customerId}
              onChange={handleCustomerChange}
              autoFocus={!defaultCustomerId}
            />
          </div>
          <div>
            <label className="form-label">주문일 <span style={{color:'var(--c-danger)'}}>*</span></label>
            <input type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)} className="form-input" required />
          </div>
          <div>
            <label className="form-label">결제 방법</label>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="form-select">
              <option value="외상">외상</option><option value="현금">현금</option>
              <option value="계좌이체">계좌이체</option><option value="카드">카드</option>
            </select>
          </div>
          <div>
            <label className="form-label">결제 상태 <span style={{color:'var(--c-danger)'}}>*</span></label>
            <select value={payStat} onChange={e=>setPayStat(e.target.value as never)} className="form-select">
              <option value="unpaid">미납</option><option value="paid">완납</option><option value="partial">부분납</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow:'visible' }}>
        <div className="section-head">
          <span className="section-title">주문 품목</span>
          <button type="button" onClick={addLine} style={{ fontSize:'0.75rem', color:'var(--c-primary)', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>+ 품목 추가</button>
        </div>
        <div className="order-line-head">
          <span>상품 <span style={{color:'var(--c-danger)',fontSize:'0.7rem'}}>*</span></span>
          <span style={{textAlign:'right'}}>수량</span><span style={{textAlign:'right'}}>단가(원)</span><span style={{textAlign:'right'}}>공급가(원)</span>
          <span style={{textAlign:'right'}}>매출액</span><span style={{textAlign:'right'}}>원가</span><span style={{textAlign:'right'}}>마진</span><span/>
        </div>
        {lines.map((line,idx)=>{
          const mr = line.sales_amount>0 ? ((line.margin_amount/line.sales_amount)*100).toFixed(1) : null
          const mc = line.margin_amount<0?'var(--c-danger-text)':Number(mr)<10?'var(--c-warning-text)':'var(--c-success-text)'
          return (
            <div key={line._id} className="order-line-row">
              <div style={{position:'relative'}}>
                <select ref={el=>{pRefs.current[idx]=el}} value={line.product_id} onChange={e=>handleProductChange(line._id,e.target.value,idx)} className="form-select form-select-sm" required>
                  <option value="">상품 선택</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {line._loading && <span style={{position:'absolute',right:32,top:'50%',transform:'translateY(-50%)',fontSize:'0.63rem',color:'var(--c-text3)'}}>로드중</span>}
              </div>
              <input ref={el=>{qRefs.current[idx]=el}} type="number" min={1} value={line.qty} onChange={e=>setLines(p=>p.map(l=>l._id===line._id?recalc({...l,qty:Math.max(1,Number(e.target.value))}):l))} onKeyDown={e=>handleQtyKey(e,idx)} className="form-input form-input-sm form-input-mono" required />
              <input type="number" min={0} step="1" value={line.unit_price} onChange={e=>setLines(p=>p.map(l=>l._id===line._id?recalc({...l,unit_price:Number(e.target.value)}):l))} className="form-input form-input-sm form-input-mono" />
              <input type="number" min={0} step="1" value={line.supply_price} onChange={e=>setLines(p=>p.map(l=>l._id===line._id?recalc({...l,supply_price:Number(e.target.value)}):l))} className="form-input form-input-sm form-input-mono" />
              <div style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontSize:'0.82rem',fontWeight:600}}>{fmtNum(line.sales_amount)}</div>
              <div style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontSize:'0.82rem',color:'var(--c-text3)'}}>{fmtNum(line.cost_amount)}</div>
              <div style={{textAlign:'right'}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.82rem',fontWeight:700,color:mc}}>{fmtNum(line.margin_amount)}</span>
                {mr && <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.68rem',color:mc,opacity:0.7,marginLeft:3}}>({mr}%)</span>}
              </div>
              <button type="button" onClick={()=>{if(lines.length>1) setLines(p=>p.filter(l=>l._id!==line._id))}} disabled={lines.length===1} style={{background:'none',border:'none',cursor:lines.length===1?'not-allowed':'pointer',color:lines.length===1?'var(--c-border2)':'var(--c-text3)',fontSize:'1rem',padding:2,borderRadius:3}}>×</button>
            </div>
          )
        })}
        <div className="order-total-row">
          <span style={{gridColumn:'1/5',textAlign:'right',fontSize:'0.75rem',color:'var(--c-text3)'}}>합계 ({lines.length}품목)</span>
          <span style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{fmtNum(totalSales)}</span>
          <span style={{textAlign:'right',fontFamily:'JetBrains Mono,monospace',color:'var(--c-text3)'}}>{fmtNum(totalCost)}</span>
          <span style={{textAlign:'right'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:totalMargin<0?'var(--c-danger-text)':'var(--c-success-text)'}}>{fmtNum(totalMargin)}</span>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',opacity:0.7,marginLeft:4,color:'var(--c-text3)'}}>({marginRate}%)</span>
          </span>
          <span/>
        </div>
        <div style={{padding:'8px 16px',borderTop:'1px solid var(--c-border)',background:'var(--c-surf)'}}>
          <span style={{fontSize:'0.68rem',color:'var(--c-text3)'}}>수량 입력 후 <kbd style={{background:'var(--c-border)',padding:'1px 5px',borderRadius:3,fontFamily:'monospace',fontSize:'0.65rem'}}>Enter</kbd> → 다음 품목 추가</span>
        </div>
      </div>

      {error && <div className="alert-banner alert-r"><span>⚠</span><span>{error}</span></div>}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <button type="submit" disabled={isPending} className="btn btn-primary btn-lg">{isPending?'등록 중...':'주문 등록'}</button>
        <button type="button" onClick={()=>router.back()} className="btn btn-outline">취소</button>
        {isPending && <span style={{fontSize:'0.75rem',color:'var(--c-text3)'}}>서버에서 검증 및 저장 중...</span>}
      </div>
    </form>
  )
}