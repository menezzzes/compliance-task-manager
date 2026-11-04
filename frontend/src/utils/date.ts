/**
 * Formats a due date as YYYY-MM-DD for the API.
 *
 * A Date is read in local time: toISOString() converts to UTC, which can move the
 * date to the next day. Strings pass through, so the API can reject invalid ones.
 */
export function toApiDate(value: Date | string): string {
  if (typeof value === 'string') return value

  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
