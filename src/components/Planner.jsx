import { useMemo, useState } from 'react'
import { CardFace } from './TaskCard'
import { Icon, EmptyState } from './ui'
import { useStore } from '../store'
import { BUCKETS, bucketFor } from '../lib/utils'

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

  const scopes = [
    { key: 'mine', label: 'Assigned to me' },
    { key: 'open', label: 'Open' },
    { key: 'all', label: 'Everything' },
  ]

  return (
    <div className="px-4 sm:px-6 pb-8 max-w-4xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
        <p className="text-sm text-white/50 mt-0.5">Every deadline across your boards, in order.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex rounded-xl glass-soft p-1">
          {scopes.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scope === s.key ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          className="rounded-xl glass-soft px-3 py-2 text-xs font-semibold text-white/80 outline-none"
        >
          <option value="all" className="bg-ink-800">All boards</option>
          {state.boards.map((b) => (
            <option key={b.id} value={b.id} className="bg-ink-800">
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="planner"
          title="Nothing scheduled here"
          hint="Add a deadline to a card and it shows up in this timeline."
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
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${bucket.tone}`}>
                    {bucket.label}
                  </h2>
                  <span className="text-xs text-white/35">{items.length}</span>
                </header>
                <div className="space-y-2">
                  {items.map((card) => {
                    const board = state.boards.find((b) => b.id === card.boardId)
                    return (
                      <div key={card.id}>
                        <button onClick={() => onOpenCard(card.id)} className="block w-full text-left">
                          <CardFace
                            card={card}
                            member={board?.members.find((m) => m.id === card.assigneeId) ?? null}
                            onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
                            compact
                          />
                        </button>
                        <p className="mt-1 ml-3 text-[11px] text-white/35">{board?.name}</p>
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
