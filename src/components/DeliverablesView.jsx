import { useEffect, useMemo, useState } from 'react'
import { Icon, Avatar, Button, Modal, Field, inputClass, EmptyState, ConfirmModal } from './ui'
import { useStore, canEdit, deliverablesOfBoard, cardsOfBoard, memberFor, isAssignedTo, EVERYONE } from '../store'
import { formatDue, dateKey, dateKeyOffset, formatDayKey } from '../lib/utils'

const STATUS = {
  planned: { label: 'Planned', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', chip: 'bg-warning-soft text-warning border-amber-200' },
  completed: { label: 'Completed', chip: 'bg-success-soft text-success border-emerald-200' },
}

const CURRENCIES = ['USD', 'EUR', 'GBP']

// Not tracked for billing on this page, by request — her tasks and
// deliverables still show normally everywhere else in the app. Remove this
// to include her again.
const BILLING_EXCLUDED = ['zeinaghaddar626@gmail.com']

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
              {board.members
                .filter((m) => !BILLING_EXCLUDED.includes(m.id))
                .map((m) => (
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
      // Locked once paid, regardless of what the (disabled) fields hold.
      price: deliverable.paid ? deliverable.price : Number(draft.price) || 0,
      currency: deliverable.paid ? deliverable.currency : draft.currency || 'USD',
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
            disabled={deliverable.paid}
            className={inputClass}
          />
          <select
            value={draft.currency}
            onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            disabled={deliverable.paid}
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {deliverable.paid && (
          <p className="text-xs text-ink-3">Locked — paid amounts cannot be changed.</p>
        )}
        <select
          value={draft.assigneeId ?? ''}
          onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          <option value={EVERYONE}>Everyone</option>
          {board.members
            .filter((m) => !BILLING_EXCLUDED.includes(m.id))
            .map((m) => (
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
    if (card.paid) return
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

      {mayEdit && !card.paid ? (
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
        <p
          className="shrink-0 font-semibold text-ink tabular-nums w-24 text-right"
          title={card.paid ? 'Locked — paid amounts cannot be changed' : undefined}
        >
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

  // Filtering by person, and paging through the days tasks were created, are
  // both page-local views, not data changes — reset when the project
  // switcher picks a different board.
  const [personFilter, setPersonFilter] = useState('all')
  const [taskDayOffset, setTaskDayOffset] = useState(0)
  useEffect(() => {
    setPersonFilter('all')
    setTaskDayOffset(0)
  }, [board.id])

  const billableMembers = useMemo(
    () => board.members.filter((m) => !BILLING_EXCLUDED.includes(m.id)),
    [board.members],
  )

  const items = useMemo(
    () => deliverablesOfBoard(state, board.id).filter((d) => !BILLING_EXCLUDED.includes(d.assigneeId)),
    [state, board.id],
  )

  // Every task on the board, pulled in automatically — not-done first, then
  // done, so what's still owed shows before what's already finished.
  const tasks = useMemo(
    () =>
      [...cardsOfBoard(state, board.id)]
        .filter((c) => !BILLING_EXCLUDED.includes(c.assigneeId))
        .sort((a, b) => Number(a.done) - Number(b.done)),
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

  // Tasks pile up fast once a board's been running a while, so the Tasks
  // list is paged by the day each task was created when browsing everyone —
  // but once you've filtered to one person, show all of their tasks instead
  // of intersecting with a specific day, so the list doesn't go empty next
  // to a nonzero total (perPerson's totals are always whole-history).
  const taskDayKey = dateKeyOffset(taskDayOffset)
  const isTaskToday = taskDayOffset === 0
  const dayTasks = useMemo(
    () =>
      personFilter === 'all'
        ? visibleTasks.filter((c) => dateKey(new Date(c.createdAt)) === taskDayKey)
        : visibleTasks,
    [visibleTasks, taskDayKey, personFilter],
  )

  // Tasks and manual deliverables can both carry an assignee, so both count
  // here. "Owed" is just priced + unpaid — not gated on a task's done state,
  // since the freelancer decides when someone gets paid, not the app.
  const perPerson = useMemo(() => {
    const rows = billableMembers.map((m) => {
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
  }, [billableMembers, tasks, items])

  // Filtering to one person narrows this to just their row — still with a
  // total and a working "Mark as paid", not hidden entirely.
  const visiblePersonRows =
    personFilter === 'all' ? perPerson.rows : perPerson.rows.filter((row) => row.member.id === personFilter)

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

      <div className="mb-6">
        <label className="block text-xs font-medium text-ink-3 mb-1">Filter by person</label>
        <select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          className={`${inputClass} w-auto max-w-[14rem] py-1.5`}
        >
          <option value="all">Everyone</option>
          {billableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-ink">Tasks</h2>
          {personFilter === 'all' && (
            <div className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-1.5 py-1 shrink-0">
              <button
                onClick={() => setTaskDayOffset((o) => o - 1)}
                className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
                aria-label="Previous day"
              >
                <Icon name="chevron" className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span className="text-xs font-bold text-ink px-0.5 whitespace-nowrap">
                {formatDayKey(taskDayKey)}
              </span>
              <button
                onClick={() => setTaskDayOffset((o) => Math.min(0, o + 1))}
                disabled={isTaskToday}
                className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Next day"
              >
                <Icon name="chevron" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-ink-3 -mt-2 mb-3">
          {personFilter === 'all'
            ? "Tasks created that day, so they don't all pile up at once."
            : 'Every task assigned to this person, across all days.'}
        </p>

        {dayTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong text-sm text-ink-3 px-4 py-6 text-center">
            {personFilter === 'all'
              ? `No tasks created ${formatDayKey(taskDayKey).toLowerCase()}.`
              : 'No tasks assigned to this person.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {dayTasks.map((card) => (
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

      {visiblePersonRows.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-ink mb-3">
            {personFilter === 'all'
              ? 'Totals by person (all time)'
              : `Total for ${visiblePersonRows[0].member.name} (all time)`}
          </h2>
          <div className="rounded-xl border border-line bg-surface divide-y divide-line overflow-hidden">
            {visiblePersonRows.map((row) => (
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
            {personFilter === 'all' && perPerson.unassigned > 0 && (
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
