import { useMemo } from 'react'
import { Icon, Avatar, EmptyState } from './ui'
import { useStore, accentOf, ROLES, roleOf } from '../store'
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

const Bar = ({ pct, className = 'bg-primary' }) => (
  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
    <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${pct}%` }} />
  </div>
)

const summarise = (cards) => {
  const now = Date.now()
  const done = cards.filter((c) => c.done).length
  const overdue = cards.filter((c) => !c.done && c.dueDate && new Date(c.dueDate).getTime() < now).length
  const dueSoon = cards.filter(
    (c) =>
      !c.done &&
      c.dueDate &&
      new Date(c.dueDate).getTime() >= now &&
      new Date(c.dueDate).getTime() - now < 3 * 86400000,
  ).length
  return {
    total: cards.length,
    done,
    open: cards.length - done,
    overdue,
    dueSoon,
    pct: cards.length ? Math.round((done / cards.length) * 100) : 0,
  }
}

/** Per-person totals inside one folder, so workload is read in context. */
const peopleIn = (boards, cards) => {
  const map = new Map()
  boards.forEach((b) =>
    b.members.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, { member: m, role: roleOf(b, m.id), open: 0, done: 0, overdue: 0 })
    }),
  )
  cards.forEach((c) => {
    const row = map.get(c.assigneeId)
    if (!row) return
    if (c.done) row.done += 1
    else {
      row.open += 1
      if (c.dueDate && new Date(c.dueDate).getTime() < Date.now()) row.overdue += 1
    }
  })
  return [...map.values()].sort((a, b) => b.open - a.open || b.done - a.done)
}

export default function Overview({ onOpenBoard, onOpenCard }) {
  const { state } = useStore()

  const all = useMemo(() => summarise(state.cards), [state.cards])

  const folders = useMemo(
    () =>
      state.folders.map((folder) => {
        const boards = state.boards.filter((b) => b.folderId === folder.id)
        const ids = boards.map((b) => b.id)
        const cards = state.cards.filter((c) => ids.includes(c.boardId))
        return { folder, boards, cards, stats: summarise(cards), people: peopleIn(boards, cards) }
      }),
    [state.folders, state.boards, state.cards],
  )

  const upcoming = useMemo(
    () =>
      state.cards
        .filter((c) => !c.done && c.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 6),
    [state.cards],
  )

  return (
    <div className="px-4 sm:px-6 max-w-5xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink tracking-tight">Overview</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          Every project folder, its boards and who is carrying the work.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="All tasks" value={all.total} icon="board" />
        <Stat label="Completed" value={all.done} tone="text-success" icon="check" />
        <Stat label="Due in 3 days" value={all.dueSoon} tone="text-warning" icon="clock" />
        <Stat label="Overdue" value={all.overdue} tone="text-danger" icon="bell" />
      </div>

      {folders.length === 0 && (
        <EmptyState icon="folder" title="No project folders yet" hint="Create one to see it here." />
      )}

      <div className="mt-6 space-y-4">
        {folders.map(({ folder, boards, stats, people }) => (
          <section key={folder.id} className="rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b border-line">
              <span aria-hidden="true">{folder.emoji}</span>
              <h2 className="font-semibold text-ink">{folder.name}</h2>
              <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>

              <div className="ml-auto flex items-center gap-3 text-xs tabular-nums">
                <span className="text-ink-2">{stats.open} open</span>
                <span className="text-success">{stats.done} done</span>
                {stats.overdue > 0 && (
                  <span className="rounded-md bg-danger-soft text-danger px-1.5 py-0.5 font-medium">
                    {stats.overdue} overdue
                  </span>
                )}
                <span className="text-ink-3 w-9 text-right">{stats.pct}%</span>
              </div>
              <div className="w-full">
                <Bar pct={stats.pct} />
              </div>
            </header>

            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
              <div className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 px-1 mb-2">
                  Boards
                </p>
                {boards.length === 0 ? (
                  <p className="text-sm text-ink-3 px-1 py-2">No boards in this folder yet.</p>
                ) : (
                  <div className="space-y-0.5">
                    {boards.map((b) => {
                      const cards = state.cards.filter((c) => c.boardId === b.id)
                      const s = summarise(cards)
                      return (
                        <button
                          key={b.id}
                          onClick={() => onOpenBoard(b.id)}
                          className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-muted transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 accent-${accentOf(b)}`} />
                            <span className="text-sm font-medium text-ink truncate">{b.name}</span>
                            {s.overdue > 0 && (
                              <span className="shrink-0 rounded-md bg-danger-soft text-danger px-1.5 text-xs font-medium">
                                {s.overdue}
                              </span>
                            )}
                            <span className="ml-auto text-xs text-ink-3 tabular-nums shrink-0">
                              {s.done}/{s.total}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <Bar pct={s.pct} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 px-1 mb-2">
                  People in this folder
                </p>
                {people.length === 0 ? (
                  <p className="text-sm text-ink-3 px-1 py-2">Nobody has been added yet.</p>
                ) : (
                  <div className="space-y-0.5">
                    {people.map(({ member, role, open, done, overdue }) => (
                      <div key={member.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                        <Avatar user={member} size={26} />
                        <span className="min-w-0">
                          <span className="block text-sm text-ink truncate">{member.name}</span>
                          <span className="block text-xs text-ink-3">{ROLES[role]?.label ?? 'Member'}</span>
                        </span>
                        <span className="ml-auto flex items-center gap-2 text-xs tabular-nums shrink-0">
                          {overdue > 0 && (
                            <span className="rounded-md bg-danger-soft text-danger px-1.5 py-0.5 font-medium">
                              {overdue} late
                            </span>
                          )}
                          <span className="text-ink-2">{open} open</span>
                          <span className="text-ink-3">{done} done</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 shadow-xs mt-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Next deadlines, across every folder</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-3 py-4 text-center">No deadlines set.</p>
        ) : (
          <div className="space-y-0.5">
            {upcoming.map((c) => {
              const s = dueState(c.dueDate, c.done)
              const board = state.boards.find((b) => b.id === c.boardId)
              const folder = state.folders.find((f) => f.id === board?.folderId)
              return (
                <button
                  key={c.id}
                  onClick={() => onOpenCard(c.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted transition text-left"
                >
                  <Avatar user={board?.members.find((m) => m.id === c.assigneeId) ?? null} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{c.title}</p>
                    <p className="text-xs text-ink-3 truncate">
                      {folder ? `${folder.name} · ` : ''}
                      {board?.name}
                    </p>
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
