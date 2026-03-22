import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { buildWorkbook, xlsxResponse, formatDate, formatMoney } from '@/lib/xlsx'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('receivables').select('*, customers(name,phone,grade)').order('total_unpaid', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map(r => {
    const c = (r as {customers?:{name?:string;phone?:string;grade?:string}}).customers
    return { ID:r.id, 거래처명:c?.name??'', 전화번호:c?.phone??'', 등급:c?.grade??'', 미납총액:formatMoney(r.total_unpaid), 미납건수:r.unpaid_count, 최근미납일:formatDate(r.last_unpaid_date), 상태:r.status }
  })
  return xlsxResponse(buildWorkbook([{ name:'미수금', rows }]), `미수금_${new Date().toISOString().split('T')[0]}.xlsx`)
}
