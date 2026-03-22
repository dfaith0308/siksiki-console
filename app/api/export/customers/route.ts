import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { buildWorkbook, xlsxResponse, formatDate, formatMoney } from '@/lib/xlsx'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('customers').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map(c => ({
    ID:c.id, 거래처명:c.name, 유형:c.type, 전화번호:c.phone??'', 사업자번호:c.business_number??'', 업종:c.industry??'',
    상태:c.status, 등급:c.grade, 첫주문일:formatDate(c.first_order_date), 마지막주문일:formatDate(c.last_order_date),
    총주문건수:c.total_orders, 총매출:formatMoney(c.total_revenue), 평균주문액:formatMoney(c.avg_order_value),
    재주문예정일:formatDate(c.expected_reorder_date), 미수금:formatMoney(c.receivable_balance),
  }))
  return xlsxResponse(buildWorkbook([{ name:'거래처', rows }]), `거래처_${new Date().toISOString().split('T')[0]}.xlsx`)
}
