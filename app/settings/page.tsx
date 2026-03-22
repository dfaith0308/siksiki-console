'use client'

import { useState } from 'react'
import Link from 'next/link'

function Row({ label, sub, action }: { label:string; sub?:string; action:React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
      <div>
        <div style={{fontSize:'0.85rem',fontWeight:600,color:'var(--c-text)'}}>{label}</div>
        {sub&&<div style={{fontSize:'0.72rem',color:'var(--c-text3)',marginTop:2}}>{sub}</div>}
      </div>
      <div>{action}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  async function triggerBackup() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/backup', { method:'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href=url; a.download=`backup-${new Date().toISOString().split('T')[0]}.zip`; a.click(); URL.revokeObjectURL(url)
        setMsg('백업이 완료되었습니다.')
      } else { setMsg('백업 실패. 관리자 권한이 필요합니다.') }
    } catch { setMsg('백업 중 오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">설정</h1><p className="page-sub">시스템 설정 및 데이터 관리</p></div>
      </div>
      <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:20,maxWidth:680}}>

        <div className="card" style={{overflow:'hidden'}}>
          <div className="section-head"><span className="section-title">데이터 내보내기</span></div>
          <div style={{padding:'0 20px'}}>
            <Row label="거래처 목록"    sub="전체 거래처 정보를 Excel로 내보냅니다"    action={<Link href="/api/export/customers"   className="btn btn-outline btn-sm">Excel 다운로드</Link>}/>
            <Row label="상품 목록"      sub="전체 상품 정보를 Excel로 내보냅니다"      action={<Link href="/api/export/products"    className="btn btn-outline btn-sm">Excel 다운로드</Link>}/>
            <Row label="주문 내역"      sub="전체 주문 및 품목을 Excel로 내보냅니다"   action={<Link href="/api/export/orders"      className="btn btn-outline btn-sm">Excel 다운로드</Link>}/>
            <Row label="미수금 현황"    sub="전체 미수금 현황을 Excel로 내보냅니다"    action={<Link href="/api/export/receivables" className="btn btn-outline btn-sm">Excel 다운로드</Link>}/>
          </div>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div className="section-head"><span className="section-title">데이터 백업</span></div>
          <div style={{padding:'18px 20px'}}>
            <p style={{fontSize:'0.82rem',color:'var(--c-text2)',lineHeight:1.6,marginBottom:14}}>전체 데이터를 ZIP 파일로 백업합니다. 백업 파일은 Supabase Storage에도 자동 저장됩니다.</p>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <button onClick={triggerBackup} disabled={loading} className="btn btn-primary btn-sm">{loading?'백업 중...':'지금 백업'}</button>
              {msg&&<span style={{fontSize:'0.78rem',color:msg.includes('완료')?'var(--c-success-text)':'var(--c-danger-text)',fontWeight:600}}>{msg}</span>}
            </div>
            <div style={{marginTop:14,padding:'10px 14px',background:'var(--c-surf)',borderRadius:'var(--r-md)',fontSize:'0.75rem',color:'var(--c-text3)'}}>자동 백업: 매일 새벽 2시 (Supabase Edge Function)</div>
          </div>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div className="section-head"><span className="section-title">시스템 정보</span></div>
          <div style={{padding:'0 20px'}}>
            {[
              {label:'서비스명',     value:'식식이 콘솔 (Siksiki Console)'},
              {label:'버전',         value:'1.0.0'},
              {label:'프레임워크',   value:'Next.js 14 App Router'},
              {label:'데이터베이스', value:'Supabase (PostgreSQL)'},
            ].map((row,i)=>(
              <div key={i} style={{display:'flex',padding:'10px 0',borderBottom:'1px solid var(--c-border)',fontSize:'0.82rem'}}>
                <span style={{width:120,flexShrink:0,color:'var(--c-text3)',fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.04em',paddingTop:1}}>{row.label}</span>
                <span style={{color:'var(--c-text)'}}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
