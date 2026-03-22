'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import type { CreateOrderInput, Order } from '@/types'

export async function getAutofillPrice(customerId: string, productId: string): Promise<{ unit_price: number; supply_price: number }> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('order_items').select('unit_price, supply_price, orders!inner(customer_id)')
    .eq('product_id', productId).eq('orders.customer_id', customerId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!error && data) return { unit_price: Number(data.unit_price), supply_price: Number(data.supply_price) }

  const { data: p, error: pe } = await supabase.from('products').select('base_price,supply_price').eq('id', productId).single()
  if (pe || !p) throw new Error('상품을 찾을 수 없습니다.')
  return { unit_price: Number(p.base_price), supply_price: Number(p.supply_price) }
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const admin = createSupabaseAdminClient()
  if (!input.items?.length) throw new Error('품목을 추가해주세요.')

  const items = input.items.map(item => {
    const qty = Number(item.qty)
    if (qty <= 0) throw new Error('수량을 입력해주세요.')
    const up = Number(item.unit_price), sp = Number(item.supply_price)
    const sales_amount = Number((qty * up).toFixed(2))
    const cost_amount  = Number((qty * sp).toFixed(2))
    return {
      product_id: item.product_id, qty, unit_price: up, supply_price: sp,
      sales_amount, cost_amount, margin_amount: Number((sales_amount - cost_amount).toFixed(2))
    }
  })

  const total_sales  = Number(items.reduce((s, i) => s + i.sales_amount, 0).toFixed(2))
  const total_cost   = Number(items.reduce((s, i) => s + i.cost_amount,  0).toFixed(2))
  const total_margin = Number((total_sales - total_cost).toFixed(2))

  const { data, error } = await admin.rpc('create_order_transactional', {
    p_customer_id: input.customer_id, p_order_date: input.order_date,
    p_payment_method: input.payment_method ?? null, p_payment_status: input.payment_status,
    p_total_sales: total_sales, p_total_cost: total_cost, p_total_margin: total_margin, p_items: items,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidatePath(`/customers/${input.customer_id}`)
  return data as Order
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: 'paid' | 'unpaid' | 'partial'): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { data: order, error: fe } = await supabase.from('orders').select('customer_id').eq('id', orderId).single()
  if (fe || !order) throw new Error('주문을 찾을 수 없습니다.')
  const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId)
  if (error) throw new Error(error.message)
  const admin = createSupabaseAdminClient()
  await admin.rpc('update_receivable', { p_customer_id: order.customer_id })
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidatePath(`/customers/${order.customer_id}`)
}

export async function getOrders(params?: {
  customerId?: string
  from?: string
  to?: string
  paymentStatus?: string
  limit?: number
}): Promise<Order[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from('orders')
    .select('*, customers(id,name), order_items(*, products(id,name))')
    .order('order_date', { ascending: false })
  if (params?.customerId)    q = q.eq('customer_id', params.customerId)
  if (params?.from)          q = q.gte('order_date', params.from)
  if (params?.to)            q = q.lte('order_date', params.to)
  if (params?.paymentStatus) q = q.eq('payment_status', params.paymentStatus)
  if (params?.limit)         q = q.limit(params.limit)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getOrderById(id: string): Promise<Order> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(*), order_items(*, products(*))')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteOrder(id: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { data: order, error: fe } = await supabase.from('orders').select('customer_id').eq('id', id).single()
  if (fe || !order) throw new Error('주문을 찾을 수 없습니다.')
  const admin = createSupabaseAdminClient()
  const { error } = await admin.rpc('delete_order_transactional', { p_order_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidatePath(`/customers/${order.customer_id}`)
}