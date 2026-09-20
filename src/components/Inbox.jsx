import { useMemo } from 'react'
import { CardFace } from './TaskCard'
import { Icon, EmptyState, Button } from './ui'
import { useStore } from '../store'
import { formatDue } from '../lib/utils'

export default function Inbox({ onOpenCard, reminders }) {
  const { state, dispatch } = useStore()
  const { permission, askPermission } = reminders

  const mine = useMemo(
    () =>
      state.cards
        .filter((c) => c.assigneeId === state.user?.id && !c.done)
        .sort((a, b) => {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate) - new Date(b.dueDate)
        }),
    [state.cards, state.user],
  )

  const notes = state.notifications
    .map((n) => ({ ...n, card: state.cards.find((c) => c.id === n.cardId) }))
    .filter((n) => n.card)

  return (
    <div className="px-4 sm:px-6 pb-8 max-w-3xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="text-sm text-white/50 mt-0.5">Reminders that fired, and what is on your plate.</p>
      </div>

      {permission !== 'granted' && permission !== 'unsupported' && (
        <div className="mb-6 rounded-2xl glass-soft p-4 flex items-start gap-3">
          <Icon name="bell" className="w-5 h-5 mt-0.5 text-amber-300 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Turn on desktop reminders</p>
            <p className="text-xs text-white/55 mt-0.5">
              Allow notifications and deadlines will reach you even when this tab is in the background.
            </p>
          </div>
          <Button variant="ghost" onClick={askPermission} className="shrink-0">
            Allow
          </Button>
        </div>
      )}

      <section className="mb-8">
        <header className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">Reminders</h2>
          <span className="text-xs text-white/35">{notes.length}</span>
          {notes.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'clearNotifications' })}
              className="ml-auto text-xs text-white/45 hover:text-white transition"
            >
              Clear all
            </button>
          )}
        </header>
        {notes.length === 0 ? (
          <p className="text-sm text-white/40 rounded-2xl glass-soft px-4 py-6 text-center">
            No reminders have fired yet.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpenCard(n.card.id)}
                className="w-full text-left rounded-2xl glass-soft px-4 py-3 hover:bg-white/14 transition flex items-start gap-3"
              >
                <Icon name="bell" className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{n.card.title}</p>
                  <p className="text-xs text-white/45 mt-0.5">
                    {state.boards.find((b) => b.id === n.card.boardId)?.name} ·{' '}
                    {n.card.dueDate ? `due ${formatDue(n.card.dueDate)}` : 'no deadline'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <header className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">My open cards</h2>
          <span className="text-xs text-white/35">{mine.length}</span>
        </header>
        {mine.length === 0 ? (
          <EmptyState icon="check" title="Nothing assigned to you" hint="Enjoy the quiet." />
        ) : (
          <div className="space-y-2">
            {mine.map((card) => {
              const board = state.boards.find((b) => b.id === card.boardId)
              return (
                <button
                  key={card.id}
                  onClick={() => onOpenCard(card.id)}
                  className="block w-full text-left"
                >
                  <CardFace
                    card={card}
                    member={board?.members.find((m) => m.id === card.assigneeId) ?? null}
                    onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
                    compact
                  />
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
