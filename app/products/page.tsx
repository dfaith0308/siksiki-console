import { Suspense } from 'react'
import Link from 'next/link'
import { getProducts } from '@/lib/products'
import { fmtNum, fmtAbbr, fmtDate } from '@/components/ui/Number'
import { TableSkeleton } from '@/components/ui/Feedback'

function mc(r: number) { return r<10?'var(--c-danger-text)':r<20?'var(--c-warning-text)':'var(--c-success-text)' }

async function ProductListContent({ searchParams }: { searchParams: Record<string,string> }) {
  const all = await getProducts()
  let list = [...all]
  if (searchParams.q) { const q=searchParams.q.toLowerCase(); list=list.filter(p=>p.name.toLowerCase().includes(q)||(p.category??'').toLowerCase().includes(q)) }
  if (searchParams.category) list=list.filter(p=>p.category===searchParams.category)
  const sort = searchParams.sort ?? 'name'
  list.sort((a,b)=>{
    if (sort==='margin') return Number(b.margin_rate)-Number(a.margin_rate)
    if (sort==='sales')  return Number(b.total_sales)-Number(a.total_sales)
    if (sort==='qty')    return Number(b.total_sold_qty)-Number(a.total_sold_qty)
    return a.name.localeCompare(b.name,'ko')
  })
  const cats = Array.from(new Set(all.map(p=>p.category).filter(Boolean))) as string[]
  const avgMargin = all.length ? (all.reduce((s,p)=>s+Number(p.margin_rate),0)/all.length).toFixed(1) : '0.0'

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">상품</h1><p className="page-sub">전체 {fmtNum(all.length)}종 · 평균 마진율 {avgMargin}%</p></div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/api/export/products" className="btn btn-outline btn-sm">Excel 내보내기</Link>
          <Link href="/products/new" className="btn btn-primary btn-sm">+ 상품 추가</Link>
        </div>
      </div>
      <div className="toolbar">
        <form style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input name="q" defaultValue={searchParams.q} placeholder="상품명 · 카테고리" className="form-input form-input-sm" style={{width:220}} autoComplete="off"/>
          <select name="category" defaultValue={searchParams.category??''} className="form-select form-select-sm" style={{width:140}}>
            <option value="">전체 카테고리</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select name="sort" defaultValue={searchParams.sort??'name'} className="form-select form-select-sm" style={{width:130}}>
            <option value="name">이름순</option><option value="margin">마진율 높은순</option>
            <option value="sales">총 매출순</option><option value="qty">판매수량순</option>
          </select>
          <button type="submit" className="btn btn-outline btn-sm">검색</button>
          <Link href="/products" className="btn btn-ghost btn-sm">초기화</Link>
        </form>
      </div>
      <div style={{padding:'16px 28px'}}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>상품명</th><th>카테고리</th><th className="r">공급가</th><th className="r">판매 기준가</th><th className="r">마진율</th><th className="r">총 판매수량</th><th className="r">총 매출</th><th>마지막 판매</th><th style={{width:72}}></th></tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={9} className="table-empty">조건에 맞는 상품이 없습니다</td></tr>}
              {list.map(p=>{
                const rate=Number(p.margin_rate)
                return (
                  <tr key={p.id}>
                    <td><Link href={`/products/${p.id}`} style={{fontWeight:700,fontSize:'0.85rem',color:'var(--c-text)',textDecoration:'none'}}>{p.name}</Link></td>
                    <td className="muted">{p.category??'-'}</td>
                    <td className="r mono" style={{fontSize:'0.82rem',color:'var(--c-text3)'}}>{fmtNum(Number(p.supply_price))}원</td>
                    <td className="r mono" style={{fontSize:'0.82rem',fontWeight:600}}>{fmtNum(Number(p.base_price))}원</td>
                    <td className="r"><span className="mono" style={{fontSize:'0.83rem',fontWeight:700,color:mc(rate)}}>{rate.toFixed(1)}%</span></td>
                    <td className="r mono" style={{fontSize:'0.82rem'}}>{fmtNum(p.total_sold_qty)}개</td>
                    <td className="r mono" style={{fontSize:'0.82rem',fontWeight:600}}>{fmtAbbr(p.total_sales)}원</td>
                    <td className="mono muted" style={{fontSize:'0.78rem'}}>{fmtDate(p.last_sold_at)}</td>
                    <td><Link href={`/products/${p.id}`} style={{fontSize:'0.75rem',color:'var(--c-primary)',textDecoration:'none',fontWeight:500}}>편집 →</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage({ searchParams }: { searchParams: Record<string,string> }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'16px 28px'}}><TableSkeleton rows={8} cols={9}/></div>}><ProductListContent searchParams={searchParams}/></Suspense>
}
