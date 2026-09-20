import { useMemo } from 'react'
import { Icon, Avatar } from './ui'
import { useStore, accentOf } from '../store'
import { formatDue, dueState } from '../lib/utils'

const Stat = ({ label, value, tone = 'text-ink', icon }) => (
  <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
    <div className="flex items-center gap-2 text-ink-3">
      <Icon name={icon} className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
  </div>
)

export default function Overview({ onOpenBoard, onOpenCard }) {
  const { state } = useStore()

  const stats = useMemo(() => {
    const now = Date.now()
    const cards = state.cards
    return {
      total: cards.length,
      done: cards.filter((c) => c.done).length,
      overdue: cards.filter((c) => !c.done && c.dueDate && new Date(c.dueDate).getTime() < now).length,
      dueSoon: cards.filter(
        (c) =>
          !c.done &&
          c.dueDate &&
          new Date(c.dueDate).getTime() >= now &&
          new Date(c.dueDate).getTime() - now < 3 * 86400000,
      ).length,
    }
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
    return [...map.values()].sort((a, b) => b.open - a.open)
  }, [state.boards, state.cards])

  const upcoming = useMemo(
    () =>
      state.cards
        .filter((c) => !c.done && c.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 6),
    [state.cards],
  )

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="px-4 sm:px-6 max-w-5xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink tracking-tight">Overview</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          Everything across {state.boards.length} {state.boards.length === 1 ? 'board' : 'boards'} and{' '}
          {state.folders.length} {state.folders.length === 1 ? 'folder' : 'folders'}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="All cards" value={stats.total} icon="board" />
        <Stat label="Completed" value={stats.done} tone="text-success" icon="check" />
        <Stat label="Due in 3 days" value={stats.dueSoon} tone="text-warning" icon="clock" />
        <Stat label="Overdue" value={stats.overdue} tone="text-danger" icon="bell" />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Completion</span>
          <span className="text-ink-2 tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 mt-3">
        <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-semibold text-ink mb-3">Boards</h2>
          <div className="space-y-1">
            {state.boards.map((b) => {
              const cards = state.cards.filter((c) => c.boardId === b.id)
              const done = cards.filter((c) => c.done).length
              const bPct = cards.length ? Math.round((done / cards.length) * 100) : 0
              const folder = state.folders.find((f) => f.id === b.folderId)
              return (
                <button
                  key={b.id}
                  onClick={() => onOpenBoard(b.id)}
                  className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 accent-${accentOf(b)}`} />
                    <span className="text-sm font-medium text-ink truncate">{b.name}</span>
                    <span className="ml-auto text-xs text-ink-3 tabular-nums">
                      {done}/{cards.length}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${bPct}%` }} />
                    </div>
                    {folder && <span className="text-xs text-ink-3 shrink-0">{folder.name}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-semibold text-ink mb-3">Workload by person</h2>
          <div className="space-y-0.5">
            {people.map(({ member, open, done, overdue }) => (
              <div key={member.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2">
                <Avatar user={member} size={28} />
                <span className="text-sm text-ink truncate">{member.name}</span>
                <div className="ml-auto flex items-center gap-2 text-xs tabular-nums">
                  {overdue > 0 && (
                    <span className="rounded-md bg-danger-soft text-danger px-1.5 py-0.5 font-medium">
                      {overdue} late
                    </span>
                  )}
                  <span className="text-ink-2">{open} open</span>
                  <span className="text-ink-3">{done} done</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 shadow-xs mt-3">
        <h2 className="text-sm font-semibold text-ink mb-3">Next deadlines</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-3 py-4 text-center">No deadlines set.</p>
        ) : (
          <div className="space-y-0.5">
            {upcoming.map((c) => {
              const s = dueState(c.dueDate, c.done)
              const board = state.boards.find((b) => b.id === c.boardId)
              return (
                <button
                  key={c.id}
                  onClick={() => onOpenCard(c.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted transition text-left"
                >
                  <Avatar user={board?.members.find((m) => m.id === c.assigneeId) ?? null} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{c.title}</p>
                    <p className="text-xs text-ink-3 truncate">{board?.name}</p>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      s === 'overdue' ? 'text-danger' : s === 'soon' ? 'text-warning' : 'text-ink-2'
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
