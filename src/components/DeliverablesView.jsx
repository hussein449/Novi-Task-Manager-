import { useEffect, useMemo, useState } from 'react'
import { Icon, Avatar, Button, Modal, Field, inputClass, EmptyState, ConfirmModal } from './ui'
import { useStore, canEdit, deliverablesOfBoard, cardsOfBoard, memberFor, isAssignedTo, EVERYONE } from '../store'
import { formatDue } from '../lib/utils'

const STATUS = {
  planned: { label: 'Planned', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', chip: 'bg-warning-soft text-warning border-amber-200' },
  completed: { label: 'Completed', chip: 'bg-success-soft text-success border-emerald-200' },
}

const CURRENCIES = ['USD', 'EUR', 'GBP']

const money = (value, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value || 0)

/* ---------------- add ---------------- */

function AddDeliverableModal({ board, onClose }) {
  const { dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [assigneeId, setAssigneeId] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({
      type: 'addDeliverable',
      boardId: board.id,
      title: title.trim(),
      price: Number(price) || 0,
      currency,
      assigneeId: assigneeId || null,
    })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="New deliverable" subtitle="A milestone, and what it costs.">
      <form onSubmit={submit}>
        <Field label="Title">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Homepage redesign"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-3 mt-4">
          <Field label="Price">
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Assign to">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              <option value={EVERYONE}>Everyone</option>
              {board.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={!title.trim()}>
            Add deliverable
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------------- one row ---------------- */

function DeliverableRow({ deliverable, board, member, mayEdit, onDelete }) {
  const { dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(deliverable)

  useEffect(() => setDraft(deliverable), [deliverable])

  const patch = (p) => mayEdit && dispatch({ type: 'updateDeliverable', id: deliverable.id, patch: p })

  const saveEdit = () => {
    const title = (draft.title ?? '').trim()
    if (!title) {
      setDraft(deliverable)
      setEditing(false)
      return
    }
    patch({
      title,
      description: draft.description ?? '',
      price: Number(draft.price) || 0,
      currency: draft.currency || 'USD',
      assigneeId: draft.assigneeId || null,
    })
    setEditing(false)
  }

  const markPaid = () =>
    dispatch({
      type: 'updateDeliverable',
      id: deliverable.id,
      patch: { approved: true, paid: true, paidAt: new Date().toISOString() },
    })

  const undoPaid = () =>
    dispatch({ type: 'updateDeliverable', id: deliverable.id, patch: { paid: false, paidAt: null } })

  if (editing) {
    return (
      <div className="rounded-xl border border-primary bg-surface p-4 space-y-3 shadow-xs">
        <input
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title"
          className={inputClass}
        />
        <textarea
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Details (optional)"
          className={`${inputClass} resize-y`}
        />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            className={inputClass}
          />
          <select
            value={draft.currency}
            onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <select
          value={draft.assigneeId ?? ''}
          onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          <option value={EVERYONE}>Everyone</option>
          {board.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdit}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(deliverable)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const status = STATUS[deliverable.status] ?? STATUS.planned

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar user={member} size={28} title={member ? member.name : 'Unassigned'} />

        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink truncate">{deliverable.title}</p>
          <p className="text-xs text-ink-3 mt-0.5 truncate">{member ? member.name : 'Unassigned'}</p>
          {deliverable.description && (
            <p className="text-sm text-ink-3 mt-0.5 line-clamp-2">{deliverable.description}</p>
          )}
        </div>

        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${status.chip}`}>
          {status.label}
        </span>

        <p className="shrink-0 text-right font-semibold text-ink tabular-nums">
          {money(deliverable.price, deliverable.currency)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mayEdit && (
          <select
            value={deliverable.status}
            onChange={(e) => patch({ status: e.target.value })}
            className="rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
          >
            {Object.entries(STATUS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {deliverable.paid ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft text-success px-2.5 py-1 text-xs font-medium">
            <Icon name="check" className="w-3 h-3" />
            Paid {formatDue(deliverable.paidAt)}
            {mayEdit && (
              <button onClick={undoPaid} className="text-success/70 hover:text-success underline">
                undo
              </button>
            )}
          </span>
        ) : (
          mayEdit && (
            <Button size="sm" variant="success" onClick={markPaid}>
              Mark as paid
            </Button>
          )
        )}

        {mayEdit && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
              aria-label={`Edit ${deliverable.title}`}
            >
              <Icon name="pencil" className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
              aria-label={`Delete ${deliverable.title}`}
            >
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- one task, priced ---------------- */

function TaskPriceRow({ card, member, mayEdit, onDelete }) {
  const { dispatch } = useStore()
  const [price, setPrice] = useState(String(card.price ?? 0))

  useEffect(() => setPrice(String(card.price ?? 0)), [card.id, card.price])

  const save = () => {
    const value = Number(price) || 0
    if (value !== (card.price ?? 0)) {
      dispatch({ type: 'updateCard', id: card.id, patch: { price: value } })
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5 shadow-xs flex flex-wrap items-center gap-3">
      <Avatar user={member} size={28} />

      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{card.title}</p>
        <p className="text-xs text-ink-3 mt-0.5 truncate">{member ? member.name : 'Unassigned'}</p>
      </div>

      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
          card.done
            ? 'bg-success-soft text-success border-emerald-200'
            : 'bg-muted text-ink-2 border-line'
        }`}
      >
        {card.done ? 'Done' : 'Not done'}
      </span>

      {card.paid && (
        <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-success-soft text-success px-2.5 py-1 text-xs font-medium">
          <Icon name="check" className="w-3 h-3" />
          Paid
        </span>
      )}

      {mayEdit ? (
        <div className="shrink-0 flex items-center gap-1">
          <span className="text-ink-3 text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={save}
            placeholder="0.00"
            className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm text-right outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : (
        <p className="shrink-0 font-semibold text-ink tabular-nums w-24 text-right">
          {money(card.price, 'USD')}
        </p>
      )}

      {mayEdit && (
        <button
          onClick={onDelete}
          className="shrink-0 p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
          aria-label={`Delete ${card.title}`}
          title="Delete this task"
        >
          <Icon name="trash" className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/* ---------------- the view ---------------- */

export default function DeliverablesView({ board: initialBoard }) {
  const { state, dispatch } = useStore()

  // Its own project switcher, independent of whatever board is "active"
  // elsewhere — picking a different project here doesn't jump you away from
  // whatever you were doing on the board itself.
  const [boardId, setBoardId] = useState(initialBoard.id)
  useEffect(() => setBoardId(initialBoard.id), [initialBoard.id])
  const board = state.boards.find((b) => b.id === boardId) ?? initialBoard

  const mayEdit = canEdit(board, state.user)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Filtering by person is a page-local view, not a data change — reset it
  // whenever the project switcher picks a different board.
  const [personFilter, setPersonFilter] = useState('all')
  useEffect(() => setPersonFilter('all'), [board.id])

  const items = useMemo(() => deliverablesOfBoard(state, board.id), [state, board.id])

  // Every task on the board, pulled in automatically — not-done first, then
  // done, so what's still owed shows before what's already finished.
  const tasks = useMemo(
    () => [...cardsOfBoard(state, board.id)].sort((a, b) => Number(a.done) - Number(b.done)),
    [state, board.id],
  )

  const visibleTasks = useMemo(
    () => (personFilter === 'all' ? tasks : tasks.filter((c) => isAssignedTo(c, personFilter))),
    [tasks, personFilter],
  )
  const visibleItems = useMemo(
    () => (personFilter === 'all' ? items : items.filter((d) => isAssignedTo(d, personFilter))),
    [items, personFilter],
  )

  // Tasks and manual deliverables can both carry an assignee, so both count
  // here. "Owed" is just priced + unpaid — not gated on a task's done state,
  // since the freelancer decides when someone gets paid, not the app.
  const perPerson = useMemo(() => {
    const rows = board.members.map((m) => {
      const mine = [...tasks.filter((c) => isAssignedTo(c, m.id)), ...items.filter((d) => isAssignedTo(d, m.id))]
      const owed = mine.filter((x) => !x.paid && (x.price || 0) > 0)
      const paidAts = mine.filter((x) => x.paid && x.paidAt).map((x) => x.paidAt)
      return {
        member: m,
        total: mine.reduce((sum, x) => sum + (x.price || 0), 0),
        owedTotal: owed.reduce((sum, x) => sum + (x.price || 0), 0),
        lastPaidAt: paidAts.length ? paidAts.sort().at(-1) : null,
      }
    })
    const unassigned =
      tasks.filter((c) => !c.assigneeId).reduce((sum, c) => sum + (c.price || 0), 0) +
      items.filter((d) => !d.assigneeId).reduce((sum, d) => sum + (d.price || 0), 0)
    return { rows, unassigned }
  }, [board.members, tasks, items])

  const markPersonPaid = (row) => {
    if (row.owedTotal <= 0) return
    setConfirm({
      title: 'Mark as paid?',
      message: `Mark ${money(row.owedTotal, 'USD')} as paid to ${row.member.name}? This only updates the record here — no real payment is sent.`,
      confirmLabel: 'Mark as paid',
      danger: false,
      onConfirm: () => dispatch({ type: 'payPerson', boardId: board.id, memberId: row.member.id }),
    })
  }

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Deliverables & Pricing</h1>
          <p className="text-sm text-ink-3 mt-0.5">Every task on {board.name}, and what's owed for it.</p>
        </div>

        <select
          value={board.id}
          onChange={(e) => setBoardId(e.target.value)}
          className={`${inputClass} w-auto max-w-[14rem] py-1.5`}
          aria-label="Switch project"
        >
          {state.folders.map((folder) => {
            const folderBoards = state.boards.filter((b) => b.folderId === folder.id)
            if (folderBoards.length === 0) return null
            return (
              <optgroup key={folder.id} label={folder.name}>
                {folderBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setPersonFilter('all')}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition ${
            personFilter === 'all'
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-line text-ink-2 hover:bg-muted'
          }`}
        >
          Everyone
        </button>
        {board.members.map((m) => (
          <button
            key={m.id}
            onClick={() => setPersonFilter(personFilter === m.id ? 'all' : m.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-xs font-medium border transition ${
              personFilter === m.id
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line text-ink-2 hover:bg-muted'
            }`}
          >
            <Avatar user={m} size={18} />
            <span className="max-w-24 truncate">{m.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-3">Tasks</h2>
        {visibleTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong text-sm text-ink-3 px-4 py-6 text-center">
            {personFilter === 'all' ? 'No tasks on this board yet.' : 'No tasks assigned to this person.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {visibleTasks.map((card) => (
              <TaskPriceRow
                key={card.id}
                card={card}
                member={memberFor(board, card.assigneeId)}
                mayEdit={mayEdit}
                onDelete={() =>
                  setConfirm({
                    title: 'Delete task?',
                    message: `Delete "${card.title}"? This removes it from the board too.`,
                    confirmLabel: 'Delete',
                    danger: true,
                    onConfirm: () => dispatch({ type: 'deleteCard', id: card.id }),
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-ink">Other deliverables</h2>
          {mayEdit && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Icon name="plus" className="w-3.5 h-3.5" />
              Add deliverable
            </Button>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong text-sm text-ink-3 px-4 py-6 text-center">
            {personFilter !== 'all'
              ? 'Nothing assigned to this person.'
              : mayEdit
                ? 'Anything billable that isn’t a task — a flat fee, a retainer — goes here.'
                : 'Nothing has been added here yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((d) => (
              <DeliverableRow
                key={d.id}
                deliverable={d}
                board={board}
                member={memberFor(board, d.assigneeId)}
                mayEdit={mayEdit}
                onDelete={() =>
                  setConfirm({
                    title: 'Delete deliverable?',
                    message: `Delete "${d.title}"? This can't be undone.`,
                    confirmLabel: 'Delete',
                    danger: true,
                    onConfirm: () => dispatch({ type: 'deleteDeliverable', id: d.id }),
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {personFilter === 'all' && tasks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-ink mb-3">Totals by person</h2>
          <div className="rounded-xl border border-line bg-surface divide-y divide-line overflow-hidden">
            {perPerson.rows.map((row) => (
              <div key={row.member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar user={row.member} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate">{row.member.name}</p>
                  {row.lastPaidAt && (
                    <p className="text-xs text-ink-3 mt-0.5">Last paid {formatDue(row.lastPaidAt)}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-ink tabular-nums shrink-0">
                  {money(row.total, 'USD')}
                </span>
                {mayEdit &&
                  (row.owedTotal > 0 ? (
                    <Button size="sm" variant="success" onClick={() => markPersonPaid(row)}>
                      Mark as paid
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled>
                      {row.lastPaidAt ? 'Paid' : 'Nothing owed'}
                    </Button>
                  ))}
              </div>
            ))}
            {perPerson.unassigned > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Avatar user={null} size={26} />
                <span className="text-sm text-ink-3 flex-1">Unassigned</span>
                <span className="text-sm font-semibold text-ink tabular-nums">
                  {money(perPerson.unassigned, 'USD')}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {adding && <AddDeliverableModal board={board} onClose={() => setAdding(false)} />}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  )
}
