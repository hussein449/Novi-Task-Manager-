import { useMemo, useState } from 'react'
import { RowFace } from './TaskRow'
import { Icon, EmptyState, inputClass } from './ui'
import { useStore } from '../store'
import { BUCKETS, bucketFor } from '../lib/utils'

const SCOPES = [
  { key: 'mine', label: 'Assigned to me' },
  { key: 'open', label: 'Open' },
  { key: 'all', label: 'Everything' },
]

export default function Planner({ onOpenCard, query }) {
  const { state, dispatch } = useStore()
  const [scope, setScope] = useState('mine')
  const [boardFilter, setBoardFilter] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.cards
      .filter((c) => (boardFilter === 'all' ? true : c.boardId === boardFilter))
      .filter((c) => (scope === 'mine' ? c.assigneeId === state.user?.id : true))
      .filter((c) => (scope === 'open' ? !c.done : true))
      .filter((c) => (q ? c.title.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
  }, [state.cards, state.user, scope, boardFilter, query])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(BUCKETS.map((b) => [b.key, []]))
    rows.forEach((c) => map[bucketFor(c.dueDate)].push(c))
    return map
  }, [rows])

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink tracking-tight">Planner</h1>
        <p className="text-sm text-ink-3 mt-0.5">Every deadline across your boards, in order.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                scope === s.key ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          className={`${inputClass} w-auto py-1.5`}
        >
          <option value="all">All boards</option>
          {state.boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="planner"
          title="Nothing scheduled here"
          hint="Give a card a deadline and it appears in this timeline."
        />
      ) : (
        <div className="space-y-7">
          {BUCKETS.map((bucket) => {
            const items = grouped[bucket.key]
            if (!items.length) return null
            return (
              <section key={bucket.key}>
                <header className="flex items-center gap-2 mb-2.5">
                  <Icon name="clock" className={`w-4 h-4 ${bucket.tone}`} />
                  <h2 className={`text-sm font-semibold ${bucket.tone}`}>{bucket.label}</h2>
                  <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {items.map((card) => {
                    const board = state.boards.find((b) => b.id === card.boardId)
                    return (
                      <div key={card.id} className="rounded-lg border border-line bg-surface shadow-xs">
                        <RowFace
                          card={card}
                          member={board?.members.find((m) => m.id === card.assigneeId) ?? null}
                          onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
                          onOpen={onOpenCard}
                          meta={board?.name}
                          noDrag
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
