'use server'

import { createSupabaseServerClient } from '@/lib/supabase'

// ===============================
// KPI
// ===============================
export async function getDashboardKPIs() {
  const supabase = createSupabaseServerClient()

  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('qty, sales_amount, order_id')

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('customer_id')

  if (itemError || orderError) {
    console.error(itemError || orderError)
    return {
      monthly_sales: 0,
      monthly_margin: 0,
      order_count: 0,
      avg_order_value: 0,
      active_customers: 0,
    }
  }

  // 🔥 매출 (sales_amount 이미 합계)
  const total_sales =
    items?.reduce((sum, item) => {
      return sum + (Number(item.sales_amount) || 0)
    }, 0) || 0

  // 주문 수
  const orderIds = new Set(items?.map((item) => item.order_id))
  const order_count = orderIds.size

  // 평균 주문 금액
  const avg_order_value =
    order_count > 0 ? Math.floor(total_sales / order_count) : 0

  // 활성 거래처
  const customerIds = new Set(orders?.map((o) => o.customer_id))
  const active_customers = customerIds.size

  return {
    monthly_sales: total_sales,
    monthly_margin: 0,
    order_count,
    avg_order_value,
    active_customers,
  }
}

// ===============================
// TOP 상품
// ===============================
export async function getTopProducts() {
  const supabase = createSupabaseServerClient()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, sales_amount')

  if (error) {
    console.error(error)
    return []
  }

  if (!items || items.length === 0) {
    return []
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name')

  const productMap = new Map<string, string>()
  products?.forEach((p) => {
    productMap.set(String(p.id), p.name)
  })

  const map = new Map<string, number>()

  items.forEach((item) => {
    const productId = String(item.product_id)
    const total = Number(item.sales_amount) || 0

    if (!map.has(productId)) {
      map.set(productId, 0)
    }

    map.set(productId, map.get(productId)! + total)
  })

  const result = Array.from(map.entries())
    .map(([product_id, total]) => ({
      id: product_id,
      name: productMap.get(product_id) || '상품없음',
      total_sales: total, // 🔥 UI 맞춤
    }))
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 5)

  return result
}

// ===============================
// TOP 거래처
// ===============================
export async function getTopCustomers() {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, total_revenue')
    .order('total_revenue', { ascending: false })
    .limit(5)

  if (error) {
    console.error(error)
    return []
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    total_revenue: Number(c.total_revenue) || 0,
  }))
}