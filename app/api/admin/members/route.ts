import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}