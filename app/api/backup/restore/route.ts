import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { restoreFromArchive, validateBackupArchive } from '@/lib/backup'

async function isAdmin(uid: string) {
  const a = createSupabaseAdminClient()
  const { data } = await a.auth.admin.getUserById(uid)
  return data?.user?.app_metadata?.role === 'admin'
}

export async function POST(req: NextRequest) {
  const s = createSupabaseServerClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

  let buffer: Buffer
  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData(); const file = fd.get('file') as File|null
      if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
      buffer = Buffer.from(await file.arrayBuffer())
    } else { buffer = Buffer.from(await req.arrayBuffer()) }
  } catch { return NextResponse.json({ error: '파일을 읽을 수 없습니다.' }, { status: 400 }) }

  const v = await validateBackupArchive(buffer)
  if (!v.valid) return NextResponse.json({ error: `유효하지 않은 백업: ${v.error}` }, { status: 422 })

  if (new URL(req.url).searchParams.get('validate_only') === 'true') {
    return NextResponse.json({ valid: true, metadata: v.metadata })
  }
  const result = await restoreFromArchive(buffer)
  if (!result.success) return NextResponse.json({ error: result.error, restored: result.restored }, { status: 500 })
  return NextResponse.json({ success:true, restored:result.restored, schema_version:v.metadata?.schema_version })
}
