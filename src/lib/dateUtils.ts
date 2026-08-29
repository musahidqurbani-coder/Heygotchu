export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function enumerateDates(startISO: string, endISO: string): string[] {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toISODate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function daysBetween(startISO: string, endISO: string): number {
  return enumerateDates(startISO, endISO).length
}

export function formatDateLabel(iso: string): string {
  const d = parseISODate(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatDateRange(startISO: string, endISO: string): string {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const startFmt = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone: 'UTC',
  })
  const endFmt = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${startFmt} – ${endFmt}`
}

export function isValidDateRange(startISO: string, endISO: string): boolean {
  if (!startISO || !endISO) return false
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return start.getTime() <= end.getTime()
}
