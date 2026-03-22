import { Suspense } from 'react'
import Link from 'next/link'
import { getReceivables } from '@/lib/receivables'
import { fmtAbbr, fmtNum, fmtDate } from '@/components/ui/Number'
import { CustomerGradeBadge, ReceivableStatusBadge, PrioBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Feedback'

function daysSince(d: string|null|undefined) { if(!d) return null; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000) }

async function ReceivablesContent() {
  const list = await getReceivables()
  const total       = list.reduce((s,r)=>s+Number(r.total_unpaid),0)
  const riskCount   = list.filter(r=>r.status==='risk'||r.status==='long_term').length
  const warnCount   = list.filter(r=>r.status==='warning').length
  const sorted      = [...list].sort((a,b)=>Number(b.total_unpaid)-Number(a.total_unpaid))

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">미수금</h1><p className="page-sub">총 {fmtAbbr(total)}원 · 위험 {fmtNum(riskCount)}건 · 주의 {fmtNum(warnCount)}건</p></div>
        <Link href="/api/export/receivables" className="btn btn-outline btn-sm">Excel 내보내기</Link>
      </div>
      <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {label:'총 미수금',       value:fmtAbbr(total)+'원',          color:total>0?'var(--c-danger-text)':'var(--c-success-text)'},
            {label:'미수금 거래처 수', value:fmtNum(list.length)+'곳'},
            {label:'위험',            value:fmtNum(riskCount)+'건',         color:riskCount>0?'var(--c-danger-text)':'var(--c-text3)'},
            {label:'주의',            value:fmtNum(warnCount)+'건',         color:warnCount>0?'var(--c-warning-text)':'var(--c-text3)'},
          ].map(s=>(
            <div key={s.label} className="kpi-card">
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={s.color?{color:s.color}:{}}><span className="mono">{s.value}</span></div>
            </div>
          ))}
        </div>
        {total>0?<div className="alert-banner alert-o"><span>⚠</span><span>총 미수금 <strong>{fmtAbbr(total)}원</strong>이 있습니다.{riskCount>0&&` 위험 ${riskCount}건은 즉시 수금 조치가 필요합니다.`}</span></div>
          :<div className="alert-banner alert-g"><span>✓</span><span>미수금이 없습니다.</span></div>}
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th style={{width:40}}>우선</th><th>거래처명</th><th>등급</th><th className="r">미납 총액</th><th className="r">미납 건수</th><th>최근 미납일</th><th>연체 기간</th><th>상태</th><th style={{width:90}}>액션</th></tr></thead>
            <tbody>
              {sorted.length===0&&<tr><td colSpan={9} className="table-empty">미수금 없음</td></tr>}
              {sorted.map(r=>{
                const cust=(r as {customers?:{name?:string;grade?:string}}).customers
                const days=daysSince(r.last_unpaid_date)
                const prio: 'S'|'A'|'B' = Number(r.total_unpaid)>=1_000_000||(days!==null&&days>90)?'S':Number(r.total_unpaid)>=300_000||(days!==null&&days>30)?'A':'B'
                const isHigh=r.status==='risk'||r.status==='long_term'
                return (
                  <tr key={r.id} style={{background:isHigh?'rgba(239,68,68,0.025)':undefined}}>
                    <td style={{textAlign:'center'}}><PrioBadge level={prio}/></td>
                    <td><Link href={`/customers/${r.customer_id}?tab=receivable`} style={{fontWeight:700,fontSize:'0.85rem',color:'var(--c-text)',textDecoration:'none'}}>{cust?.name??'-'}</Link></td>
                    <td>{cust?.grade?<CustomerGradeBadge grade={cust.grade}/>:'-'}</td>
                    <td className="r"><span className="mono" style={{fontWeight:700,fontSize:'0.85rem',color:'var(--c-danger-text)'}}>{fmtNum(Number(r.total_unpaid))}원</span></td>
                    <td className="r mono" style={{fontSize:'0.82rem'}}>{r.unpaid_count}건</td>
                    <td className="mono muted" style={{fontSize:'0.8rem'}}>{fmtDate(r.last_unpaid_date)}</td>
                    <td>{days!==null?<span className="mono" style={{fontSize:'0.8rem',fontWeight:600,color:days>90?'var(--c-danger-text)':days>30?'var(--c-warning-text)':'var(--c-text3)'}}>{days}일</span>:<span className="muted">-</span>}</td>
                    <td><ReceivableStatusBadge status={r.status}/></td>
                    <td><Link href={`/customers/${r.customer_id}?tab=receivable`} className="btn-cta-r">수금 처리</Link></td>
                  </tr>
                )
              })}
            </tbody>
            {sorted.length>0&&(
              <tfoot><tr>
                <td colSpan={3} style={{textAlign:'right',fontSize:'0.78rem',color:'var(--c-text3)',fontWeight:700}}>합계</td>
                <td className="r mono" style={{fontWeight:700,color:'var(--c-danger-text)'}}>{fmtNum(total)}원</td>
                <td className="r mono">{list.reduce((s,r)=>s+r.unpaid_count,0)}건</td>
                <td colSpan={4}/>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ReceivablesPage() {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'16px 28px'}}><TableSkeleton rows={6} cols={9}/></div>}><ReceivablesContent/></Suspense>
}
