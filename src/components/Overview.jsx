import { useMemo } from 'react'
import { Icon, Avatar } from './ui'
import { useStore } from '../store'
import { formatDue, dueState } from '../lib/utils'

const Stat = ({ label, value, tone = 'text-white', icon }) => (
  <div className="rounded-2xl glass p-4">
    <div className="flex items-center gap-2 text-white/50">
      <Icon name={icon} className="w-4 h-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`mt-2 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)

export default function Overview({ onOpenBoard, onOpenCard }) {
  const { state } = useStore()

  const stats = useMemo(() => {
    const cards = state.cards
    const now = Date.now()
    const done = cards.filter((c) => c.done)
    const overdue = cards.filter((c) => !c.done && c.dueDate && new Date(c.dueDate).getTime() < now)
    const dueSoon = cards.filter(
      (c) =>
        !c.done &&
        c.dueDate &&
        new Date(c.dueDate).getTime() >= now &&
        new Date(c.dueDate).getTime() - now < 3 * 86400000,
    )
    return { total: cards.length, done, overdue, dueSoon }
  }, [state.cards])

  const people = useMemo(() => {
    const map = new Map()
    state.boards.forEach((b) =>
      b.members.forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, { member: m, open: 0, done: 0, overdue: 0 })
      }),
    )
    state.cards.forEach((c) => {
      const row = map.get(c.assigneeId)
      if (!row) return
      if (c.done) row.done += 1
      else {
        row.open += 1
        if (c.dueDate && new Date(c.dueDate).getTime() < Date.now()) row.overdue += 1
      }
    })
    return [...map.values()].sort((a, b) => b.open + b.done - (a.open + a.done))
  }, [state.boards, state.cards])

  const upcoming = useMemo(
    () =>
      state.cards
        .filter((c) => !c.done && c.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 6),
    [state.cards],
  )

  const pct = stats.total ? Math.round((stats.done.length / stats.total) * 100) : 0

  return (
    <div className="px-4 sm:px-6 pb-8 max-w-5xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-white/50 mt-0.5">
          Everything across {state.boards.length} {state.boards.length === 1 ? 'board' : 'boards'} and{' '}
          {state.folders.length} {state.folders.length === 1 ? 'folder' : 'folders'}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="All cards" value={stats.total} icon="board" />
        <Stat label="Completed" value={stats.done.length} tone="text-emerald-300" icon="check" />
        <Stat label="Due in 3 days" value={stats.dueSoon.length} tone="text-amber-300" icon="clock" />
        <Stat label="Overdue" value={stats.overdue.length} tone="text-rose-300" icon="bell" />
      </div>

      <div className="mt-4 rounded-2xl glass p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Completion</span>
          <span className="text-white/60 tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2.5 h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <section className="rounded-2xl glass p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">Boards</h2>
          <div className="space-y-2">
            {state.boards.map((b) => {
              const cards = state.cards.filter((c) => c.boardId === b.id)
              const bDone = cards.filter((c) => c.done).length
              const bPct = cards.length ? Math.round((bDone / cards.length) * 100) : 0
              const folder = state.folders.find((f) => f.id === b.folderId)
              return (
                <button
                  key={b.id}
                  onClick={() => onOpenBoard(b.id)}
                  className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-white/8 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full scene-${b.scene ?? 'night'}`} />
                    <span className="text-sm font-medium truncate">{b.name}</span>
                    <span className="ml-auto text-xs text-white/45 tabular-nums">
                      {bDone}/{cards.length}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${bPct}%` }} />
                    </div>
                    {folder && <span className="text-[11px] text-white/35">{folder.name}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl glass p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">Workload by person</h2>
          <div className="space-y-1">
            {people.map(({ member, open, done, overdue }) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar user={member} size={30} />
                <span className="text-sm truncate">{member.name}</span>
                <div className="ml-auto flex items-center gap-2 text-xs tabular-nums">
                  {overdue > 0 && (
                    <span className="rounded-md bg-rose-500/20 text-rose-200 px-1.5 py-0.5">{overdue} late</span>
                  )}
                  <span className="text-white/60">{open} open</span>
                  <span className="text-emerald-300/80">{done} done</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl glass p-4 mt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">Next deadlines</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">No deadlines set.</p>
        ) : (
          <div className="space-y-1">
            {upcoming.map((c) => {
              const s = dueState(c.dueDate, c.done)
              const board = state.boards.find((b) => b.id === c.boardId)
              return (
                <button
                  key={c.id}
                  onClick={() => onOpenCard(c.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/8 transition text-left"
                >
                  <Avatar user={board?.members.find((m) => m.id === c.assigneeId) ?? null} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{c.title}</p>
                    <p className="text-[11px] text-white/35 truncate">{board?.name}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      s === 'overdue' ? 'text-rose-300' : s === 'soon' ? 'text-amber-300' : 'text-white/55'
                    }`}
                  >
                    {formatDue(c.dueDate)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
