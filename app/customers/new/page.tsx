import Link from 'next/link'
import CustomerEditForm from '@/components/CustomerEditForm'

export default function NewCustomerPage() {
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/customers" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 거래처</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">신규 거래처 등록</h1>
        </div>
      </div>
      <div style={{padding:'24px 28px',maxWidth:560}}>
        <CustomerEditForm isNew />
      </div>
    </div>
  )
}
