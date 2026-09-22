import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as api from '../../lib/api'
import { Icon, AvatarStack } from '../ui'
import { useStore, canEdit, newId } from '../../store'
import { colorForName } from '../../lib/utils'
import {
  COLORS,
  colorOf,
  SIZES,
  CANVAS_W,
  CANVAS_H,
  NOTE_W,
  NOTE_H,
  strokePath,
  hitsStroke,
  MEETING_TEMPLATE,
} from './palette'

const TEXT_SIZES = { 2: 18, 4: 24, 8: 36 }
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2

const TOOLS = [
  { key: 'select', label: 'Select and move', icon: 'cursor', shortcut: 'V' },
  { key: 'note', label: 'Sticky note', icon: 'note', shortcut: 'N' },
  { key: 'text', label: 'Text', icon: 'type', shortcut: 'T' },
  { key: 'pen', label: 'Pen', icon: 'pen', shortcut: 'P' },
  { key: 'highlight', label: 'Highlighter', icon: 'marker', shortcut: 'H' },
  { key: 'frame', label: 'Frame', icon: 'frame', shortcut: 'F' },
  { key: 'eraser', label: 'Eraser — removes pen and highlighter lines', icon: 'eraser', shortcut: 'E' },
]

/* ---------------- small inline icons for the tool dock ---------------- */

