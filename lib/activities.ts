'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Activity } from '@/types'

async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

export async function getActivities(params?: { customerId?: string; upcoming?: boolean }): Promise<Activity[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase.from('activities').select('*, customers(id,name)').order('created_at', { ascending: false })
  if (params?.customerId) q = q.eq('customer_id', params.customerId)
  if (params?.upcoming) {
    const today = new Date().toISOString().split('T')[0]
    q = q.gte('next_action_date', today).order('next_action_date', { ascending: true })
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createActivity(input: {
  customer_id: string; activity_type: string
  channel?: string; result?: string; next_action_date?: string
}): Promise<Activity> {
  const supabase = createSupabaseServerClient()
  const email = await getCurrentUserEmail()
  const { data, error } = await supabase
    .from('activities')
    .insert({
      customer_id: input.customer_id,
      activity_type: input.activity_type,
      channel: input.channel ?? null,
      result: input.result ?? null,
      next_action_date: input.next_action_date ?? null,
      created_by: email,
    })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${input.customer_id}`)
  return data
}