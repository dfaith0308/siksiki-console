import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { buildWorkbook, xlsxResponse, formatDate, formatMoney } from '@/lib/xlsx'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map(p => ({
    ID:p.id, 상품명:p.name, 카테고리:p.category??'', 공급가:formatMoney(p.supply_price), 판매기준가:formatMoney(p.base_price),
    마진율:Number(p.margin_rate).toFixed(2), 재주문주기일:p.reorder_cycle_days, 마지막판매일:formatDate(p.last_sold_at),
    총판매수량:p.total_sold_qty, 총매출:formatMoney(p.total_sales),
  }))
  return xlsxResponse(buildWorkbook([{ name:'상품', rows }]), `상품_${new Date().toISOString().split('T')[0]}.xlsx`)
}