const ToolIcon = ({ name, className = 'w-5 h-5' }) => {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    cursor: <path d="M5 3l14 7-6 2-2 6z" />,
    note: <><path d="M5 4h14v10l-5 6H5z" /><path d="M14 20v-6h5" /></>,
    type: <><path d="M5 6V4h14v2" /><path d="M12 4v16M9 20h6" /></>,
    pen: <><path d="M4 20l1-4L16 5l3 3L8 19z" /><path d="M14 7l3 3" /></>,
    marker: <><path d="M9 14l-4 6h6l1-2" /><path d="M9 14l6-10 5 3-6 10z" /></>,
    frame: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 6l2-3h6l2 3" /></>,
    eraser: <><path d="M7 20h11" /><path d="M4 15l9-10 7 7-6 7H9z" /></>,
    undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2" />,
    minus: <path d="M5 12h14" />,
    front: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></>,
    task: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>,
    duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    layout: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="16" rx="1.5" /><rect x="17" y="4" width="4" height="16" rx="1.5" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/* ---------------- the board ---------------- */

export default function Whiteboard({ meeting, board, onClose }) {
  const { state, dispatch } = useStore()
  const user = state.user
  const readOnly = !canEdit(board, user)

  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [tool, setTool] = useState('select')
  const [color, setColor] = useState('yellow')
  const [size, setSize] = useState(4)
  const [zoom, setZoom] = useState(0.8)
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [present, setPresent] = useState([])
  const [pending, setPending] = useState(0)
  const [saveError, setSaveError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [title, setTitle] = useState(meeting.title)

  const scrollerRef = useRef(null)
  const surfaceRef = useRef(null)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const toolRef = useRef(tool)
  toolRef.current = tool
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const gesture = useRef(null)
  // Set by the click that places a note or text box; see onSurfaceMouseDown.
  const placing = useRef(0)
  const saveTimers = useRef(new Map())
  const history = useRef([])
  const busyIds = useRef(new Set()) // being dragged or typed in: ignore their echoes

  const setTool_ = useCallback((key) => {
    setTool(key)
    setPaletteOpen(false)
    if (key !== 'select') {
      setSelectedId(null)
      setEditingId(null)
    }
  }, [])

  /* ---------------- persistence ---------------- */

  const track = useCallback(async (work) => {
    setPending((n) => n + 1)
    try {
      await work()
      setSaveError(null)
    } catch (error) {
      console.error('Meeting board save failed:', error)
      setSaveError(error.message ?? 'Could not save')
    } finally {
      setPending((n) => n - 1)
    }
  }, [])

  /*
   * Writes to one item run one at a time. Placing a note saves it, typing saves
   * it again a moment later, and two requests in flight for the same row can
   * land in either order — the older, empty version would win. So while a write
   * is running, later changes only mark the item dirty, and one more write with
   * the latest state follows when it finishes. A delete waits its turn the same
   * way, so a save still in flight cannot bring a removed item back.
   */
  const queues = useRef(new Map()) // id -> { running, again, remove }
  const sentAt = useRef(new Map()) // id -> ms of the newest write we sent
  const deletedByMe = useRef(new Set()) // deletes whose echo we should not act on

  const flush = useCallback(
    (id) => {
      const q = queues.current.get(id) ?? { running: false, again: false, remove: false }
      queues.current.set(id, q)
      if (q.running) {
        q.again = true
        return
      }

      const latest = itemsRef.current.find((i) => i.id === id)
      const removing = q.remove || !latest
      q.running = true
      q.again = false

      let work
      if (removing) {
        deletedByMe.current.add(id)
        work = () => api.deleteMeetingItem(id)
      } else {
        const stamp = new Date().toISOString()
        sentAt.current.set(id, Date.parse(stamp))
        work = () => api.saveMeetingItem(latest, stamp)
      }

      track(work).finally(() => {
        q.running = false
        // Something changed while this write was out — a new edit, a delete, or
        // an undo bringing a deleted item back — so write the current state.
        if (q.again) flush(id)
        else if (removing) queues.current.delete(id)
      })
    },
    [track],
  )

  const persist = useCallback(
    (item, delay = 0) => {
      const timers = saveTimers.current
      clearTimeout(timers.get(item.id))
      // saving an item means it is alive again, even if a delete was queued
      const q = queues.current.get(item.id)
      if (q) q.remove = false
      const run = () => {
        timers.delete(item.id)
        flush(item.id)
      }
      if (delay) timers.set(item.id, setTimeout(run, delay))
      else run()
    },
    [flush],
  )

  const destroy = useCallback(
    (id) => {
      clearTimeout(saveTimers.current.get(id))
      saveTimers.current.delete(id)
      const q = queues.current.get(id) ?? { running: false, again: false, remove: false }
      q.remove = true
      queues.current.set(id, q)
      flush(id)
    },
    [flush],
  )

  const topZ = () => itemsRef.current.reduce((m, i) => Math.max(m, i.z ?? 0), 0) + 1

  const remember = (entry) => {
    history.current.push(entry)
    if (history.current.length > 80) history.current.shift()
  }

  const create = useCallback(
    (partial) => {
      const item = {
        id: newId(),
        meetingId: meeting.id,
        createdBy: user.email,
        z: topZ(),
        text: '',
        ...partial,
      }
      itemsRef.current = [...itemsRef.current, item]
      setItems(itemsRef.current)
      remember({ type: 'create', ids: [item.id] })
      persist(item)
      return item
    },
    [meeting.id, user.email, persist],
  )

  const patchLocal = (id, patch) => {
    itemsRef.current = itemsRef.current.map((i) => (i.id === id ? { ...i, ...patch } : i))
    setItems(itemsRef.current)
  }

  const update = useCallback(
    (id, patch, { delay = 0, record = true } = {}) => {
      const before = itemsRef.current.find((i) => i.id === id)
      if (!before) return
      if (record) remember({ type: 'update', before: [before] })
      patchLocal(id, patch)
      persist({ id }, delay)
    },
    [persist],
  )

  const removeItems = useCallback(
    (ids) => {
      const gone = itemsRef.current.filter((i) => ids.includes(i.id))
      if (gone.length === 0) return
      remember({ type: 'delete', items: gone })
      itemsRef.current = itemsRef.current.filter((i) => !ids.includes(i.id))
      setItems(itemsRef.current)
      gone.forEach((i) => destroy(i.id))
      if (ids.includes(selectedId)) setSelectedId(null)
    },
    [destroy, selectedId],
  )

  const undo = useCallback(() => {
    const entry = history.current.pop()
    if (!entry) return
    if (entry.type === 'create') {
      itemsRef.current = itemsRef.current.filter((i) => !entry.ids.includes(i.id))
      setItems(itemsRef.current)
      entry.ids.forEach(destroy)
    } else if (entry.type === 'delete') {
      itemsRef.current = [...itemsRef.current, ...entry.items]
      setItems(itemsRef.current)
      entry.items.forEach((i) => persist(i))
    } else if (entry.type === 'update') {
      entry.before.forEach((prev) => {
        patchLocal(prev.id, prev)
        persist(prev)
      })
    }
    setSelectedId(null)
    setEditingId(null)
  }, [destroy, persist])

  /* ---------------- loading and live updates ---------------- */

  useEffect(() => {
    let alive = true
    api
      .loadMeetingItems(meeting.id)
      .then((rows) => {
        if (!alive) return
        itemsRef.current = rows
        setItems(rows)
        setLoaded(true)
        // Open where the work is, not on an empty corner
        requestAnimationFrame(() => {
          const el = scrollerRef.current
          if (!el || rows.length === 0) return
          const minX = Math.min(...rows.map((r) => r.x))
          const minY = Math.min(...rows.map((r) => r.y))
          el.scrollTo({ left: Math.max(0, minX * zoomRef.current - 40), top: Math.max(0, minY * zoomRef.current - 40) })
        })
      })
      .catch((error) => {
        if (!alive) return
        setSaveError(error.message)
        setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [meeting.id])

  useEffect(() => {
    if (!supabase) return undefined
    const channel = supabase.channel(`meeting-${meeting.id}`, {
      config: { presence: { key: user.email } },
    })

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meeting_items', filter: `meeting_id=eq.${meeting.id}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (!id) return
          // Our own delete: it is already gone here, or an undo has since
          // brought it back — in which case removing it now would be wrong.
          if (deletedByMe.current.has(id)) {
            deletedByMe.current.delete(id)
            return
          }
          itemsRef.current = itemsRef.current.filter((i) => i.id !== id)
          setItems(itemsRef.current)
          return
        }
        const incoming = api.itemFrom(payload.new)
        // Someone else's write on an item we are holding right now: ours is newer.
        if (busyIds.current.has(incoming.id)) return
        // The echo of one of our own writes. It can never be newer than what is
        // on screen: by the time it arrives the text may have moved on, and a
        // queued write would then save the rolled-back version. Equal counts too.
        const newestSent = sentAt.current.get(incoming.id)
        if (newestSent && Date.parse(incoming.updatedAt) <= newestSent) return
        const exists = itemsRef.current.some((i) => i.id === incoming.id)
        itemsRef.current = exists
          ? itemsRef.current.map((i) => (i.id === incoming.id ? incoming : i))
          : [...itemsRef.current, incoming]
        setItems(itemsRef.current)
      },
    )

    channel.on('presence', { event: 'sync' }, () => {
      const people = Object.values(channel.presenceState())
        .map((entries) => entries[0])
        .filter(Boolean)
      setPresent(people)
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ id: user.email, email: user.email, name: user.name, color: colorForName(user.email) })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [meeting.id, user.email, user.name])

  // Flush any typing that is still waiting on its debounce when the board closes
  useEffect(
    () => () => {
      saveTimers.current.forEach((timer, id) => {
        clearTimeout(timer)
        const latest = itemsRef.current.find((i) => i.id === id)
        if (latest) api.saveMeetingItem(latest).catch(() => {})
      })
    },
    [],
  )

  /* ---------------- geometry ---------------- */

  const toCanvas = (e) => {
    const rect = surfaceRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / zoomRef.current,
      y: (e.clientY - rect.top) / zoomRef.current,
    }
  }

  const setZoomAround = useCallback((next) => {
    const el = scrollerRef.current
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100))
    if (!el) {
      setZoom(z)
      return
    }
    // keep whatever is in the middle of the screen in the middle
    const cx = (el.scrollLeft + el.clientWidth / 2) / zoomRef.current
    const cy = (el.scrollTop + el.clientHeight / 2) / zoomRef.current
    setZoom(z)
    requestAnimationFrame(() => {
      el.scrollLeft = cx * z - el.clientWidth / 2
      el.scrollTop = cy * z - el.clientHeight / 2
    })
  }, [])

  const fitToContent = () => {
    const el = scrollerRef.current
    if (!el) return
    if (itemsRef.current.length === 0) {
      setZoomAround(0.8)
      return
    }
    const bounds = itemsRef.current.reduce(
      (b, i) => {
        const pts = i.points?.length ? i.points : [[i.x, i.y], [i.x + (i.w ?? 200), i.y + (i.h ?? 60)]]
        pts.forEach(([x, y]) => {
          b.minX = Math.min(b.minX, x)
          b.minY = Math.min(b.minY, y)
          b.maxX = Math.max(b.maxX, x)
          b.maxY = Math.max(b.maxY, y)
        })
        return b
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    )
    const pad = 60
    const z = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          el.clientWidth / (bounds.maxX - bounds.minX + pad * 2),
          el.clientHeight / (bounds.maxY - bounds.minY + pad * 2),
        ),
      ),
    )
    setZoom(z)
    requestAnimationFrame(() => {
      el.scrollLeft = (bounds.minX - pad) * z
      el.scrollTop = (bounds.minY - pad) * z
    })
  }

  /* ---------------- pointer handling ---------------- */

  const capture = (e) => {
    try {
      surfaceRef.current.setPointerCapture(e.pointerId)
    } catch {
      /* the pointer may already be gone */
    }
  }

  const eraseAt = (p) => {
    const hit = itemsRef.current.filter(
      (i) => (i.kind === 'stroke' || i.kind === 'highlight') && hitsStroke(i, p.x, p.y, 10 / zoomRef.current),
    )
    if (hit.length) removeItems(hit.map((i) => i.id))
  }

  /*
   * A real click is pointerdown, then mousedown, then click. Placing a note or
   * text box happens on pointerdown and focuses its text field — but the
   * browser's own mousedown that follows moves focus to wherever was clicked,
   * which is the canvas, so the new field blurred before you could type, and an
   * empty text box deletes itself on blur. Cancelling that mousedown keeps the
   * focus where we put it. On touch screens the mousedown arrives only after
   * the finger lifts, hence the short window instead of a single flag.
   */
  const holdFocus = (e) => {
    e.preventDefault()
    placing.current = Date.now()
  }

  const onSurfaceMouseDown = (e) => {
    if (Date.now() - placing.current < 800) {
      e.preventDefault()
      placing.current = 0
    }
  }

  const onSurfaceDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    const p = toCanvas(e)
    const t = toolRef.current
    setPaletteOpen(false)
    setMenuOpen(false)

    if (readOnly || t === 'select') {
      setSelectedId(null)
      setEditingId(null)
      // drag the empty canvas to pan; touch screens already scroll natively
      if (e.pointerType === 'mouse') {
        const el = scrollerRef.current
        gesture.current = { type: 'pan', sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop }
        capture(e)
      }
      return
    }

    if (t === 'pen' || t === 'highlight') {
      gesture.current = { type: 'draw' }
      const next = {
        kind: t === 'pen' ? 'stroke' : 'highlight',
        color,
        size: t === 'pen' ? size : size * 4,
        points: [[Math.round(p.x), Math.round(p.y)]],
      }
      setDraft(next)
      gesture.current.draft = next
      capture(e)
      return
    }

    if (t === 'eraser') {
      gesture.current = { type: 'erase' }
      eraseAt(p)
      capture(e)
      return
    }

    if (t === 'note') {
      holdFocus(e)
      const item = create({
        kind: 'note',
        x: Math.round(p.x - NOTE_W / 2),
        y: Math.round(p.y - NOTE_H / 2),
        w: NOTE_W,
        h: NOTE_H,
        color,
      })
      setTool('select')
      setSelectedId(item.id)
      setEditingId(item.id)
      return
    }

    if (t === 'text') {
      holdFocus(e)
      const item = create({
        kind: 'text',
        x: Math.round(p.x),
        y: Math.round(p.y - 14),
        color: color === 'yellow' ? 'black' : color,
        size: TEXT_SIZES[size],
      })
      setTool('select')
      setSelectedId(item.id)
      setEditingId(item.id)
      return
    }

    if (t === 'frame') {
      holdFocus(e)
      const item = create({
        kind: 'frame',
        x: Math.round(p.x),
        y: Math.round(p.y),
        w: 640,
        h: 480,
        color,
        text: 'New section',
        z: 0,
      })
      setTool('select')
      setSelectedId(item.id)
    }
  }

  const onItemDown = (e, item) => {
    if (toolRef.current !== 'select' && !readOnly) return
    e.stopPropagation()
    setPaletteOpen(false)
    setMenuOpen(false)
    if (editingId === item.id) return

    const wasSelected = selectedId === item.id
    setSelectedId(item.id)
    if (readOnly) return

    const p = toCanvas(e)
    // a frame carries everything sitting inside it
    const passengers =
      item.kind === 'frame'
        ? itemsRef.current.filter((i) => {
            if (i.id === item.id || i.kind === 'frame') return false
            const [cx, cy] = i.points?.length
              ? i.points[0]
              : [i.x + (i.w ?? 100) / 2, i.y + (i.h ?? 30) / 2]
            return cx >= item.x && cx <= item.x + item.w && cy >= item.y && cy <= item.y + item.h
          })
        : []

    gesture.current = {
      type: 'drag',
      id: item.id,
      start: p,
      moved: false,
      wasSelected,
      origin: [item, ...passengers].map((i) => ({ ...i })),
    }
    busyIds.current.add(item.id)
    passengers.forEach((i) => busyIds.current.add(i.id))
    capture(e)
  }

  const onResizeDown = (e, item) => {
    e.stopPropagation()
    if (readOnly) return
    gesture.current = { type: 'resize', id: item.id, start: toCanvas(e), origin: { ...item } }
    busyIds.current.add(item.id)
    capture(e)
  }

  const onMove = (e) => {
    const g = gesture.current
    if (!g) return

    if (g.type === 'pan') {
      const el = scrollerRef.current
      el.scrollLeft = g.sl - (e.clientX - g.sx)
      el.scrollTop = g.st - (e.clientY - g.sy)
      return
    }

    const p = toCanvas(e)

    if (g.type === 'draw') {
      const pts = g.draft.points
      const [lx, ly] = pts[pts.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) < 1.5) return
      g.draft = { ...g.draft, points: [...pts, [Math.round(p.x), Math.round(p.y)]] }
      setDraft(g.draft)
      return
    }

    if (g.type === 'erase') {
      eraseAt(p)
      return
    }

    if (g.type === 'drag') {
      const dx = p.x - g.start.x
      const dy = p.y - g.start.y
      if (!g.moved && Math.hypot(dx, dy) < 3 / zoomRef.current) return
      g.moved = true
      const byId = new Map(g.origin.map((o) => [o.id, o]))
      itemsRef.current = itemsRef.current.map((i) => {
        const o = byId.get(i.id)
        if (!o) return i
        if (o.points) {
          return { ...i, points: o.points.map(([x, y]) => [Math.round(x + dx), Math.round(y + dy)]) }
        }
        return { ...i, x: Math.round(o.x + dx), y: Math.round(o.y + dy) }
      })
      setItems(itemsRef.current)
      return
    }

    if (g.type === 'resize') {
      const o = g.origin
      const minW = o.kind === 'frame' ? 200 : 120
      const minH = o.kind === 'frame' ? 160 : 80
      patchLocal(g.id, {
        w: Math.max(minW, Math.round(o.w + (p.x - g.start.x))),
        h: Math.max(minH, Math.round(o.h + (p.y - g.start.y))),
      })
    }
  }

  const onUp = () => {
    const g = gesture.current
    gesture.current = null
    if (!g) return

    if (g.type === 'draw') {
      setDraft(null)
      if (g.draft.points.length >= 1) {
        const [x, y] = g.draft.points[0]
        create({ ...g.draft, x, y })
      }
      return
    }

    if (g.type === 'drag') {
      g.origin.forEach((o) => busyIds.current.delete(o.id))
      if (g.moved) {
        remember({ type: 'update', before: g.origin })
        const lead = itemsRef.current.find((i) => i.id === g.id)
        // bring what was moved to the top, frames stay underneath
        if (lead && lead.kind !== 'frame') patchLocal(lead.id, { z: topZ() })
        g.origin.forEach((o) => persist(o))
      } else if (g.wasSelected) {
        const it = itemsRef.current.find((i) => i.id === g.id)
        if (it && (it.kind === 'note' || it.kind === 'text' || it.kind === 'frame')) setEditingId(g.id)
      }
      return
    }

    if (g.type === 'resize') {
      busyIds.current.delete(g.id)
      remember({ type: 'update', before: [g.origin] })
      persist({ id: g.id })
    }
  }

  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    setZoomAround(zoomRef.current * (e.deltaY > 0 ? 0.9 : 1.1))
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (!readOnly) undo()
        return
      }
      if (typing) {
        if (e.key === 'Escape') {
          document.activeElement.blur()
          setEditingId(null)
        }
        return
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setPaletteOpen(false)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !readOnly) {
        e.preventDefault()
        removeItems([selectedId])
        return
      }
      if (readOnly || e.ctrlKey || e.metaKey || e.altKey) return
      const match = TOOLS.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase())
      if (match) setTool_(match.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, readOnly, undo, removeItems, setTool_])

  /* ---------------- actions on the selection ---------------- */

  const selected = items.find((i) => i.id === selectedId) ?? null

  const recolour = (key) => {
    setColor(key)
    if (selected && !readOnly) update(selected.id, { color: key })
  }

  const duplicate = () => {
    if (!selected) return
    const { id, z, ...rest } = selected
    const copy = create({
      ...rest,
      x: selected.x + 24,
      y: selected.y + 24,
      points: selected.points?.map(([x, y]) => [x + 24, y + 24]),
    })
    setSelectedId(copy.id)
  }

  const toFront = () => {
    if (selected && selected.kind !== 'frame') update(selected.id, { z: topZ() })
  }

  const firstList = board.lists[0]
  const makeTask = () => {
    if (!selected || !firstList) return
    const title = selected.text.split('\n').map((l) => l.trim()).find(Boolean)
    if (!title) {
      setNotice('Write something on it first, then send it to the board.')
      return
    }
    dispatch({
      type: 'addCard',
      boardId: board.id,
      listId: firstList.id,
      title: title.slice(0, 140),
      assigneeId: user.id,
    })
    setNotice(`Added “${title.slice(0, 40)}” to ${firstList.title} on ${board.name}.`)
  }

  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const applyTemplate = () => {
    const w = 720
    const gap = 40
    const ids = MEETING_TEMPLATE.map((section, index) => {
      const item = {
        id: newId(),
        meetingId: meeting.id,
        createdBy: user.email,
        kind: 'frame',
        x: 80 + index * (w + gap),
        y: 80,
        w,
        h: 900,
        color: section.color,
        text: section.title,
        z: 0,
      }
      itemsRef.current = [...itemsRef.current, item]
      persist(item)
      return item.id
    })
    setItems(itemsRef.current)
    remember({ type: 'create', ids })
    requestAnimationFrame(fitToContent)
  }

  const clearAll = () => {
    if (!window.confirm('Clear everything on this board? You can undo it straight after.')) return
    const everything = itemsRef.current
    remember({ type: 'delete', items: everything })
    // one bulk delete, many echoes — none of them should undo an undo
    everything.forEach((i) => deletedByMe.current.add(i.id))
    itemsRef.current = []
    setItems([])
    track(() => api.clearMeetingItems(meeting.id))
    setMenuOpen(false)
  }

  const saveTitle = () => {
    const value = title.trim()
    if (value && value !== meeting.title) dispatch({ type: 'renameMeeting', id: meeting.id, title: value })
    else setTitle(meeting.title)
  }

  /* ---------------- rendering ---------------- */

  const frames = useMemo(
    () => items.filter((i) => i.kind === 'frame').sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [items],
  )
  const blocks = useMemo(
    () =>
      items
        .filter((i) => i.kind === 'note' || i.kind === 'text')
        .sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [items],
  )
  const lines = useMemo(
    () =>
      items
        .filter((i) => i.kind === 'stroke' || i.kind === 'highlight')
        .sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [items],
  )

  const itemsInteractive = readOnly || tool === 'select'
  const surfaceCursor =
    tool === 'pen' || tool === 'highlight'
      ? 'crosshair'
      : tool === 'eraser'
        ? 'cell'
        : tool === 'select'
          ? 'grab'
          : 'copy'

  const saveLabel = saveError ? 'Not saved' : pending > 0 ? 'Saving…' : 'Saved'
  const others = present.filter((p) => p.id !== user.email)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      {/* top bar */}
      <header className="flex items-center gap-2 px-2 sm:px-4 h-14 bg-surface border-b border-line shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-ink-2 hover:bg-muted transition"
          aria-label="Back to meeting boards"
        >
          <Icon name="chevron" className="w-5 h-5 rotate-180" />
        </button>

        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            readOnly={readOnly}
            className="w-full min-w-0 truncate bg-transparent text-sm sm:text-base font-semibold text-ink outline-none rounded-md px-1.5 py-0.5 hover:bg-muted focus:bg-muted"
            aria-label="Meeting board name"
          />
          <p className="px-1.5 text-xs text-ink-3 truncate">
            {board.name}
            <span className={saveError ? 'text-danger' : ''}> · {saveLabel}</span>
            {readOnly && ' · view only'}
          </p>
        </div>

        {others.length > 0 && (
          <div className="hidden xs:flex items-center gap-1.5" title={`${others.map((o) => o.name).join(', ')} here too`}>
            <AvatarStack members={others} size={26} max={4} />
          </div>
        )}

        {!readOnly && (
          <button
            onClick={undo}
            className="p-2 rounded-lg text-ink-2 hover:bg-muted transition"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <ToolIcon name="undo" />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-ink-2 hover:bg-muted transition"
            aria-label="Board options"
          >
            <Icon name="dots" className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-pop">
              <button
                onClick={() => {
                  fitToContent()
                  setMenuOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink hover:bg-muted"
              >
                Fit everything on screen
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => {
                      applyTemplate()
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink hover:bg-muted"
                  >
                    Add Main ideas / Brainstorm / Actions
                  </button>
                  <button
                    onClick={clearAll}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger-soft"
                  >
                    Clear the board
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* canvas */}
      <div
        ref={scrollerRef}
        className="relative flex-1 overflow-auto thin-scroll bg-canvas"
        style={{ touchAction: tool === 'select' || readOnly ? 'pan-x pan-y' : 'none' }}
      >
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }} className="relative">
          <div
            ref={surfaceRef}
            onPointerDown={onSurfaceDown}
            onMouseDown={onSurfaceMouseDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="absolute left-0 top-0 origin-top-left bg-surface"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${zoom})`,
              cursor: surfaceCursor,
              backgroundImage: 'radial-gradient(circle, #d3d8de 1px, transparent 1.2px)',
              backgroundSize: '28px 28px',
              touchAction: tool === 'select' || readOnly ? 'pan-x pan-y' : 'none',
            }}
          >
            {/* frames sit underneath everything */}
            {frames.map((f) => {
              const c = colorOf(f.color)
              const isSel = f.id === selectedId
              return (
                <div
                  key={f.id}
                  onPointerDown={(e) => onItemDown(e, f)}
                  className="absolute rounded-2xl"
                  style={{
                    left: f.x,
                    top: f.y,
                    width: f.w,
                    height: f.h,
                    background: `${c.fill}99`,
                    border: `2px ${isSel ? 'solid' : 'dashed'} ${isSel ? c.ink : c.edge}`,
                    pointerEvents: itemsInteractive ? 'auto' : 'none',
                    touchAction: 'none',
                  }}
                >
                  {editingId === f.id ? (
                    <input
                      autoFocus
                      defaultValue={f.text}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        busyIds.current.delete(f.id)
                        const value = e.target.value.trim() || 'Section'
                        if (value !== f.text) update(f.id, { text: value })
                        setEditingId(null)
                      }}
                      onFocus={() => busyIds.current.add(f.id)}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="m-3 w-[calc(100%-1.5rem)] rounded-lg bg-white/80 px-2 py-1 text-xl font-semibold outline-none"
                      style={{ color: c.ink }}
                    />
                  ) : (
                    <p className="m-3 px-2 py-1 text-xl font-semibold truncate select-none" style={{ color: c.ink }}>
                      {f.text || 'Section'}
                    </p>
                  )}
                  {isSel && !readOnly && (
                    <span
                      onPointerDown={(e) => onResizeDown(e, f)}
                      className="absolute -right-2 -bottom-2 w-5 h-5 rounded-md bg-white border-2 cursor-nwse-resize"
                      style={{ borderColor: c.ink, touchAction: 'none' }}
                      aria-label="Resize section"
                    />
                  )}
                </div>
              )
            })}

            {/* sticky notes and text */}
            {blocks.map((b) => {
              const c = colorOf(b.color)
              const isSel = b.id === selectedId
              const isEditing = b.id === editingId

              if (b.kind === 'text') {
                return (
                  <div
                    key={b.id}
                    onPointerDown={(e) => onItemDown(e, b)}
                    className={`absolute rounded-md ${isSel ? 'ring-2 ring-primary/50' : ''}`}
                    style={{
                      left: b.x,
                      top: b.y,
                      zIndex: 10 + (b.z ?? 0),
                      pointerEvents: itemsInteractive ? 'auto' : 'none',
                      touchAction: 'none',
                      maxWidth: 640,
                    }}
                  >
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={b.text}
                        rows={Math.max(1, b.text.split('\n').length)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onFocus={() => busyIds.current.add(b.id)}
                        onChange={(e) => update(b.id, { text: e.target.value }, { delay: 450, record: false })}
                        onBlur={() => {
                          busyIds.current.delete(b.id)
                          setEditingId(null)
                          if (!b.text.trim()) removeItems([b.id])
                          else persist({ id: b.id })
                        }}
                        placeholder="Type…"
                        className="block min-w-[160px] resize-none bg-white/70 rounded-md px-2 py-1 font-semibold outline-none"
                        style={{
                          color: c.ink,
                          fontSize: b.size ?? 24,
                          lineHeight: 1.25,
                          width: Math.min(640, Math.max(160, (b.text.split('\n').reduce((m, l) => Math.max(m, l.length), 4) + 2) * (b.size ?? 24) * 0.55)),
                        }}
                      />
                    ) : (
                      <p
                        className="px-2 py-1 font-semibold whitespace-pre-wrap break-words select-none"
                        style={{ color: c.ink, fontSize: b.size ?? 24, lineHeight: 1.25 }}
                      >
                        {b.text || ' '}
                      </p>
                    )}
                  </div>
                )
              }

              return (
                <div
                  key={b.id}
                  onPointerDown={(e) => onItemDown(e, b)}
                  className="absolute rounded-lg"
                  style={{
                    left: b.x,
                    top: b.y,
                    width: b.w ?? NOTE_W,
                    height: b.h ?? NOTE_H,
                    zIndex: 10 + (b.z ?? 0),
                    background: c.fill,
                    border: `1px solid ${c.edge}`,
                    boxShadow: isSel
                      ? `0 0 0 2px ${c.ink}, 0 8px 18px rgba(22,32,44,.14)`
                      : '0 2px 6px rgba(22,32,44,.10)',
                    pointerEvents: itemsInteractive ? 'auto' : 'none',
                    touchAction: 'none',
                  }}
                >
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={b.text}
                      onPointerDown={(e) => e.stopPropagation()}
                      onFocus={() => busyIds.current.add(b.id)}
                      onChange={(e) => update(b.id, { text: e.target.value }, { delay: 450, record: false })}
                      onBlur={() => {
                        busyIds.current.delete(b.id)
                        setEditingId(null)
                        persist({ id: b.id })
                      }}
                      placeholder="Write an idea…"
                      className="h-full w-full resize-none bg-transparent p-3 text-[15px] leading-snug text-ink outline-none placeholder:text-ink-3"
                    />
                  ) : (
                    <p className="h-full w-full overflow-hidden p-3 text-[15px] leading-snug text-ink whitespace-pre-wrap break-words select-none">
                      {b.text || <span className="text-ink-3">{readOnly ? '' : 'Tap twice to write'}</span>}
                    </p>
                  )}
                  {isSel && !readOnly && !isEditing && (
                    <span
                      onPointerDown={(e) => onResizeDown(e, b)}
                      className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded bg-white border-2 cursor-nwse-resize"
                      style={{ borderColor: c.ink, touchAction: 'none' }}
                      aria-label="Resize note"
                    />
                  )}
                </div>
              )
            })}

            {/* pen and highlighter on top, so you can circle a note */}
            <svg
              className="absolute left-0 top-0 pointer-events-none"
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ zIndex: 100000 }}
            >
              {lines.map((l) => (
                <path
                  key={l.id}
                  d={strokePath(l.points)}
                  fill="none"
                  stroke={l.kind === 'highlight' ? colorOf(l.color).edge : colorOf(l.color).ink}
                  strokeWidth={l.size ?? 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={l.kind === 'highlight' ? 0.6 : 1}
                  className={l.id === selectedId ? 'drop-shadow' : ''}
                />
              ))}
              {draft && (
                <path
                  d={strokePath(draft.points)}
                  fill="none"
                  stroke={draft.kind === 'highlight' ? colorOf(draft.color).edge : colorOf(draft.color).ink}
                  strokeWidth={draft.size}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={draft.kind === 'highlight' ? 0.6 : 1}
                />
              )}
            </svg>
          </div>
        </div>

        {loaded && items.length === 0 && !readOnly && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-surface p-5 text-center shadow-lg">
              <p className="font-semibold text-ink">An empty board</p>
              <p className="mt-1 text-sm text-ink-3">
                Pick a tool below and start writing — or begin with three sections for the meeting.
              </p>
              <button
                onClick={applyTemplate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
              >
                <ToolIcon name="layout" className="w-4 h-4" />
                Main ideas · Brainstorm · Actions
              </button>
            </div>
          </div>
        )}

        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-sm text-ink-3">Opening the board…</p>
          </div>
        )}
      </div>

      {/* what to do with the selected thing */}
      {selected && !readOnly && !editingId && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-10 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-pop">
          {COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => recolour(c.key)}
              className={`shrink-0 w-6 h-6 rounded-full border-2 transition ${
                selected.color === c.key ? 'scale-110 border-ink' : 'border-white hover:scale-110'
              }`}
              style={{ background: selected.kind === 'note' || selected.kind === 'frame' ? c.fill : c.ink }}
              aria-label={`Make it ${c.label.toLowerCase()}`}
              title={c.label}
            />
          ))}
          <span className="mx-1 h-6 w-px bg-line shrink-0" />
          {(selected.kind === 'note' || selected.kind === 'text') && (
            <button
              onClick={makeTask}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-2 hover:bg-muted"
              title={`Add it to ${firstList?.title ?? 'the board'} on ${board.name}`}
            >
              <ToolIcon name="task" className="w-4 h-4" />
              <span className="hidden sm:inline">To task</span>
            </button>
          )}
          <button
            onClick={duplicate}
            className="shrink-0 p-1.5 rounded-lg text-ink-2 hover:bg-muted"
            aria-label="Duplicate"
            title="Duplicate"
          >
            <ToolIcon name="duplicate" className="w-4 h-4" />
          </button>
          {selected.kind !== 'frame' && (
            <button
              onClick={toFront}
              className="shrink-0 p-1.5 rounded-lg text-ink-2 hover:bg-muted"
              aria-label="Bring to front"
              title="Bring to front"
            >
              <ToolIcon name="front" className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => removeItems([selected.id])}
            className="shrink-0 p-1.5 rounded-lg text-danger hover:bg-danger-soft"
            aria-label="Delete"
            title="Delete"
          >
            <Icon name="trash" className="w-4 h-4" />
          </button>
        </div>
      )}

      {notice && (
        <div className="absolute left-1/2 -translate-x-1/2 top-16 z-20 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg animate-pop">
          {notice}
        </div>
      )}

      {/* tool dock */}
      <div className="shrink-0 bg-surface border-t border-line px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto no-scrollbar">
          {!readOnly &&
            TOOLS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTool_(t.key)}
                className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl transition ${
                  tool === t.key ? 'bg-primary text-white shadow-xs' : 'text-ink-2 hover:bg-muted'
                }`}
                aria-label={t.label}
                aria-pressed={tool === t.key}
                title={`${t.label} (${t.shortcut})`}
              >
                <ToolIcon name={t.icon} />
              </button>
            ))}

          {!readOnly && (
            <>
              <span className="mx-1 h-7 w-px bg-line shrink-0" />
              <div className="relative shrink-0">
                <button
                  onClick={() => setPaletteOpen((v) => !v)}
                  className="grid place-items-center w-10 h-10 rounded-xl hover:bg-muted transition"
                  aria-label="Colour"
                  title="Colour"
                >
                  <span
                    className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-line-strong"
                    style={{
                      background: ['pen', 'text'].includes(tool)
                        ? colorOf(color).ink
                        : colorOf(color).edge,
                    }}
                  />
                </button>
              </div>
              {(tool === 'pen' || tool === 'highlight' || tool === 'text') && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {SIZES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSize(s.key)}
                      className={`grid place-items-center w-9 h-10 rounded-xl transition ${
                        size === s.key ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                      aria-label={s.label}
                      title={s.label}
                    >
                      <span className="rounded-full bg-ink" style={{ width: s.key + 3, height: s.key + 3 }} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <span className="ml-auto" />
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line px-1">
            <button
              onClick={() => setZoomAround(zoomRef.current - 0.1)}
              className="grid place-items-center w-8 h-9 rounded-lg text-ink-2 hover:bg-muted"
              aria-label="Zoom out"
            >
              <ToolIcon name="minus" className="w-4 h-4" />
            </button>
            <button
              onClick={fitToContent}
              className="w-12 text-xs font-medium text-ink-2 tabular-nums hover:text-primary"
              title="Fit everything on screen"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoomAround(zoomRef.current + 0.1)}
              className="grid place-items-center w-8 h-9 rounded-lg text-ink-2 hover:bg-muted"
              aria-label="Zoom in"
            >
              <Icon name="plus" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {paletteOpen && (
          <div className="mx-auto mt-2 flex max-w-3xl flex-wrap items-center gap-1.5 px-1 animate-pop">
            {COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => recolour(c.key)}
                className={`w-8 h-8 rounded-full border-2 transition ${
                  color === c.key ? 'scale-110 border-ink' : 'border-white hover:scale-110'
                }`}
                style={{ background: ['pen', 'text'].includes(tool) ? c.ink : c.edge }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
