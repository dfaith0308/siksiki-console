import { Suspense } from 'react'
import Link from 'next/link'
import { getActivities } from '@/lib/activities'
import { fmtDate, fmtNum } from '@/components/ui/Number'
import { TableSkeleton } from '@/components/ui/Feedback'

async function ActivitiesContent() {
  const all     = await getActivities()
  const today   = new Date().toISOString().split('T')[0]
  const upcoming = all.filter(a=>a.next_action_date&&a.next_action_date>=today).sort((a,b)=>(a.next_action_date??'').localeCompare(b.next_action_date??''))
  const past     = all.filter(a=>!a.next_action_date||a.next_action_date<today).slice(0,100)

  function daysUntil(d: string) { return Math.floor((new Date(d).getTime()-Date.now())/86_400_000) }

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">활동</h1><p className="page-sub">전체 {fmtNum(all.length)}건 · 예정 액션 {fmtNum(upcoming.length)}건</p></div>
      </div>
      <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:20}}>
        {upcoming.length>0&&(
          <div>
            <div style={{fontSize:'0.88rem',fontWeight:700,color:'var(--c-text)',marginBottom:12}}>예정 액션 <span style={{fontSize:'0.72rem',fontWeight:400,color:'var(--c-text3)'}}>{upcoming.length}건</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>예정일</th><th>D-day</th><th>거래처</th><th>유형</th><th>채널</th><th>내용</th><th style={{width:90}}>이동</th></tr></thead>
                <tbody>
                  {upcoming.map(a=>{
                    const days=daysUntil(a.next_action_date!)
                    const color=days<=0?'var(--c-danger-text)':days<=2?'var(--c-warning-text)':'var(--c-primary)'
                    const cust=(a as {customers?:{name?:string}}).customers
                    return (
                      <tr key={a.id} style={{background:days<=0?'rgba(239,68,68,0.03)':undefined}}>
                        <td className="mono muted" style={{fontSize:'0.8rem'}}>{a.next_action_date}</td>
                        <td><span className="mono" style={{fontSize:'0.78rem',fontWeight:700,color}}>{days<=0?`D+${Math.abs(days)}`:`D-${days}`}</span></td>
                        <td><Link href={`/customers/${a.customer_id}?tab=activities`} style={{fontWeight:600,fontSize:'0.85rem',color:'var(--c-text)',textDecoration:'none'}}>{cust?.name??'-'}</Link></td>
                        <td style={{fontSize:'0.82rem',fontWeight:600}}>{a.activity_type}</td>
                        <td className="muted">{a.channel??'-'}</td>
                        <td style={{fontSize:'0.82rem',maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.result??'-'}</td>
                        <td><Link href={`/customers/${a.customer_id}?tab=activities`} className="btn-cta-g">처리하기</Link></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {upcoming.length===0&&<div className="alert-banner alert-g"><span>✓</span><span>오늘 예정된 액션이 없습니다.</span></div>}
        <div>
          <div style={{fontSize:'0.88rem',fontWeight:700,color:'var(--c-text)',marginBottom:12}}>전체 활동 이력</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>일시</th><th>거래처</th><th>유형</th><th>채널</th><th>내용 / 결과</th><th>다음 액션</th></tr></thead>
              <tbody>
                {all.length===0&&<tr><td colSpan={6} className="table-empty">활동 이력이 없습니다</td></tr>}
                {past.map(a=>{
                  const cust=(a as {customers?:{name?:string}}).customers
                  return (
                    <tr key={a.id}>
                      <td className="mono muted" style={{fontSize:'0.78rem'}}>{fmtDate(a.created_at)}</td>
                      <td><Link href={`/customers/${a.customer_id}`} style={{fontWeight:600,fontSize:'0.83rem',color:'var(--c-text)',textDecoration:'none'}}>{cust?.name??'-'}</Link></td>
                      <td style={{fontSize:'0.82rem',fontWeight:600}}>{a.activity_type}</td>
                      <td className="muted">{a.channel??'-'}</td>
                      <td style={{fontSize:'0.82rem',maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.result??'-'}</td>
                      <td>{a.next_action_date?<span className="mono" style={{fontSize:'0.78rem',fontWeight:600,color:a.next_action_date>=today?'var(--c-primary)':'var(--c-text3)'}}>{a.next_action_date}</span>:<span className="muted">-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'16px 28px'}}><TableSkeleton rows={6} cols={6}/></div>}><ActivitiesContent/></Suspense>
}
