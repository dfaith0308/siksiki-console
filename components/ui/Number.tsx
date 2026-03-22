export function fmtNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('ko-KR').format(Math.round(num))
}

export function fmtWon(n: number | string | null | undefined): string { return fmtNum(n) + '원' }

export function fmtAbbr(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0'
  if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억`
  if (num >= 10_000_000)  return `${Math.round(num / 10_000_000)}천만`
  if (num >= 1_000_000)   return `${(num / 1_000_000).toFixed(1)}백만`
  if (num >= 10_000)      return `${Math.round(num / 10_000)}만`
  return fmtNum(num)
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '-'
  return d.split('T')[0]
}

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}
