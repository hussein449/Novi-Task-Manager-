export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`

export const AVATAR_COLORS = [
  '#2d7ff9', '#ff4d9d', '#22c55e', '#f59e0b',
  '#a855f7', '#06b6d4', '#ef4444', '#14b8a6',
]

export const colorForName = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 9973
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?'

/* ---------- dates ---------- */

const DAY = 86400000

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const daysBetween = (a, b) =>
  Math.round((startOfDay(b) - startOfDay(a)) / DAY)

export const formatDue = (iso) => {
  if (!iso) return ''
  const due = new Date(iso)
  const diff = daysBetween(new Date(), due)
  const time = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const hasTime = !(due.getHours() === 0 && due.getMinutes() === 0)
  const day =
    diff === 0 ? 'Today'
      : diff === 1 ? 'Tomorrow'
      : diff === -1 ? 'Yesterday'
      : due.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return hasTime ? `${day}, ${time}` : day
}

export const dueState = (iso, done) => {
  if (!iso) return 'none'
  if (done) return 'done'
  const due = new Date(iso).getTime()
  const now = Date.now()
  if (due < now) return 'overdue'
  if (due - now < 24 * 3600 * 1000) return 'soon'
  return 'upcoming'
}

export const toInputValue = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const bucketFor = (iso) => {
  if (!iso) return 'nodate'
  const diff = daysBetween(new Date(), new Date(iso))
  if (new Date(iso).getTime() < Date.now() && diff <= 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'week'
  return 'later'
}

export const BUCKETS = [
  { key: 'overdue', label: 'Overdue', tone: 'text-danger' },
  { key: 'today', label: 'Today', tone: 'text-warning' },
  { key: 'tomorrow', label: 'Tomorrow', tone: 'text-ink' },
  { key: 'week', label: 'This week', tone: 'text-ink' },
  { key: 'later', label: 'Later', tone: 'text-ink-2' },
  { key: 'nodate', label: 'No deadline', tone: 'text-ink-3' },
]

/* ---------- invite links (UTF-8 safe base64) ---------- */

export const encodePayload = (obj) => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const decodePayload = (code) => {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
