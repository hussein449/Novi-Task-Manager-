import { useMemo } from 'react'
import { RowFace } from './TaskRow'
import { Icon, EmptyState, Button, SectionTitle } from './ui'
import { useStore, memberFor, isAssignedTo } from '../store'
import { formatDue } from '../lib/utils'

export default function Inbox({ onOpenCard, reminders }) {
  const { state, dispatch } = useStore()
  const { permission, askPermission } = reminders

  const mine = useMemo(
    () =>
      state.cards
        .filter((c) => isAssignedTo(c, state.user?.id) && !c.done)
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
    <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink tracking-tight">Inbox</h1>
        <p className="text-sm text-ink-3 mt-0.5">Reminders that fired, and what is on your plate.</p>
      </div>

      {permission !== 'granted' && permission !== 'unsupported' && (
        <div className="mb-6 rounded-xl border border-line bg-surface p-4 flex items-start gap-3">
          <span className="grid place-items-center w-8 h-8 rounded-full bg-primary-soft text-primary shrink-0">
            <Icon name="bell" className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">Turn on desktop reminders</p>
            <p className="text-sm text-ink-3 mt-0.5">
              Allow notifications and deadlines reach you even when this tab is in the background.
            </p>
          </div>
          <Button variant="secondary" onClick={askPermission} className="shrink-0">
            Allow
          </Button>
        </div>
      )}

      <section className="mb-8">
        <SectionTitle
          count={notes.length}
          action={
            notes.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'clearNotifications' })}
                className="text-sm text-ink-2 hover:text-primary transition"
              >
                Clear all
              </button>
            )
          }
        >
          Reminders
        </SectionTitle>

        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong text-sm text-ink-3 px-4 py-6 text-center">
            No reminders have fired yet.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpenCard(n.card.id)}
                className="w-full text-left rounded-lg border border-line bg-surface px-4 py-3 shadow-xs hover:border-line-strong hover:shadow-sm transition flex items-start gap-3"
              >
                <span className="mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-warning-soft text-warning shrink-0">
                  <Icon name="bell" className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{n.card.title}</p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">
                    {state.boards.find((b) => b.id === n.card.boardId)?.name}
                    {n.card.dueDate ? ` · due ${formatDue(n.card.dueDate)}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle count={mine.length}>My open cards</SectionTitle>
        {mine.length === 0 ? (
          <EmptyState icon="check" title="Nothing assigned to you" hint="You are all caught up." />
        ) : (
          <div className="space-y-2">
            {mine.map((card) => {
              const board = state.boards.find((b) => b.id === card.boardId)
              return (
                <div key={card.id} className="rounded-lg border border-line bg-surface shadow-xs">
                  <RowFace
                    card={card}
                    member={memberFor(board, card.assigneeId)}
                    onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
                    onOpen={onOpenCard}
                    meta={board?.name}
                    noDrag
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
