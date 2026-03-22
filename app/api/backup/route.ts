import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { createBackupArchive, storeBackupInSupabase } from '@/lib/backup'

async function isAdmin(uid: string) {
  const a = createSupabaseAdminClient()
  const { data } = await a.auth.admin.getUserById(uid)
  return data?.user?.app_metadata?.role === 'admin'
}

export async function POST() {
  const s = createSupabaseServerClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  try {
    const { buffer, metadata, filename } = await createBackupArchive()
    await storeBackupInSupabase(buffer, filename, metadata, `manual:${user.email}`)
    return new Response(buffer, {
      headers: { 'Content-Type':'application/zip', 'Content-Disposition':`attachment; filename="${filename}"`, 'Cache-Control':'no-store' },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Backup failed' }, { status: 500 })
  }
}
