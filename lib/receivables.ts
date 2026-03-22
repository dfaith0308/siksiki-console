'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import type { Receivable } from '@/types'

//export async function getReceivables(): Promise<Receivable[]> {
//  const supabase = createSupabaseServerClient()
//  const { data, error } = await supabase.from('receivables').select('*, customers(id,name,phone,grade)').order('total_unpaid', { ascending: false })
//  if (error) throw new Error(error.message)
//  return data ?? []
//} 아래 두줄은 삭제하기_추후 되돌려야할 코드임. 아래두줄은 지우고..

export async function getReceivables() {
  return []
}

export async function getReceivableByCustomer(customerId: string): Promise<Receivable | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('receivables').select('*, customers(*)').eq('customer_id', customerId).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function recalculateReceivable(customerId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.rpc('update_receivable', { p_customer_id: customerId })
  if (error) throw new Error(error.message)
  revalidatePath('/customers'); revalidatePath(`/customers/${customerId}`); revalidatePath('/dashboard')
}
