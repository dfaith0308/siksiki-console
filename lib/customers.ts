'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Customer, CustomerGrade, CustomerStatus, CustomerType } from '@/types'

//export async function getCustomers(): Promise<Customer[]> {
//  const supabase = createSupabaseServerClient()
//  const { data, error } = await supabase.from('customers').select('*').order('name')
//  if (error) throw new Error(error.message)
//  return data ?? []
//} 14~번 나중에 삭제할 것

export async function getCustomers() {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')

  console.log('customers data:', data)
  console.log('customers error:', error)

  if (error) {
    console.error(error)
    return []
  }

  return data ?? []
}

export async function getCustomerById(id: string): Promise<Customer> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function createCustomer(input: {
  name: string; type: CustomerType; phone?: string
  business_number?: string; industry?: string
  status?: CustomerStatus; grade?: CustomerGrade
}): Promise<Customer> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: input.name, type: input.type, phone: input.phone ?? null, business_number: input.business_number ?? null, industry: input.industry ?? null, status: input.status ?? 'active', grade: input.grade ?? 'normal' })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  return data
}

export async function updateCustomer(id: string, input: Partial<{ name: string; type: CustomerType; phone: string; business_number: string; industry: string; status: CustomerStatus; grade: CustomerGrade }>): Promise<Customer> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('customers').update(input).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return data
}

export async function getCustomerOrders(customerId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('orders').select('*, order_items(*, products(*))').eq('customer_id', customerId).order('order_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCustomerActivities(customerId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('activities').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
