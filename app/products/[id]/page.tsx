import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/products'
import { fmtNum, fmtAbbr, fmtDate } from '@/components/ui/Number'
import ProductEditForm from '@/components/ProductEditForm'

async function ProductDetailContent({ id }: { id:string }) {
  const product = await getProductById(id).catch(()=>null)
  if (!product) notFound()
  const rate=Number(product.margin_rate)
  const rc=rate<10?'var(--c-danger-text)':rate<20?'var(--c-warning-text)':'var(--c-success-text)'
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/products" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 상품</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">{product.name}</h1>
          {product.category&&<span className="badge badge-gray">{product.category}</span>}
        </div>
      </div>
      <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
          {[
            {label:'마진율',      value:`${rate.toFixed(1)}%`, color:rc},
            {label:'공급가',      value:`${fmtNum(Number(product.supply_price))}원`},
            {label:'판매 기준가', value:`${fmtNum(Number(product.base_price))}원`},
            {label:'총 판매수량', value:`${fmtNum(product.total_sold_qty)}개`},
            {label:'총 매출',     value:`${fmtAbbr(product.total_sales)}원`},
          ].map(s=>(
            <div key={s.label} className="kpi-card">
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={{fontSize:'1.1rem',color:s.color??'var(--c-text)'}}><span className="mono">{s.value}</span></div>
            </div>
          ))}
        </div>
        <div style={{maxWidth:520}}><ProductEditForm product={product}/></div>
      </div>
    </div>
  )
}

export default function ProductDetailPage({ params }: { params:{id:string} }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'40px 28px',color:'var(--c-text3)',fontSize:'0.82rem'}}>로딩 중...</div>}><ProductDetailContent id={params.id}/></Suspense>
}
