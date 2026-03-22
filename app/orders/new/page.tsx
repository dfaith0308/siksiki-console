import { Suspense } from 'react'
import Link from 'next/link'
import { getCustomers } from '@/lib/customers'
import { getProducts } from '@/lib/products'
import OrderForm from '@/components/OrderForm'

async function NewOrderContent({ customerId }: { customerId?:string }) {
  const [customers, products] = await Promise.all([getCustomers(), getProducts()])
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/orders" style={{fontSize:'0.8rem',color:'var(--c-text3)',textDecoration:'none'}}>← 주문</Link>
          <span style={{color:'var(--c-border2)'}}>|</span>
          <h1 className="page-title">주문 등록</h1>
        </div>
        <span style={{fontSize:'0.72rem',color:'var(--c-text3)'}}>수량 입력 후 Enter → 다음 품목 자동 추가</span>
      </div>
      <div style={{padding:'20px 28px'}}>
        <OrderForm customers={customers} products={products} defaultCustomerId={customerId}/>
      </div>
    </div>
  )
}

export default function NewOrderPage({ searchParams }: { searchParams: Record<string,string> }) {
  return <Suspense fallback={<div className="page-scroll" style={{padding:'40px 28px',color:'var(--c-text3)',fontSize:'0.82rem'}}>로딩 중...</div>}><NewOrderContent customerId={searchParams.customer}/></Suspense>
}
