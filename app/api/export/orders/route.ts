import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { buildWorkbook, xlsxResponse, formatDate, formatMoney } from '@/lib/xlsx'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: orders, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    supabase.from('orders').select('*, customers(name)').order('order_date', { ascending: false }),
    supabase.from('order_items').select('*, orders(order_date,customers(name)), products(name)').order('created_at', { ascending: false }),
  ])
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  const orderRows = (orders ?? []).map(o => ({
    주문ID:o.id, 거래처명:(o as {customers?:{name?:string}}).customers?.name??'',
    주문일:formatDate(o.order_date), 결제방법:o.payment_method??'', 결제상태:o.payment_status,
    총매출:formatMoney(o.total_sales), 총원가:formatMoney(o.total_cost), 총마진:formatMoney(o.total_margin),
  }))
  const itemRows = (items ?? []).map(i => {
    const oi = i as {orders?:{order_date?:string;customers?:{name?:string}};products?:{name?:string}}
    return { 품목ID:i.id, 주문ID:i.order_id, 주문일:formatDate(oi.orders?.order_date), 거래처명:oi.orders?.customers?.name??'', 상품명:oi.products?.name??'', 수량:i.qty, 단가:formatMoney(i.unit_price), 매출액:formatMoney(i.sales_amount), 원가:formatMoney(i.cost_amount), 마진:formatMoney(i.margin_amount) }
  })
  return xlsxResponse(buildWorkbook([{ name:'주문', rows:orderRows },{ name:'주문품목', rows:itemRows }]), `주문_${new Date().toISOString().split('T')[0]}.xlsx`)
}
