const RTF = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** "3h", "2d", "just now" — compact relative time for a post/comment timestamp. */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absSeconds = Math.abs(seconds)

  if (absSeconds < 45) return 'just now'

  for (const [unit, unitSeconds] of UNITS) {
    if (absSeconds >= unitSeconds || unit === 'minute') {
      const value = Math.round(seconds / unitSeconds)
      if (RTF) return RTF.format(value, unit)
      return `${Math.abs(value)}${unit[0]}`
    }
  }
  return 'just now'
}

export function formatJoinDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(value % 1000 >= 100 ? 1 : 0)}K`
  return `${(value / 1_000_000).toFixed(1)}M`
}
