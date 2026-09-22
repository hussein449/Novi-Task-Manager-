/**
 * Colours on a meeting board. Each one has a soft fill for sticky notes and
 * frames, and a strong ink for pen strokes and text, so a colour means the same
 * thing whichever tool picked it.
 */
export const COLORS = [
  { key: 'yellow', label: 'Yellow', fill: '#fef3c7', edge: '#fcd34d', ink: '#b45309' },
  { key: 'orange', label: 'Orange', fill: '#ffedd5', edge: '#fdba74', ink: '#ea580c' },
  { key: 'pink', label: 'Pink', fill: '#fce7f3', edge: '#f9a8d4', ink: '#db2777' },
  { key: 'red', label: 'Red', fill: '#fee2e2', edge: '#fca5a5', ink: '#dc2626' },
  { key: 'purple', label: 'Purple', fill: '#ede9fe', edge: '#c4b5fd', ink: '#7c3aed' },
  { key: 'blue', label: 'Blue', fill: '#dbeafe', edge: '#93c5fd', ink: '#2563eb' },
  { key: 'teal', label: 'Teal', fill: '#ccfbf1', edge: '#5eead4', ink: '#0d9488' },
  { key: 'green', label: 'Green', fill: '#dcfce7', edge: '#86efac', ink: '#16a34a' },
  { key: 'black', label: 'Black', fill: '#f1f5f9', edge: '#cbd5e1', ink: '#16202c' },
]

export const colorOf = (key) => COLORS.find((c) => c.key === key) ?? COLORS[0]

export const SIZES = [
  { key: 2, label: 'Fine' },
  { key: 4, label: 'Medium' },
  { key: 8, label: 'Bold' },
]

// A big fixed canvas: roomy enough for a long session, simple to reason about.
export const CANVAS_W = 3200
export const CANVAS_H = 2000

export const NOTE_W = 190
export const NOTE_H = 140

/** Smooth a freehand line by curving through the midpoints of its samples. */
export const strokePath = (points) => {
  if (!points || points.length === 0) return ''
  if (points.length === 1) {
    const [x, y] = points[0]
    return `M${x} ${y} L${x + 0.1} ${y + 0.1}`
  }
  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    d += ` Q${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`
  }
  const last = points[points.length - 1]
  d += ` L${last[0]} ${last[1]}`
  return d
}

/** Distance from a point to a line segment, for the eraser's hit test. */
const toSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

export const hitsStroke = (item, x, y, slack = 8) => {
  const pts = item.points ?? []
  const reach = (item.size ?? 4) / 2 + slack
  for (let i = 0; i < pts.length - 1; i += 1) {
    if (toSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= reach) return true
  }
  return pts.length === 1 && Math.hypot(x - pts[0][0], y - pts[0][1]) <= reach
}

/** A starting layout that matches how a meeting usually goes. */
export const MEETING_TEMPLATE = [
  { title: 'Main ideas', color: 'blue' },
  { title: 'Brainstorm', color: 'yellow' },
  { title: 'Action items', color: 'green' },
]
