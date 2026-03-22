import * as XLSX from 'xlsx'

export function formatDate(v: string | null | undefined): string { return v ? v.split('T')[0] : '' }
export function formatMoney(v: number | string | null | undefined): string { return v === null || v === undefined ? '0.00' : Number(v).toFixed(2) }

export function buildWorkbook(sheets: { name: string; rows: Record<string, unknown>[] }[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name) }
  return wb
}

export function xlsxResponse(wb: XLSX.WorkBook, filename: string): Response {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
