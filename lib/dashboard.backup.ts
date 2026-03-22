'use server'

import { createSupabaseServerClient } from '@/lib/supabase'
import type { DashboardKPI } from '@/types'

export async function getDashboardKPIs(): Promise<DashboardKPI> {
  const supabase = createSupabaseServerClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today  = now.toISOString().split('T')[0]
  const in7    = new Date(now.getTime() + 7 * 86_400_000).toISOString().split('T')[0]

  const { data: mo, error: e1 } = await supabase.from('orders').select('total_sales,total_margin').gte('order_date', firstOfMonth).lte('order_date', today)
  if (e1) throw new Error(e1.message)

  const monthly_sales  = (mo ?? []).reduce((s, o) => s + Number(o.total_sales),  0)
  const monthly_margin = (mo ?? []).reduce((s, o) => s + Number(o.total_margin), 0)
  const order_count    = (mo ?? []).length
  const avg_order_value = order_count > 0 ? monthly_sales / order_count : 0

  const { count: active_customers, error: e2 } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active')
  if (e2) throw new Error(e2.message)

  const { data: rec, error: e3 } = await supabase.from('receivables').select('total_unpaid')
  if (e3) throw new Error(e3.message)
  const total_receivables = (rec ?? []).reduce((s, r) => s + Number(r.total_unpaid), 0)

  const { count: upcoming_reorders, error: e4 } = await supabase.from('customers').select('*', { count: 'exact', head: true }).gte('expected_reorder_date', today).lte('expected_reorder_date', in7)
  if (e4) throw new Error(e4.message)

  const { data: tc, error: e5 } = await supabase.from('customers').select('id,name,total_revenue').order('total_revenue', { ascending: false }).limit(5)
  if (e5) throw new Error(e5.message)

  const { data: tp, error: e6 } = await supabase.from('products').select('id,name,total_sales').order('total_sales', { ascending: false }).limit(5)
  if (e6) throw new Error(e6.message)

  return {
    monthly_sales:  Number(monthly_sales.toFixed(2)),
    monthly_margin: Number(monthly_margin.toFixed(2)),
    order_count, avg_order_value: Number(avg_order_value.toFixed(2)),
    active_customers: active_customers ?? 0,
    total_receivables: Number(total_receivables.toFixed(2)),
    upcoming_reorders: upcoming_reorders ?? 0,
    top_customers: (tc ?? []).map(c => ({ id: c.id, name: c.name, total_revenue: Number(c.total_revenue) })),
    top_products:  (tp ?? []).map(p => ({ id: p.id, name: p.name, total_sales:   Number(p.total_sales)   })),
  }
}
