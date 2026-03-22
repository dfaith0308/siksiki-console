import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase'

function fmt(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)) }

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const admin = createSupabaseAdminClient()
  const { data: order, error } = await admin
    .from('orders').select('*, customers(*), order_items(*, products(*))').eq('id', params.id).single()
  if (error || !order) notFound()

  const cust  = (order as {customers?: Record<string,string>}).customers
  const items = ((order as {order_items?:{id:string;products?:{name?:string};product_id:string;qty:number;unit_price:number;supply_price:number;sales_amount:number}[]}).order_items ?? [])
  const today = new Date().toLocaleDateString('ko-KR')
  const pLabel: Record<string,string> = { paid:'완납', unpaid:'미납', partial:'부분납' }

  const CSS = `@page{size:A4 portrait;margin:12mm 10mm}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Malgun Gothic','Noto Sans KR',sans-serif;font-size:9pt;color:#111;background:white}.dt{font-size:18pt;font-weight:800;text-align:center;letter-spacing:8px;border-top:3px solid #111;border-bottom:3px solid #111;padding:6px 0;margin-bottom:14px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px}.box{border:1px solid #aaa;padding:8px 10px}.bttl{font-size:8pt;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:6px}.irow{display:flex;gap:8px;font-size:8.5pt;margin-bottom:3px}.ilbl{min-width:65px;color:#555}table{width:100%;border-collapse:collapse;margin-top:4px}thead tr{background:#111;color:white}thead th{padding:5px 7px;font-size:8pt;border:1px solid #111;text-align:center}tbody tr{border-bottom:1px solid #ddd}tbody tr:nth-child(even){background:#f8f8f8}tbody td{padding:5px 7px;font-size:8.5pt;border-left:1px solid #ddd;border-right:1px solid #ddd}.r{text-align:right;font-family:'Courier New',monospace}.ct{text-align:center}tfoot tr{background:#f0f0f0;font-weight:700;border-top:2px solid #111}tfoot td{padding:5px 7px;font-size:9pt;border:1px solid #aaa}.tot{margin-top:12px;display:flex;justify-content:flex-end}.tb{border:2px solid #111;min-width:240px}.tr{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #ddd;font-size:9pt}.tr:last-child{border-bottom:none;background:#111;color:white}.tv{font-family:'Courier New',monospace;font-weight:700}.sigs{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px}.sig{border:1px solid #aaa;padding:8px 12px}.sgt{font-size:8pt;color:#555;margin-bottom:20px}.sgl{border-bottom:1px solid #aaa;margin-top:16px;padding-bottom:4px;font-size:8pt;color:#777;text-align:right}.note{margin-top:12px;font-size:7.5pt;color:#888;text-align:center}@media print{.np{display:none!important}body{-webkit-print-color-adjust:exact}}`

  return (
    <html lang="ko">
      <head><meta charSet="UTF-8"/><title>거래명세서 - {cust?.name}</title><style>{CSS}</style></head>
      <body>
        <div className="np" style={{padding:'10px 16px',background:'#f0f0f0',display:'flex',gap:10}}>
          <button onClick={()=>(window as Window).print()} style={{padding:'6px 16px',background:'#111',color:'white',border:'none',cursor:'pointer',fontSize:13}}>인쇄</button>
          <button onClick={()=>(window as Window).close()} style={{padding:'6px 16px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:13}}>닫기</button>
        </div>
        <div style={{padding:'0 2mm'}}>
          <div className="dt">거 래 명 세 서</div>
          <div className="two">
            <div className="box">
              <div className="bttl">공급받는자 (거래처)</div>
              <div className="irow"><span className="ilbl">상호</span><strong style={{fontSize:'11pt'}}>{cust?.name}</strong></div>
              <div className="irow"><span className="ilbl">사업자번호</span><span>{cust?.business_number??'-'}</span></div>
              <div className="irow"><span className="ilbl">전화번호</span><span>{cust?.phone??'-'}</span></div>
              <div className="irow"><span className="ilbl">업종</span><span>{cust?.industry??'-'}</span></div>
            </div>
            <div className="box">
              <div className="bttl">거래 정보</div>
              <div className="irow"><span className="ilbl">주문일</span><strong>{order.order_date}</strong></div>
              <div className="irow"><span className="ilbl">결제방법</span><span>{order.payment_method??'-'}</span></div>
              <div className="irow"><span className="ilbl">결제상태</span><span style={{color:order.payment_status==='paid'?'#27ae60':'#c0392b'}}>{pLabel[order.payment_status as string]}</span></div>
              <div className="irow"><span className="ilbl">출력일</span><span>{today}</span></div>
            </div>
          </div>
          <table>
            <thead><tr><th style={{width:28}}>No</th><th>품목명</th><th style={{width:45}}>수량</th><th style={{width:75}}>단가</th><th style={{width:80}}>공급가액</th><th style={{width:75}}>합계</th></tr></thead>
            <tbody>
              {items.map((item,idx)=>(
                <tr key={item.id}>
                  <td className="ct">{idx+1}</td>
                  <td>{item.products?.name??item.product_id}</td>
                  <td className="ct">{item.qty}</td>
                  <td className="r">{fmt(Number(item.unit_price))}</td>
                  <td className="r">{fmt(Number(item.supply_price)*item.qty)}</td>
                  <td className="r" style={{fontWeight:600}}>{fmt(Number(item.sales_amount))}</td>
                </tr>
              ))}
              {Array.from({length:Math.max(0,8-items.length)}).map((_,i)=><tr key={`b${i}`}><td style={{height:20}}></td><td></td><td></td><td></td><td></td><td></td></tr>)}
            </tbody>
            <tfoot><tr><td colSpan={5} style={{textAlign:'right',fontWeight:700,paddingRight:12}}>합 계</td><td className="r" style={{fontSize:'10pt'}}>{fmt(Number(order.total_sales))}</td></tr></tfoot>
          </table>
          <div className="tot">
            <div className="tb">
              <div className="tr"><span>공급가액 합계</span><span className="tv">{fmt(Number(order.total_cost))}원</span></div>
              <div className="tr"><span>부가세 (별도)</span><span className="tv">-원</span></div>
              <div className="tr"><span style={{fontWeight:700}}>청구금액</span><span className="tv" style={{fontSize:'11pt'}}>{fmt(Number(order.total_sales))}원</span></div>
            </div>
          </div>
          <div className="sigs">
            <div className="sig"><div className="sgt">공급자 확인</div><div className="sgl">서명 / 인</div></div>
            <div className="sig"><div className="sgt">공급받는자 확인</div><div className="sgl">서명 / 인</div></div>
          </div>
          <div className="note">본 명세서는 전산 시스템에서 자동 발행된 문서입니다.</div>
        </div>
      </body>
    </html>
  )
}
