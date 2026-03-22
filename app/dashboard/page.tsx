import { Suspense } from 'react'
import Link from 'next/link'
import { getDashboardKPIs } from '@/lib/dashboard'
import { getReceivables } from '@/lib/receivables'
import { getCustomers } from '@/lib/customers'
import { fmtAbbr, fmtNum, fmtDate, daysUntil } from '@/components/ui/Number'
import { CustomerGradeBadge, PrioBadge } from '@/components/ui/Badge'
import type { Customer } from '@/types'
import { getTopProducts } from '@/lib/dashboard'

function daysSince(d: string|null) { if(!d) return 999; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000) }
function in7() { return new Date(Date.now()+7*86_400_000).toISOString().split('T')[0] }

async function DashboardContent() {
  let kpi: any,
  receivables: anyp[],
  customers: Customer[],
  topProducts: any[]

  try {
    const results = await Promise.all([getDashboardKPIs(), getReceivables(), getCustomers(),getTopProducts()])
    kpi = results[0]
    receivables = results[1] as never[]
    customers = results[2]
    topProducts = results[3]

  } catch {
    kpi = {
      monthly_sales: 0, monthly_margin: 0, order_count: 0, avg_order_value: 0,
      active_customers: 0, total_receivables: 0, upcoming_reorders: 0,
      top_customers: [], top_products: [],
    }
    receivables = []
    customers = []
    topProducts = []
  }

  const topCustomers: { id: string; name: string; total_revenue: number }[] = kpi.top_customers ?? []
  const topProductsList = topProducts

  const today = new Date().toISOString().split('T')[0]
  const marginRate = kpi.monthly_sales > 0 ? ((kpi.monthly_margin / kpi.monthly_sales) * 100).toFixed(1) : '0.0'

  const typedReceivables = receivables as { id: string; customer_id: string; total_unpaid: number; status: string; customers?: { name?: string } }[]
  const typedCustomers   = customers as Customer[]

  const reorderTargets = typedCustomers.filter(c => c.expected_reorder_date && c.expected_reorder_date <= in7() && c.status !== 'churn_risk').sort((a, b) => (a.expected_reorder_date ?? '').localeCompare(b.expected_reorder_date ?? '')).slice(0, 5)
  const recRisks       = typedReceivables.filter(r => r.status === 'risk' || r.status === 'long_term' || Number(r.total_unpaid) >= 300_000).sort((a, b) => Number(b.total_unpaid) - Number(a.total_unpaid)).slice(0, 5)
  const dormant        = typedCustomers.filter(c => c.status === 'dormant' || (c.status === 'active' && daysSince(c.last_order_date) > 45)).sort((a, b) => daysSince(b.last_order_date) - daysSince(a.last_order_date)).slice(0, 5)
  const upcoming       = typedCustomers.filter(c => c.expected_reorder_date && c.expected_reorder_date >= today && c.expected_reorder_date <= in7()).sort((a, b) => (a.expected_reorder_date ?? '').localeCompare(b.expected_reorder_date ?? ''))
  const overdueCount   = typedCustomers.filter(c => c.expected_reorder_date && c.expected_reorder_date < today).length

  const KPIS = [
    { label: '월 매출',        value: fmtAbbr(kpi.monthly_sales) + '원',   sub: `${new Date().getMonth() + 1}월 누계` },
    { label: '월 마진',        value: fmtAbbr(kpi.monthly_margin) + '원',  sub: `마진율 ${marginRate}%`, color: 'var(--c-success-text)' },
    { label: '주문 건수',      value: `${fmtNum(kpi.order_count)}건`,       sub: '이번 달' },
    { label: '평균 주문 금액', value: fmtAbbr(kpi.avg_order_value) + '원', sub: '건당 평균' },
    { label: '활성 거래처',    value: `${fmtNum(kpi.active_customers)}곳`,  sub: `재주문 예정 ${kpi.upcoming_reorders ?? 0}곳` },
    { label: '총 미수금',      value: fmtAbbr(kpi.total_receivables) + '원', sub: `위험 ${recRisks.length}건`, color: kpi.total_receivables > 500000 ? 'var(--c-danger-text)' : undefined },
  ]

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-sub">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
        </div>
        <Link href="/orders/new" className="btn btn-primary btn-sm">+ 주문 등록</Link>
      </div>

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {(overdueCount > 0 || recRisks.length > 0) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {overdueCount > 0 && <div className="alert-banner alert-r" style={{ flex: 'none' }}><span>⚠</span><span>재주문 기한 초과 <strong>{overdueCount}개</strong> 거래처</span></div>}
            {recRisks.length > 0 && <div className="alert-banner alert-o" style={{ flex: 'none' }}><span>!</span><span>고위험 미수금 <strong>{recRisks.length}건</strong></span></div>}
          </div>
        )}

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
          {KPIS.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={k.color ? { color: k.color } : {}}>{k.value}</div>
              {k.sub && <div className="kpi-sub">{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Action Panel */}
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>
            즉시 처리 필요 <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--c-text3)' }}>— 지금 행동이 매출로 이어집니다</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

            {/* 재주문 */}
            <div className="action-card">
              <div className="action-card-head"><span className="action-card-title">재주문 대상</span><span style={{ fontSize: '0.7rem', color: 'var(--c-text3)' }}>{reorderTargets.length}곳</span></div>
              {reorderTargets.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--c-success-text)' }}>✓ 재주문 대상 없음</div>
                : reorderTargets.map(c => {
                    const d = daysUntil(c.expected_reorder_date)
                    const prio: 'S'|'A'|'B' = d !== null && d <= 0 ? 'S' : d !== null && d <= 3 ? 'A' : 'B'
                    return (
                      <div key={c.id} className="action-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <PrioBadge level={prio} />
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/customers/${c.id}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Link>
                            <span className="mono" style={{ fontSize: '0.7rem', color: d !== null && d <= 0 ? 'var(--c-danger-text)' : 'var(--c-text3)' }}>{d !== null && d <= 0 ? `${Math.abs(d)}일 초과` : `${d}일 후`}</span>
                          </div>
                        </div>
                        <Link href={`/orders/new?customer=${c.id}`} className="btn-cta-g">주문 등록</Link>
                      </div>
                    )
                  })}
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--c-border)' }}>
                <Link href="/customers" style={{ fontSize: '0.72rem', color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 600 }}>전체 보기 →</Link>
              </div>
            </div>

            {/* 미수금 위험 */}
            <div className="action-card">
              <div className="action-card-head"><span className="action-card-title">미수금 위험</span><span style={{ fontSize: '0.7rem', color: 'var(--c-text3)' }}>{recRisks.length}건</span></div>
              {recRisks.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--c-success-text)' }}>✓ 위험 미수금 없음</div>
                : recRisks.map(r => {
                    const prio: 'S'|'A'|'B' = Number(r.total_unpaid) >= 1_000_000 ? 'S' : Number(r.total_unpaid) >= 300_000 ? 'A' : 'B'
                    return (
                      <div key={r.id} className="action-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <PrioBadge level={prio} />
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/customers/${r.customer_id}?tab=receivable`} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customers?.name ?? '-'}</Link>
                            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--c-danger-text)', fontWeight: 600 }}>{fmtAbbr(r.total_unpaid)}원</span>
                          </div>
                        </div>
                        <Link href={`/customers/${r.customer_id}?tab=receivable`} className="btn-cta-r">수금 처리</Link>
                      </div>
                    )
                  })}
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--c-border)' }}>
                <Link href="/receivables" style={{ fontSize: '0.72rem', color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 600 }}>전체 보기 →</Link>
              </div>
            </div>

            {/* 휴면 */}
            <div className="action-card">
              <div className="action-card-head"><span className="action-card-title">휴면 / 이탈 위험</span><span style={{ fontSize: '0.7rem', color: 'var(--c-text3)' }}>{dormant.length}곳</span></div>
              {dormant.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--c-success-text)' }}>✓ 휴면 거래처 없음</div>
                : dormant.map(c => {
                    const since = daysSince(c.last_order_date)
                    return (
                      <div key={c.id} className="action-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <PrioBadge level={since > 60 ? 'S' : 'A'} />
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/customers/${c.id}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Link>
                            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--c-warning-text)' }}>D+{since}</span>
                          </div>
                        </div>
                        <Link href={`/customers/${c.id}?tab=activities`} className="btn-cta-o">연락하기</Link>
                      </div>
                    )
                  })}
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--c-border)' }}>
                <Link href="/customers?status=dormant" style={{ fontSize: '0.72rem', color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 600 }}>전체 보기 →</Link>
              </div>
            </div>

          </div>
        </div>

        {/* 오늘 할 일 */}
        <div className="card" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>오늘 할 일</span>
            {reorderTargets.length === 0 && recRisks.length === 0 && dormant.length === 0
              ? <span style={{ fontSize: '0.8rem', color: 'var(--c-success-text)', fontWeight: 600 }}>✓ 오늘 처리할 긴급 사항 없음</span>
              : <>
                  {reorderTargets.length > 0 && <Link href="/customers" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-primary)', textDecoration: 'none', padding: '3px 10px', background: 'var(--c-surf)', borderRadius: 4, border: '1px solid var(--c-border)' }}>재주문 {reorderTargets.length}곳</Link>}
                  {recRisks.length > 0 && <Link href="/receivables" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-danger-text)', textDecoration: 'none', padding: '3px 10px', background: 'var(--c-surf)', borderRadius: 4, border: '1px solid var(--c-border)' }}>미수금 {recRisks.length}건</Link>}
                  {dormant.length > 0 && <Link href="/customers?status=dormant" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-warning-text)', textDecoration: 'none', padding: '3px 10px', background: 'var(--c-surf)', borderRadius: 4, border: '1px solid var(--c-border)' }}>휴면 {dormant.length}곳</Link>}
                </>}
          </div>
        </div>

        {/* TOP 5 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="section-head">
              <span className="section-title">TOP 5 거래처</span>
              <Link href="/customers" style={{ fontSize: '0.72rem', color: 'var(--c-primary)', textDecoration: 'none' }}>전체 보기</Link>
            </div>
            <table className="data-table">
              <thead><tr><th style={{ width: 28 }}>#</th><th>거래처명</th><th className="r">누적 매출</th></tr></thead>
              <tbody>
                {topCustomers.length === 0
                  ? <tr><td colSpan={3} className="table-empty">데이터 없음</td></tr>
                  : topCustomers.map((c, i) => (
                      <tr key={c.id}>
                        <td className="muted mono">{i + 1}</td>
                        <td><Link href={`/customers/${c.id}`} style={{ fontWeight: 600, color: 'var(--c-text)', textDecoration: 'none', fontSize: '0.83rem' }}>{c.name}</Link></td>
                        <td className="r mono" style={{ fontWeight: 600, fontSize: '0.82rem' }}>{fmtAbbr(c.total_revenue)}원</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="section-head">
              <span className="section-title">TOP 5 상품</span>
              <Link href="/products" style={{ fontSize: '0.72rem', color: 'var(--c-primary)', textDecoration: 'none' }}>전체 보기</Link>
            </div>
            <table className="data-table">
              <thead><tr><th style={{ width: 28 }}>#</th><th>상품명</th><th className="r">총 매출</th></tr></thead>
              <tbody>
                {topProducts.length === 0
                  ? <tr><td colSpan={3} className="table-empty">데이터 없음</td></tr>
                  : topProducts.map((p, i) => (
                      <tr key={p.id}>
                        <td className="muted mono">{i + 1}</td>
                        <td style={{ fontSize: '0.83rem' }}>{p.name}</td>
                        <td className="r mono" style={{ fontWeight: 600, fontSize: '0.82rem' }}>{fmtAbbr(p.total_sales)}원</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 재주문 예정 */}
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>
            7일 이내 재주문 예정 <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--c-text3)' }}>{upcoming.length}개 거래처</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>거래처명</th><th>업종</th><th>등급</th><th className="r">평균 주문금액</th><th>재주문 예정일</th><th>D-day</th><th style={{ width: 90 }}>액션</th></tr></thead>
              <tbody>
                {upcoming.length === 0 && <tr><td colSpan={7} className="table-empty">7일 이내 재주문 예정 없음</td></tr>}
                {upcoming.map(c => {
                  const d = daysUntil(c.expected_reorder_date)
                  const dc = d !== null && d <= 0 ? 'var(--c-danger-text)' : d !== null && d <= 3 ? 'var(--c-warning-text)' : 'var(--c-text3)'
                  return (
                    <tr key={c.id}>
                      <td><Link href={`/customers/${c.id}`} style={{ fontWeight: 600, color: 'var(--c-text)', textDecoration: 'none', fontSize: '0.83rem' }}>{c.name}</Link></td>
                      <td className="muted">{c.industry ?? '-'}</td>
                      <td><CustomerGradeBadge grade={c.grade} /></td>
                      <td className="r mono" style={{ fontSize: '0.82rem' }}>{fmtAbbr(c.avg_order_value)}원</td>
                      <td className="mono muted">{fmtDate(c.expected_reorder_date)}</td>
                      <td><span className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: dc }}>{d !== null ? (d <= 0 ? `D+${Math.abs(d)}` : `D-${d}`) : '-'}</span></td>
                      <td><Link href={`/orders/new?customer=${c.id}`} className="btn-cta-g">주문 등록</Link></td>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="page-scroll" style={{ padding: '40px 28px', color: 'var(--c-text3)', fontSize: '0.82rem' }}>
        로딩 중...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
