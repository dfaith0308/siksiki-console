import Link from 'next/link'
import ProductEditForm from '@/components/ProductEditForm'

export default function NewProductPage() {
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/products" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 상품</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">신규 상품 등록</h1>
        </div>
      </div>
      <div style={{padding:'24px 28px',maxWidth:520}}>
        <ProductEditForm />
      </div>
    </div>
  )
}
