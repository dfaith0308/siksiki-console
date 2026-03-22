import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCustomerById, getCustomerOrders, getCustomerActivities } from '@/lib/customers'
import { getReceivableByCustomer } from '@/lib/receivables'
import { fmtAbbr, fmtNum, fmtDate, daysUntil } from '@/components/ui/Number'
import { CustomerStatusBadge, CustomerGradeBadge, PaymentBadge, ReceivableStatusBadge } from '@/components/ui/Badge'
import { TableEmpty } from '@/components/ui/Feedback'
import CustomerEditForm from '@/components/CustomerEditForm'
import ActivityForm from '@/components/ActivityForm'
import OrderPaymentStatusForm from '@/components/OrderPaymentStatusForm'

function daysSince(d: string|null|undefined) { if(!d) return 999; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000) }

async function CustomerDetailContent({ id, tab }: { id:string; tab:string }) {
  const [customer, orders, activities, receivable] = await Promise.all([
    getCustomerById(id).catch(()=>null), getCustomerOrders(id), getCustomerActivities(id), getReceivableByCustomer(id),
  ])
  if (!customer) notFound()

  const since   = daysSince(customer.last_order_date)
  const until   = daysUntil(customer.expected_reorder_date)
  const hasRec  = Number(customer.receivable_balance)>=300_000
  const isSoon  = until!==null&&until<=3
  const isDorm  = since>45

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/customers" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 거래처</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">{customer.name}</h1>
          <CustomerGradeBadge grade={customer.grade}/><CustomerStatusBadge status={customer.status}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href={`/print/ledger/${id}`} target="_blank" className="btn btn-outline btn-sm">원장 출력</Link>
          <Link href={`/orders/new?customer=${id}`} className="btn btn-primary btn-sm">+ 주문 등록</Link>
        </div>
      </div>

      {(hasRec||isSoon||isDorm) && (
        <div style={{padding:'10px 28px',borderBottom:'1px solid var(--c-border)',background:'var(--c-white)',display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:'0.7rem',fontWeight:700,color:'var(--c-text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>다음 행동</span>
          {hasRec && <Link href={`/customers/${id}?tab=receivable`} className="btn btn-sm btn-cta-r">⚠ 미수금 {fmtAbbr(customer.receivable_balance)}원 수금 처리</Link>}
          {isSoon && <Link href={`/orders/new?customer=${id}`} className="btn btn-sm btn-cta-g">재주문 {until!==null&&until<=0?`${Math.abs(until)}일 초과`:`${until}일 후`} — 주문 등록</Link>}
          {isDorm&&!isSoon && <Link href={`/customers/${id}?tab=activities`} className="btn btn-sm btn-cta-o">D+{since} 경과 — 재접촉 기록</Link>}
        </div>
      )}

      <div style={{padding:'14px 28px',borderBottom:'1px solid var(--c-border)',background:'var(--c-white)',display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:0}}>
        {[
          { label:'누적 매출',  value:fmtAbbr(customer.total_revenue)+'원', mono:true },
          { label:'총 주문 수', value:`${fmtNum(customer.total_orders)}건`,  mono:true },
          { label:'평균 주문',  value:fmtAbbr(customer.avg_order_value)+'원', mono:true },
          { label:'미수금',     value:fmtAbbr(customer.receivable_balance)+'원', color:Number(customer.receivable_balance)>0?'var(--c-danger-text)':undefined, mono:true },
          { label:'마지막 주문', value:fmtDate(customer.last_order_date), sub:customer.last_order_date?`D+${since}`:undefined, subColor:since>60?'var(--c-danger-text)':since>30?'var(--c-warning-text)':undefined },
          { label:'재주문 예정', value:fmtDate(customer.expected_reorder_date), sub:until!==null?(until<=0?`${Math.abs(until)}일 초과`:`D-${until}`):undefined, subColor:until!==null&&until<=3?'var(--c-danger-text)':undefined },
        ].map((s,i)=>(
          <div key={i} style={{padding:'0 18px',borderRight:i<5?'1px solid var(--c-border)':'none'}}>
            <div className="kpi-label">{s.label}</div>
            <div style={{fontSize:'1.0rem',fontWeight:600,color:s.color??'var(--c-text)',marginTop:5,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.value}</div>
            {s.sub&&<div style={{fontSize:'0.7rem',fontWeight:700,color:s.subColor??'var(--c-text3)',marginTop:2,fontFamily:'JetBrains Mono,monospace'}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="tab-nav">
        {[{k:'orders',l:`주문 이력 (${orders.length})`},{k:'receivable',l:'미수금'},{k:'activities',l:`활동 (${activities.length})`},{k:'info',l:'기본 정보'}].map(t=>(
          <Link key={t.k} href={`/customers/${id}?tab=${t.k}`} className={`tab-item${tab===t.k?' active':''}`}>{t.l}</Link>
        ))}
      </div>

      <div style={{padding:'20px 28px'}}>
        {tab==='orders' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>주문일</th><th>결제 방법</th><th>결제 상태</th><th className="r">매출</th><th className="r">마진</th><th className="r">미수금</th><th style={{width:80}}></th></tr></thead>
              <tbody>
                {orders.length===0&&<TableEmpty colSpan={7} message="주문 이력 없음"/>}
                {(orders as {id:string;order_date:string;payment_method:string|null;payment_status:string;total_sales:number;total_cost:number;total_margin:number}[]).map(o=>(
                  <tr key={o.id}>
                    <td className="mono muted">{fmtDate(o.order_date)}</td>
                    <td className="muted">{o.payment_method??'-'}</td>
                    <td><PaymentBadge status={o.payment_status}/></td>
                    <td className="r mono" style={{fontWeight:600}}>{fmtAbbr(Number(o.total_sales))}원</td>
                    <td className="r mono" style={{color:'var(--c-success-text)'}}>{fmtAbbr(Number(o.total_margin))}원</td>
                    <td className="r">{o.payment_status!=='paid'?<span className="mono" style={{color:'var(--c-danger-text)',fontWeight:700,fontSize:'0.8rem'}}>{fmtAbbr(Number(o.total_sales))}원</span>:<span className="muted">-</span>}</td>
                    <td><Link href={`/orders/${o.id}`} style={{fontSize:'0.75rem',color:'var(--c-primary)',textDecoration:'none',fontWeight:500}}>상세 →</Link></td>
                  </tr>
                ))}
              </tbody>
              {orders.length>0&&(
                <tfoot><tr>
                  <td colSpan={3} style={{textAlign:'right',color:'var(--c-text3)',fontSize:'0.78rem',fontWeight:700}}>합계</td>
                  <td className="r mono">{fmtAbbr((orders as {total_sales:number}[]).reduce((s,o)=>s+Number(o.total_sales),0))}원</td>
                  <td className="r mono" style={{color:'var(--c-success-text)'}}>{fmtAbbr((orders as {total_margin:number}[]).reduce((s,o)=>s+Number(o.total_margin),0))}원</td>
                  <td className="r mono" style={{color:'var(--c-danger-text)'}}>{fmtAbbr((orders as {payment_status:string;total_sales:number}[]).filter(o=>o.payment_status!=='paid').reduce((s,o)=>s+Number(o.total_sales),0))}원</td>
                  <td/>
                </tr></tfoot>
              )}
            </table>
          </div>
        )}

        {tab==='receivable' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="card card-pad">
              <div style={{marginBottom:16}}>
                <div className="kpi-label">미납 총액</div>
                <div className="kpi-value" style={{color:receivable&&Number(receivable.total_unpaid)>0?'var(--c-danger-text)':'var(--c-success-text)'}}><span className="mono">{fmtAbbr(receivable?.total_unpaid??0)}원</span></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><div className="kpi-label">미납 건수</div><div className="mono" style={{fontSize:'1.1rem',fontWeight:700,marginTop:4}}>{receivable?.unpaid_count??0}건</div></div>
                <div><div className="kpi-label">상태</div><div style={{marginTop:4}}><ReceivableStatusBadge status={receivable?.status??'normal'}/></div></div>
                <div><div className="kpi-label">최근 미납일</div><div className="mono muted" style={{fontSize:'0.82rem',marginTop:4}}>{fmtDate(receivable?.last_unpaid_date)}</div></div>
              </div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label" style={{marginBottom:12}}>미납 주문 목록</div>
              {(orders as {id:string;order_date:string;payment_status:string;total_sales:number}[]).filter(o=>o.payment_status!=='paid').length===0
                ? <p style={{fontSize:'0.82rem',color:'var(--c-success-text)',fontWeight:600}}>✓ 미납 주문 없음</p>
                : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {(orders as {id:string;order_date:string;payment_status:string;total_sales:number}[]).filter(o=>o.payment_status!=='paid').map(o=>(
                      <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'var(--c-danger-bg)',borderRadius:6,border:'1px solid var(--c-danger-border)'}}>
                        <div><span className="mono muted" style={{fontSize:'0.75rem'}}>{fmtDate(o.order_date)}</span><span style={{marginLeft:10}}><PaymentBadge status={o.payment_status}/></span></div>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span className="mono" style={{fontWeight:700,color:'var(--c-danger-text)'}}>{fmtAbbr(Number(o.total_sales))}원</span>
                          <OrderPaymentStatusForm orderId={o.id} currentStatus={o.payment_status as 'paid'|'unpaid'|'partial'}/>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {tab==='activities' && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <ActivityForm customerId={id}/>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>날짜</th><th>유형</th><th>채널</th><th>내용</th><th>다음 액션</th></tr></thead>
                <tbody>
                  {activities.length===0&&<TableEmpty colSpan={5} message="활동 이력 없음"/>}
                  {(activities as {id:string;created_at:string;activity_type:string;channel:string|null;result:string|null;next_action_date:string|null}[]).map(a=>{
                    const today=new Date().toISOString().split('T')[0]
                    return (
                      <tr key={a.id}>
                        <td className="mono muted">{fmtDate(a.created_at)}</td>
                        <td style={{fontWeight:600,fontSize:'0.82rem'}}>{a.activity_type}</td>
                        <td className="muted">{a.channel??'-'}</td>
                        <td style={{fontSize:'0.82rem',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.result??'-'}</td>
                        <td>{a.next_action_date?<span className="mono" style={{fontSize:'0.78rem',fontWeight:600,color:a.next_action_date>=today?'var(--c-primary)':'var(--c-text3)'}}>{a.next_action_date}</span>:<span className="muted">-</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='info' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="card card-pad">
              <div style={{marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--c-border)'}}><span className="section-title">거래처 정보</span></div>
              {[
                {label:'거래처명', value:customer.name},
                {label:'유형',     value:{restaurant:'음식점',retail:'소매',wholesale:'도매',supplier:'공급사'}[customer.type]??customer.type},
                {label:'전화번호', value:customer.phone},
                {label:'사업자번호', value:customer.business_number},
                {label:'업종',     value:customer.industry},
                {label:'첫 거래일', value:fmtDate(customer.first_order_date)},
                {label:'평균 주문주기', value:customer.avg_order_cycle_days?`${customer.avg_order_cycle_days}일`:null},
              ].map((row,i)=>(
                <div key={i} style={{display:'flex',gap:12,marginBottom:10}}>
                  <span style={{width:90,flexShrink:0,fontSize:'0.72rem',color:'var(--c-text3)',fontWeight:700,paddingTop:1,textTransform:'uppercase',letterSpacing:'0.04em'}}>{row.label}</span>
                  <span style={{fontSize:'0.83rem',color:'var(--c-text)'}}>{row.value??<span className="muted">-</span>}</span>
                </div>
              ))}
            </div>
            <CustomerEditForm customer={customer}/>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CustomerDetailPage({ params, searchParams }: { params:{id:string}; searchParams:Record<string,string> }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'40px 28px',color:'var(--c-text3)',fontSize:'0.82rem'}}>로딩 중...</div>}><CustomerDetailContent id={params.id} tab={searchParams.tab??'orders'}/></Suspense>
}
