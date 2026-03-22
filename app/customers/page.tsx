import { Suspense } from 'react'
import Link from 'next/link'
import { getCustomers } from '@/lib/customers'
import { fmtAbbr, fmtNum, fmtDate, daysUntil } from '@/components/ui/Number'
import { CustomerStatusBadge, CustomerGradeBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Feedback'
import type { Customer } from '@/types'

function daysSince(d: string|null|undefined) { if(!d) return 999; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000) }
function dsColor(n: number) { return n>60?'var(--c-danger-text)':n>30?'var(--c-warning-text)':'var(--c-success-text)' }

function nextAction(c: Customer): { label:string; href:string; cls:string } {
  const until = daysUntil(c.expected_reorder_date)
  if (Number(c.receivable_balance)>=300_000) return { label:'수금 처리', href:`/customers/${c.id}?tab=receivable`, cls:'btn-cta-r' }
  if (until!==null&&until<=3)                return { label:'주문 등록', href:`/orders/new?customer=${c.id}`, cls:'btn-cta-g' }
  if (daysSince(c.last_order_date)>45||c.status==='dormant') return { label:'연락하기', href:`/customers/${c.id}?tab=activities`, cls:'btn-cta-o' }
  return { label:'상세 보기', href:`/customers/${c.id}`, cls:'' }
}

async function CustomerListContent({ searchParams }: { searchParams: Record<string,string> }) {
  const all = await getCustomers()
  let list = [...all]
  if (searchParams.status) list = list.filter(c=>c.status===searchParams.status)
  if (searchParams.grade)  list = list.filter(c=>c.grade===searchParams.grade)
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase()
    list = list.filter(c=>c.name.toLowerCase().includes(q)||(c.phone??'').includes(q)||(c.industry??'').toLowerCase().includes(q))
  }
  const sort = searchParams.sort ?? 'name'
  list.sort((a,b)=>{
    if (sort==='revenue')    return Number(b.total_revenue)-Number(a.total_revenue)
    if (sort==='receivable') return Number(b.receivable_balance)-Number(a.receivable_balance)
    if (sort==='last_order') return daysSince(a.last_order_date)-daysSince(b.last_order_date)
    return a.name.localeCompare(b.name,'ko')
  })

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">거래처</h1><p className="page-sub">전체 {fmtNum(all.length)}곳 · 표시 {fmtNum(list.length)}곳</p></div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/api/export/customers" className="btn btn-outline btn-sm">Excel 내보내기</Link>
          <Link href="/customers/new" className="btn btn-primary btn-sm">+ 거래처 추가</Link>
        </div>
      </div>
      <div className="toolbar">
        <form style={{display:'flex',gap:8,flexWrap:'wrap',width:'100%'}}>
          <input name="q" defaultValue={searchParams.q} placeholder="거래처명 · 전화번호 · 업종" className="form-input form-input-sm" style={{width:220}} autoComplete="off"/>
          <select name="status" defaultValue={searchParams.status??''} className="form-select form-select-sm" style={{width:120}}>
            <option value="">전체 상태</option><option value="active">활성</option><option value="dormant">휴면</option><option value="churn_risk">이탈위험</option>
          </select>
          <select name="grade" defaultValue={searchParams.grade??''} className="form-select form-select-sm" style={{width:110}}>
            <option value="">전체 등급</option><option value="vip">VIP</option><option value="core">핵심</option><option value="normal">일반</option><option value="risk">위험</option>
          </select>
          <select name="sort" defaultValue={searchParams.sort??'name'} className="form-select form-select-sm" style={{width:130}}>
            <option value="name">이름순</option><option value="revenue">매출 높은순</option><option value="receivable">미수금 높은순</option><option value="last_order">최근 주문순</option>
          </select>
          <button type="submit" className="btn btn-outline btn-sm">검색</button>
          <Link href="/customers" className="btn btn-ghost btn-sm">초기화</Link>
        </form>
      </div>
      <div style={{padding:'16px 28px'}}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>거래처명</th><th>업종</th><th>등급</th><th>상태</th><th>마지막 주문</th><th>경과일</th>
              <th className="r">누적 매출</th><th className="r">미수금</th><th>재주문 예정</th><th>다음 행동</th>
            </tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={10} className="table-empty">조건에 맞는 거래처가 없습니다</td></tr>}
              {list.map(c=>{
                const since=daysSince(c.last_order_date)
                const until=daysUntil(c.expected_reorder_date)
                const action=nextAction(c)
                const hasRec=Number(c.receivable_balance)>0
                return (
                  <tr key={c.id}>
                    <td><Link href={`/customers/${c.id}`} style={{fontWeight:700,fontSize:'0.85rem',color:'var(--c-text)',textDecoration:'none'}}>{c.name}</Link></td>
                    <td className="muted">{c.industry??'-'}</td>
                    <td><CustomerGradeBadge grade={c.grade}/></td>
                    <td><CustomerStatusBadge status={c.status}/></td>
                    <td className="mono muted">{fmtDate(c.last_order_date)}</td>
                    <td>{c.last_order_date?<span className="mono" style={{fontSize:'0.78rem',fontWeight:700,color:dsColor(since)}}>D+{since}</span>:<span className="muted">-</span>}</td>
                    <td className="r mono" style={{fontWeight:600,fontSize:'0.83rem'}}>{fmtAbbr(c.total_revenue)}원</td>
                    <td className="r">{hasRec?<span className="mono" style={{fontWeight:700,fontSize:'0.83rem',color:'var(--c-danger-text)'}}>{fmtAbbr(c.receivable_balance)}원</span>:<span className="muted mono" style={{fontSize:'0.78rem'}}>-</span>}</td>
                    <td>{c.expected_reorder_date?<span className="mono" style={{fontSize:'0.78rem',fontWeight:until!==null&&until<=3?700:400,color:until!==null&&until<=0?'var(--c-danger-text)':until!==null&&until<=3?'var(--c-warning-text)':'var(--c-text3)'}}>{fmtDate(c.expected_reorder_date)}{until!==null&&<span style={{marginLeft:4,opacity:.8}}>({until<=0?`D+${Math.abs(until)}`:`D-${until}`})</span>}</span>:<span className="muted">-</span>}</td>
                    <td>{action.cls?<Link href={action.href} className={`btn btn-xs ${action.cls}`}>{action.label}</Link>:<Link href={action.href} className="btn btn-ghost btn-xs">{action.label}</Link>}</td>
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

export default function CustomersPage({ searchParams }: { searchParams: Record<string,string> }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'16px 28px'}}><TableSkeleton rows={8} cols={10}/></div>}><CustomerListContent searchParams={searchParams}/></Suspense>
}
