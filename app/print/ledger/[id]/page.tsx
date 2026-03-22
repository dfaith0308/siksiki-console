import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase'

function fmt(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)) }

export default async function LedgerPage({ params }: { params: { id: string } }) {
  const admin = createSupabaseAdminClient()
  const [{ data: c }, { data: orders }, { data: rec }] = await Promise.all([
    admin.from('customers').select('*').eq('id', params.id).single(),
    admin.from('orders').select('*, order_items(*, products(name))').eq('customer_id', params.id).order('order_date', { ascending: true }),
    admin.from('receivables').select('*').eq('customer_id', params.id).maybeSingle(),
  ])
  if (!c) notFound()

  const today = new Date().toLocaleDateString('ko-KR')
  let balance = 0
  const rows = (orders ?? []).map(o => {
    const sales = Number(o.total_sales)
    const unpaid = o.payment_status !== 'paid' ? sales : 0
    balance += unpaid
    return { o, sales, unpaid, balance }
  })

  const CSS = `@page{size:A4 portrait;margin:15mm 12mm}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Malgun Gothic','Noto Sans KR',sans-serif;font-size:9pt;color:#111;background:white}.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}.title{font-size:16pt;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin-top:8px;font-size:8.5pt}.row{display:flex;gap:8px}.lbl{color:#555;min-width:70px}table{width:100%;border-collapse:collapse;margin-top:10px}thead tr{background:#111;color:white}thead th{padding:5px 6px;text-align:center;font-size:8pt;border:1px solid #111}tbody tr{border-bottom:1px solid #ddd}tbody tr:nth-child(even){background:#f9f9f9}tbody td{padding:4px 6px;font-size:8pt;border-left:1px solid #ddd;border-right:1px solid #ddd;vertical-align:top}.r{text-align:right;font-family:'Courier New',monospace}.ct{text-align:center}.sum{margin-top:14px;border:1px solid #ccc;padding:10px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:#f9f9f9}.slbl{font-size:7.5pt;color:#555}.sval{font-size:11pt;font-weight:700;font-family:'Courier New',monospace}.red{color:#c0392b}.ftr{margin-top:20px;display:flex;justify-content:space-between;font-size:8pt;color:#555;border-top:1px solid #ccc;padding-top:8px}.stamp{display:inline-block;border:1px solid #aaa;padding:4px 16px;margin-left:10px;min-width:60px;min-height:30px}@media print{.np{display:none!important}body{-webkit-print-color-adjust:exact}}`

  return (
    <html lang="ko">
      <head><meta charSet="UTF-8"/><title>거래처 원장 - {c.name}</title><style>{CSS}</style></head>
      <body>
        <div className="np" style={{padding:'10px 16px',background:'#f0f0f0',display:'flex',gap:10}}>
          <button onClick={()=>(window as Window).print()} style={{padding:'6px 16px',background:'#111',color:'white',border:'none',cursor:'pointer',fontSize:13}}>인쇄</button>
          <button onClick={()=>(window as Window).close()} style={{padding:'6px 16px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:13}}>닫기</button>
        </div>
        <div style={{padding:'0 2mm'}}>
          <div className="hdr">
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div className="title">거 래 처 원 장</div>
              <div style={{fontSize:'8pt',color:'#555'}}>출력일: {today}</div>
            </div>
            <div className="meta">
              <div className="row"><span className="lbl">거래처명</span><strong>{c.name}</strong></div>
              <div className="row"><span className="lbl">사업자번호</span><span>{c.business_number??'-'}</span></div>
              <div className="row"><span className="lbl">전화번호</span><span>{c.phone??'-'}</span></div>
              <div className="row"><span className="lbl">업종</span><span>{c.industry??'-'}</span></div>
            </div>
          </div>
          <table>
            <thead><tr><th style={{width:60}}>주문일</th><th style={{width:50}}>결제방법</th><th style={{width:45}}>상태</th><th>주문 품목</th><th style={{width:70}}>매출액</th><th style={{width:70}}>미수금</th><th style={{width:75}}>누적미수</th></tr></thead>
            <tbody>
              {rows.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'#999'}}>주문 내역이 없습니다</td></tr>}
              {rows.map(({o,sales,unpaid,balance:bal})=>{
                const items = ((o as {order_items?:{id:string;products?:{name?:string};qty:number;unit_price:number}[]}).order_items??[])
                return (
                  <tr key={o.id}>
                    <td className="ct">{o.order_date}</td>
                    <td className="ct">{o.payment_method??'-'}</td>
                    <td className="ct">{o.payment_status==='paid'?'완납':o.payment_status==='partial'?'부분':'미납'}</td>
                    <td style={{fontSize:'7.5pt',color:'#333'}}>{items.map(i=><div key={i.id}>{i.products?.name} {i.qty}개 × {fmt(Number(i.unit_price))}</div>)}</td>
                    <td className="r">{fmt(sales)}</td>
                    <td className="r" style={{color:unpaid>0?'#c0392b':'inherit'}}>{fmt(unpaid)}</td>
                    <td className="r" style={{color:bal>0?'#c0392b':'inherit',fontWeight:600}}>{fmt(bal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="sum">
            <div><div className="slbl">총 매출</div><div className="sval">{fmt(Number(c.total_revenue))}원</div></div>
            <div><div className="slbl">총 주문건수</div><div className="sval">{c.total_orders}건</div></div>
            <div><div className="slbl">현재 미수금</div><div className={`sval${Number(c.receivable_balance)>0?' red':''}`}>{fmt(Number(c.receivable_balance))}원</div></div>
          </div>
          <div className="ftr">
            <div>본 원장은 시스템에서 자동 생성된 문서입니다.</div>
            <div>확인<span className="stamp"></span></div>
          </div>
        </div>
      </body>
    </html>
  )
}
