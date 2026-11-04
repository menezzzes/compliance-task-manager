export function toApiDate(value: Date | string): string {
  if (typeof value === 'string') return value

  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDueDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  const monthName = MONTHS[Number(month) - 1]
  if (!monthName) return value

  return `${monthName} ${Number(day)}, ${year}`
}

const MS_PER_DAY = 86_400_000

function toDayNumber(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  return date.getTime() / MS_PER_DAY
}

export function daysBetween(from: string, to: string): number | null {
  const fromDay = toDayNumber(from)
  const toDay = toDayNumber(to)
  return fromDay === null || toDay === null ? null : toDay - fromDay
}

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return TIMESTAMP_FORMAT.format(date).replace(/\s/g, ' ')
}
