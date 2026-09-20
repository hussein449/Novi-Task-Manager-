import { useEffect, useState } from 'react'
import { Modal, Field, inputClass, Button, Avatar, Icon } from './ui'
import { useStore, PRIORITIES } from '../store'
import { toInputValue, formatDue, dueState } from '../lib/utils'

const REMINDERS = [
  { value: 0, label: 'At the deadline' },
  { value: 10, label: '10 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 180, label: '3 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
]

export default function CardModal({ cardId, onClose }) {
  const { state, dispatch } = useStore()
  const card = state.cards.find((c) => c.id === cardId)
  const board = state.boards.find((b) => b.id === card?.boardId)
  const [draft, setDraft] = useState(card)

  useEffect(() => setDraft(card), [cardId, card])

  if (!card || !board) return null

  const patch = (p) => dispatch({ type: 'updateCard', id: card.id, patch: p })
  const due = dueState(card.dueDate, card.done)
  const list = board.lists.find((l) => l.id === card.listId)

  return (
    <Modal open onClose={onClose} title="Card details" subtitle={`${board.name} · ${list?.title ?? ''}`} wide>
      <div className="grid gap-6 sm:grid-cols-[1fr_240px]">
        <div className="space-y-5">
          <div>
            <textarea
              rows={2}
              value={draft?.title ?? ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={() => {
                const value = (draft?.title ?? '').trim()
                if (value && value !== card.title) patch({ title: value })
                else if (!value) setDraft({ ...draft, title: card.title })
              }}
              className="w-full resize-none rounded-lg border border-transparent hover:border-line px-2 -mx-2 py-1 text-lg font-semibold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => dispatch({ type: 'toggleDone', id: card.id })}
              className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                card.done
                  ? 'bg-success-soft border-emerald-200 text-success'
                  : 'bg-surface border-line-strong text-ink-2 hover:bg-muted'
              }`}
            >
              <Icon name="check" className="w-3.5 h-3.5" />
              {card.done ? 'Completed' : 'Mark complete'}
            </button>
          </div>

          <Field label="Description">
            <textarea
              rows={5}
              value={draft?.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => patch({ description: draft?.description ?? '' })}
              placeholder="Add detail, links or what done looks like…"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <Field label="Deadline">
              <input
                type="datetime-local"
                value={toInputValue(card.dueDate)}
                onChange={(e) =>
                  patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Remind me">
              <select
                value={card.remindBefore ?? 60}
                onChange={(e) => patch({ remindBefore: Number(e.target.value) })}
                className={inputClass}
                disabled={!card.dueDate}
              >
                {REMINDERS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {card.dueDate ? (
            <p
              className={`flex items-center gap-1.5 text-xs ${
                due === 'overdue' ? 'text-danger' : due === 'soon' ? 'text-warning' : 'text-ink-3'
              }`}
            >
              <Icon name="bell" className="w-3.5 h-3.5" />
              {due === 'overdue'
                ? `Overdue since ${formatDue(card.dueDate)}`
                : `Due ${formatDue(card.dueDate)} · reminder ${(
                    REMINDERS.find((r) => r.value === (card.remindBefore ?? 60))?.label ?? ''
                  ).toLowerCase()}`}
            </p>
          ) : (
            <p className="text-xs text-ink-3">Set a deadline to get a reminder for this card.</p>
          )}
        </div>

        <div className="space-y-5">
          <Field label="Assigned to">
            <div className="space-y-1">
              <button
                onClick={() => patch({ assigneeId: null })}
                className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition ${
                  !card.assigneeId ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-muted'
                }`}
              >
                <Avatar user={null} size={26} />
                <span className="text-ink-2">Unassigned</span>
              </button>
              {board.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => patch({ assigneeId: m.id })}
                  className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition ${
                    card.assigneeId === m.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <Avatar user={m} size={26} />
                  <span className="truncate text-ink">{m.name}</span>
                  {state.user?.id === m.id && <span className="ml-auto text-xs text-ink-3">you</span>}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Status">
            <select
              value={card.listId}
              onChange={(e) =>
                dispatch({ type: 'moveCard', cardId: card.id, toListId: e.target.value, toIndex: 0 })
              }
              className={inputClass}
            >
              {board.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <div className="flex gap-1.5">
              {Object.entries(PRIORITIES).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => patch({ priority: key })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    card.priority === key ? p.chip : 'border-line-strong bg-surface text-ink-2 hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (window.confirm('Delete this card?')) {
                dispatch({ type: 'deleteCard', id: card.id })
                onClose()
              }
            }}
          >
            <Icon name="trash" className="w-4 h-4" />
            Delete card
          </Button>
        </div>
      </div>
    </Modal>
  )
}
