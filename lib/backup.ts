import JSZip from 'jszip'
import { createSupabaseAdminClient } from '@/lib/supabase'

export const SCHEMA_VERSION = '1.0.0'
export const BACKUP_TABLES = ['customers','products','orders','order_items','receivables','activities'] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]

export interface BackupMetadata {
  schema_version: string; created_at: string
  tables: BackupTable[]; row_counts: Record<BackupTable, number>
}

export async function createBackupArchive() {
  const admin = createSupabaseAdminClient()
  const zip = new JSZip()
  const now = new Date()
  const ts = now.toISOString().replace(/[:.]/g,'-').replace('T','_').slice(0,19)
  const rowCounts: Record<string, number> = {}

  for (const table of BACKUP_TABLES) {
    const { data, error } = await admin.from(table).select('*')
    if (error) throw new Error(`Export failed ${table}: ${error.message}`)
    rowCounts[table] = (data ?? []).length
    zip.file(`${table}.json`, JSON.stringify(data ?? [], null, 2))
  }

  const metadata: BackupMetadata = { schema_version: SCHEMA_VERSION, created_at: now.toISOString(), tables: [...BACKUP_TABLES], row_counts: rowCounts as Record<BackupTable, number> }
  zip.file('metadata.json', JSON.stringify(metadata, null, 2))
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { buffer, metadata, filename: `full-backup-${ts}.zip` }
}

export async function storeBackupInSupabase(buffer: Buffer, filename: string, metadata: BackupMetadata, triggeredBy: string) {
  const admin = createSupabaseAdminClient()
  const storagePath = `backups/${metadata.created_at.split('T')[0]}/${filename}`
  const { error: ue } = await admin.storage.from('backups').upload(storagePath, buffer, { contentType: 'application/zip', upsert: false })
  if (ue) throw new Error(`Upload failed: ${ue.message}`)
  await admin.from('backups').insert({ file_path: storagePath, schema_version: metadata.schema_version, triggered_by: triggeredBy, status: 'completed' })
  return storagePath
}

export async function validateBackupArchive(buffer: Buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const mf  = zip.file('metadata.json')
    if (!mf) return { valid: false, error: 'metadata.json not found' }
    const metadata: BackupMetadata = JSON.parse(await mf.async('string'))
    if (!metadata.schema_version) return { valid: false, error: 'Missing schema_version' }
    for (const t of metadata.tables) { if (!zip.file(`${t}.json`)) return { valid: false, error: `Missing ${t}.json` } }
    return { valid: true, metadata }
  } catch (e: unknown) { return { valid: false, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` } }
}

export async function restoreFromArchive(buffer: Buffer) {
  const v = await validateBackupArchive(buffer)
  if (!v.valid || !v.metadata) return { success: false, restored: {}, error: v.error }
  const admin = createSupabaseAdminClient()
  const zip = await JSZip.loadAsync(buffer)
  const restored: Record<string, number> = {}
  for (const t of ['activities','receivables','order_items','orders','products','customers'] as BackupTable[]) {
    const { error } = await admin.from(t).delete().neq('id','00000000-0000-0000-0000-000000000000')
    if (error) return { success: false, restored, error: `Clear ${t}: ${error.message}` }
  }
  for (const t of ['customers','products','orders','order_items','receivables','activities'] as BackupTable[]) {
    const f = zip.file(`${t}.json`)
    if (!f) continue
    const rows: Record<string, unknown>[] = JSON.parse(await f.async('string'))
    if (!rows.length) { restored[t] = 0; continue }
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from(t).insert(rows.slice(i, i + 500))
      if (error) return { success: false, restored, error: `Restore ${t}: ${error.message}` }
    }
    restored[t] = rows.length
  }
  return { success: true, restored }
}
