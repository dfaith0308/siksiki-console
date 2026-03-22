'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Product } from '@/types'

export async function getProducts(): Promise<Product[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProductById(id: string): Promise<Product> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(input: { name: string; category?: string; supply_price: number; base_price: number; reorder_cycle_days?: number }): Promise<Product> {
  const supabase = createSupabaseServerClient()
  const margin_rate = input.base_price > 0 ? Number((((input.base_price - input.supply_price) / input.base_price) * 100).toFixed(2)) : 0
  const { data, error } = await supabase
    .from('products').insert({ name: input.name, category: input.category ?? null, supply_price: input.supply_price, base_price: input.base_price, margin_rate, reorder_cycle_days: input.reorder_cycle_days ?? 14 })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/products')
  return data
}

export async function updateProduct(id: string, input: Partial<{ name: string; category: string; supply_price: number; base_price: number; reorder_cycle_days: number }>): Promise<Product> {
  const supabase = createSupabaseServerClient()
  const upd: Record<string, unknown> = { ...input }
  if (input.base_price !== undefined || input.supply_price !== undefined) {
    const { data: ex } = await supabase.from('products').select('base_price,supply_price').eq('id', id).single()
    if (ex) {
      const bp = input.base_price ?? ex.base_price
      const sp = input.supply_price ?? ex.supply_price
      upd.margin_rate = bp > 0 ? Number((((bp - sp) / bp) * 100).toFixed(2)) : 0
    }
  }
  const { data, error } = await supabase.from('products').update(upd).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/products')
  return data
}
