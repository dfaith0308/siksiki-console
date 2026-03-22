import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/orders'
import { fmtNum, fmtAbbr, fmtDate } from '@/components/ui/Number'
import OrderPaymentStatusForm from '@/components/OrderPaymentStatusForm'

async function OrderDetailContent({ id }: { id:string }) {
  const order = await getOrderById(id).catch(()=>null)
  if (!order) notFound()
  const items    = (order as {order_items?:unknown[]}).order_items ?? []
  const customer = (order as {customers?:{name?:string;id?:string}}).customers
  const mRate    = Number(order.total_sales)>0?((Number(order.total_margin)/Number(order.total_sales))*100).toFixed(1):'0.0'

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/orders" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 주문</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">주문 상세</h1>
          <span className="mono" style={{fontSize:'0.78rem',color:'var(--c-text3)'}}>{fmtDate(order.order_date)}</span>
        </div>
        <Link href={`/print/invoice/${id}`} target="_blank" className="btn btn-outline btn-sm">전표 출력</Link>
      </div>
      <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
          <div className="kpi-card" style={{padding:'14px 16px'}}>
            <div className="kpi-label">거래처</div>
            <div style={{marginTop:7}}>{customer?<Link href={`/customers/${order.customer_id}`} style={{fontWeight:700,color:'var(--c-text)',textDecoration:'none',fontSize:'0.9rem'}}>{customer.name}</Link>:<span style={{color:'var(--c-text3)'}}>-</span>}</div>
          </div>
          <div className="kpi-card" style={{padding:'14px 16px'}}>
            <div className="kpi-label">결제 방법</div>
            <div style={{marginTop:7,fontWeight:600,fontSize:'0.9rem'}}>{order.payment_method??'-'}</div>
          </div>
          <div className="kpi-card" style={{padding:'14px 16px'}}>
            <div className="kpi-label">결제 상태</div>
            <div style={{marginTop:7}}><OrderPaymentStatusForm orderId={id} currentStatus={order.payment_status}/></div>
          </div>
          <div className="kpi-card" style={{padding:'14px 16px'}}>
            <div className="kpi-label">매출 / 마진율</div>
            <div style={{marginTop:7}}><span className="mono" style={{fontWeight:700,fontSize:'0.9rem',color:'var(--c-success-text)'}}>{fmtAbbr(Number(order.total_sales))}원 · {mRate}%</span></div>
          </div>
          <div className="kpi-card" style={{padding:'14px 16px'}}>
            <div className="kpi-label">등록일</div>
            <div style={{marginTop:7}}><span className="mono muted" style={{fontSize:'0.82rem'}}>{fmtDate(order.created_at)}</span></div>
          </div>
        </div>
        <div className="table-wrap">
          <div className="section-head"><span className="section-title">주문 품목 ({items.length}개)</span></div>
          <table className="data-table">
            <thead><tr><th>상품명</th><th className="r">수량</th><th className="r">단가</th><th className="r">공급가</th><th className="r">매출액</th><th className="r">원가</th><th className="r">마진</th></tr></thead>
            <tbody>
              {(items as {id:string;products?:{name?:string};product_id:string;qty:number;unit_price:number;supply_price:number;sales_amount:number;cost_amount:number;margin_amount:number}[]).map(item=>{
                const mr=Number(item.sales_amount)>0?((Number(item.margin_amount)/Number(item.sales_amount))*100).toFixed(1):'0'
                return (
                  <tr key={item.id}>
                    <td style={{fontWeight:600,fontSize:'0.85rem'}}>{item.products?.name??item.product_id}</td>
                    <td className="r mono">{fmtNum(item.qty)}</td>
                    <td className="r mono" style={{color:'var(--c-text3)'}}>{fmtNum(Number(item.unit_price))}원</td>
                    <td className="r mono" style={{color:'var(--c-text3)'}}>{fmtNum(Number(item.supply_price))}원</td>
                    <td className="r mono" style={{fontWeight:600}}>{fmtNum(Number(item.sales_amount))}원</td>
                    <td className="r mono muted">{fmtNum(Number(item.cost_amount))}원</td>
                    <td className="r"><span className="mono" style={{fontWeight:700,color:'var(--c-success-text)',fontSize:'0.83rem'}}>{fmtNum(Number(item.margin_amount))}원<span style={{fontWeight:400,fontSize:'0.7rem',marginLeft:4,opacity:0.7}}>({mr}%)</span></span></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={4} style={{textAlign:'right',color:'var(--c-text3)',fontSize:'0.78rem',fontWeight:700}}>합계</td>
              <td className="r mono" style={{fontWeight:700}}>{fmtNum(Number(order.total_sales))}원</td>
              <td className="r mono" style={{color:'var(--c-text3)'}}>{fmtNum(Number(order.total_cost))}원</td>
              <td className="r mono" style={{fontWeight:700,color:'var(--c-success-text)'}}>{fmtNum(Number(order.total_margin))}원<span style={{fontWeight:400,fontSize:'0.7rem',marginLeft:4,opacity:0.7}}>({mRate}%)</span></td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params:{id:string} }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'40px 28px',color:'var(--c-text3)',fontSize:'0.82rem'}}>로딩 중...</div>}><OrderDetailContent id={params.id}/></Suspense>
}
