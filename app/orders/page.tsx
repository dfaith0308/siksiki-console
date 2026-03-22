import { Suspense } from 'react'
import Link from 'next/link'
import { fmtAbbr, fmtNum, fmtDate } from '@/components/ui/Number'
import { PaymentBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Feedback'

async function OrderListContent({ searchParams }: { searchParams: Record<string,string> }) {
const orders: any[] = []
const customers: any[] = []
  const totalSales  = orders.reduce((s,o)=>s+Number(o.total_sales),0)
  const totalCost   = orders.reduce((s,o)=>s+Number(o.total_cost),0)
  const totalMargin = orders.reduce((s,o)=>s+Number(o.total_margin),0)
  const mRate = totalSales>0?((totalMargin/totalSales)*100).toFixed(1):'0.0'

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <h1 className="page-title">주문</h1>
          <p className="page-sub">{fmtNum(orders.length)}건 · 매출 {fmtAbbr(totalSales)}원 · 마진 {fmtAbbr(totalMargin)}원 ({mRate}%)</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/api/export/orders" className="btn btn-outline btn-sm">Excel 내보내기</Link>
          <Link href="/orders/new" className="btn btn-primary btn-sm">+ 주문 등록</Link>
        </div>
      </div>
      <div className="toolbar">
        <form style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input type="date" name="from" defaultValue={searchParams.from} className="form-input form-input-sm" style={{width:148}}/>
          <span style={{alignSelf:'center',color:'var(--c-text3)',fontSize:'0.8rem'}}>~</span>
          <input type="date" name="to" defaultValue={searchParams.to} className="form-input form-input-sm" style={{width:148}}/>
          <select name="customer" defaultValue={searchParams.customer??''} className="form-select form-select-sm" style={{width:170}}>
            <option value="">전체 거래처</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="payment_status" defaultValue={searchParams.payment_status??''} className="form-select form-select-sm" style={{width:120}}>
            <option value="">전체 상태</option>
            <option value="paid">완납</option><option value="unpaid">미납</option><option value="partial">부분납</option>
          </select>
          <button type="submit" className="btn btn-outline btn-sm">검색</button>
          <Link href="/orders" className="btn btn-ghost btn-sm">초기화</Link>
        </form>
      </div>
      <div style={{padding:'16px 28px'}}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>주문일</th><th>거래처</th><th>결제 방법</th><th>결제 상태</th><th className="r">매출</th><th className="r">원가</th><th className="r">마진</th><th style={{width:90}}></th></tr></thead>
            <tbody>
              {orders.length===0&&<tr><td colSpan={8} className="table-empty">조건에 맞는 주문이 없습니다</td></tr>}
              {(orders as (typeof orders[0] & {customers?:{name?:string};})[]).map(o=>(
                <tr key={o.id}>
                  <td className="mono muted">{fmtDate(o.order_date)}</td>
                  <td>{o.customers?<Link href={`/customers/${o.customer_id}`} style={{fontWeight:600,fontSize:'0.85rem',color:'var(--c-text)',textDecoration:'none'}}>{o.customers.name}</Link>:'-'}</td>
                  <td className="muted">{o.payment_method??'-'}</td>
                  <td><PaymentBadge status={o.payment_status}/></td>
                  <td className="r mono" style={{fontWeight:600,fontSize:'0.83rem'}}>{fmtAbbr(Number(o.total_sales))}원</td>
                  <td className="r mono muted" style={{fontSize:'0.82rem'}}>{fmtAbbr(Number(o.total_cost))}원</td>
                  <td className="r mono" style={{fontSize:'0.83rem',color:'var(--c-success-text)',fontWeight:600}}>{fmtAbbr(Number(o.total_margin))}원</td>
                  <td><div style={{display:'flex',gap:8}}><Link href={`/orders/${o.id}`} style={{fontSize:'0.75rem',color:'var(--c-primary)',textDecoration:'none',fontWeight:500}}>상세</Link><Link href={`/print/invoice/${o.id}`} target="_blank" style={{fontSize:'0.75rem',color:'var(--c-text3)',textDecoration:'none'}}>전표</Link></div></td>
                </tr>
              ))}
            </tbody>
            {orders.length>0&&(
              <tfoot><tr>
                <td colSpan={4} style={{textAlign:'right',fontWeight:700,fontSize:'0.78rem',color:'var(--c-text3)'}}>합계 ({fmtNum(orders.length)}건)</td>
                <td className="r mono" style={{fontWeight:700}}>{fmtAbbr(totalSales)}원</td>
                <td className="r mono" style={{color:'var(--c-text3)'}}>{fmtAbbr(totalCost)}원</td>
                <td className="r mono" style={{color:'var(--c-success-text)',fontWeight:700}}>{fmtAbbr(totalMargin)}원</td>
                <td/>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage({ searchParams }: { searchParams: Record<string,string> }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'16px 28px'}}><TableSkeleton rows={8} cols={8}/></div>}><OrderListContent searchParams={searchParams}/></Suspense>
}
