// Timezone-aware calendar-day helpers.
// All "day" comparisons should go through these so that streaks and daily
// progress follow the user's local calendar rather than the server's.

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateKeyFormatters.get(timeZone)
  if (cached) return cached

  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
  } catch {
    // Invalid/unknown zone: fall back to UTC
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
  }
  dateKeyFormatters.set(timeZone, formatter)
  return formatter
}

// Returns true if the given IANA zone name is usable by Intl
export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

// YYYY-MM-DD for `date` as seen in `timeZone` (UTC if the zone is invalid)
export function localDateKey(date: Date, timeZone: string): string {
  const parts = getFormatter(timeZone).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

// Midnight (in `timeZone`) of the calendar day containing `date`, as a Date
export function startOfLocalDay(date: Date, timeZone: string): Date {
  const key = localDateKey(date, timeZone)
  // Treat the key as UTC midnight, then shift by the zone's offset at that instant
  const utcMidnight = new Date(`${key}T00:00:00Z`)
  const offsetMs = utcMidnight.getTime() - new Date(`${localDateTimeKey(utcMidnight, timeZone)}Z`).getTime()
  return new Date(utcMidnight.getTime() + offsetMs)
}

// Internal: "YYYY-MM-DDTHH:mm:ss" wall-clock string for `date` in `timeZone`
function localDateTimeKey(date: Date, timeZone: string): string {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date)
  } catch {
    return date.toISOString().slice(0, 19)
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
}

export function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  return localDateKey(a, timeZone) === localDateKey(b, timeZone)
}

// True if `current` falls on the calendar day immediately after `last` in `timeZone`
export function isConsecutiveLocalDay(last: Date, current: Date, timeZone: string): boolean {
  const lastKey = localDateKey(last, timeZone)
  const nextDayUtc = new Date(`${lastKey}T12:00:00Z`)
  nextDayUtc.setUTCDate(nextDayUtc.getUTCDate() + 1)
  // Noon UTC of the following key is safely inside that day in any zone
  const nextKey = nextDayUtc.toISOString().slice(0, 10)
  return localDateKey(current, timeZone) === nextKey
}
