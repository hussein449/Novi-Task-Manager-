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
  const state_ = dueState(card.dueDate, card.done)

  return (
    <Modal open onClose={onClose} title={board.name} wide>
      <div className="grid gap-5 sm:grid-cols-[1fr_260px]">
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
              className="w-full resize-none bg-transparent text-xl font-semibold outline-none rounded-xl px-2 -mx-2 py-1 focus:bg-white/8"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1 px-0.5">
              <button
                onClick={() => dispatch({ type: 'toggleDone', id: card.id })}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  card.done
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
                    : 'bg-white/8 border-white/12 text-white/70 hover:bg-white/14'
                }`}
              >
                <Icon name="check" className="w-3.5 h-3.5" />
                {card.done ? 'Completed' : 'Mark complete'}
              </button>
              <span className="text-xs text-white/40">
                in {board.lists.find((l) => l.id === card.listId)?.title ?? 'list'}
              </span>
            </div>
          </div>

          <Field label="Description">
            <textarea
              rows={5}
              value={draft?.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => patch({ description: draft?.description ?? '' })}
              placeholder="Add more detail, links, or acceptance criteria..."
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
                className={`${inputClass} [color-scheme:dark]`}
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
                  <option key={r.value} value={r.value} className="bg-ink-800">
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {card.dueDate && (
            <p
              className={`text-xs ${
                state_ === 'overdue' ? 'text-rose-300' : state_ === 'soon' ? 'text-amber-300' : 'text-white/50'
              }`}
            >
              <Icon name="bell" className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              {state_ === 'overdue'
                ? `Overdue since ${formatDue(card.dueDate)}`
                : `Due ${formatDue(card.dueDate)} · reminder ${
                    REMINDERS.find((r) => r.value === (card.remindBefore ?? 60))?.label.toLowerCase() ??
                    'set'
                  }`}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <Field label="Assigned to">
            <div className="space-y-1.5">
              <button
                onClick={() => patch({ assigneeId: null })}
                className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                  !card.assigneeId ? 'bg-white/14 ring-1 ring-white/20' : 'hover:bg-white/8'
                }`}
              >
                <Avatar user={null} size={26} />
                <span className="text-white/60">Unassigned</span>
              </button>
              {board.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => patch({ assigneeId: m.id })}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                    card.assigneeId === m.id ? 'bg-white/14 ring-1 ring-white/20' : 'hover:bg-white/8'
                  }`}
                >
                  <Avatar user={m} size={26} />
                  <span className="truncate">{m.name}</span>
                  {state.user?.id === m.id && <span className="ml-auto text-[10px] text-white/40">you</span>}
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
                <option key={l.id} value={l.id} className="bg-ink-800">
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
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    card.priority === key ? p.chip : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
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
              dispatch({ type: 'deleteCard', id: card.id })
              onClose()
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
