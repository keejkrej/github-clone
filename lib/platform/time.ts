export function timeAgo(iso: string | number, now = Date.now()): string {
  const then = typeof iso === "number" ? iso * 1000 : Date.parse(iso)
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

export function isoFromUnix(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString()
}

export function unixFromIso(iso: string): number {
  return Math.floor(Date.parse(iso) / 1000)
}

export function toDateKey(iso: string | number): string {
  const date = new Date(typeof iso === "number" ? iso * 1000 : iso)
  return date.toISOString().slice(0, 10)
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function formatCommitDatetime(iso: string | number): string {
  const date = new Date(typeof iso === "number" ? iso * 1000 : iso)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })
}
