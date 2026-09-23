import { useEffect, useMemo, useState } from 'react'
import { Icon, Button, Modal, Field, inputClass, EmptyState } from './ui'
import { useStore, canEdit, deliverablesOfBoard } from '../store'

const STATUS = {
  planned: { label: 'Planned', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', chip: 'bg-warning-soft text-warning border-amber-200' },
  completed: { label: 'Completed', chip: 'bg-success-soft text-success border-emerald-200' },
}

const CURRENCIES = ['USD', 'EUR', 'GBP']

const money = (value, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value || 0)

/* ---------------- add ---------------- */

function AddDeliverableModal({ boardId, onClose }) {
  const { dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({
      type: 'addDeliverable',
      boardId,
      title: title.trim(),
      price: Number(price) || 0,
      currency,
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

function DeliverableRow({ deliverable, mayEdit, onDelete }) {
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
    })
    setEditing(false)
  }

  const toggleApprove = () =>
    dispatch({ type: 'approveDeliverable', id: deliverable.id, approved: !deliverable.approved })

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
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink truncate">{deliverable.title}</p>
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

        {deliverable.status === 'completed' &&
          (deliverable.paid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2.5 py-1 text-xs font-medium">
              <Icon name="check" className="w-3 h-3" />
              Paid
            </span>
          ) : deliverable.approved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft text-primary px-2.5 py-1 text-xs font-medium">
              <Icon name="check" className="w-3 h-3" />
              Approved
              <button onClick={toggleApprove} className="text-primary/70 hover:text-primary underline">
                undo
              </button>
            </span>
          ) : (
            <Button size="sm" variant="success" onClick={toggleApprove}>
              Approve &amp; Pay
            </Button>
          ))}

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

/* ---------------- the view ---------------- */

export default function DeliverablesView({ board }) {
  const { state, dispatch } = useStore()
  const mayEdit = canEdit(board, state.user)
  const [adding, setAdding] = useState(false)

  const items = useMemo(() => deliverablesOfBoard(state, board.id), [state, board.id])

  const totals = useMemo(() => {
    const total = items.reduce((sum, d) => sum + (d.price || 0), 0)
    const readyToPay = items
      .filter((d) => d.status === 'completed' && d.approved && !d.paid)
      .reduce((sum, d) => sum + (d.price || 0), 0)
    return { total, readyToPay, currency: items[0]?.currency || 'USD' }
  }, [items])

  const releasePayment = () => {
    if (totals.readyToPay <= 0) return
    const ok = window.confirm(
      `Mark ${money(totals.readyToPay, totals.currency)} as paid? This only updates the record here — no real payment is sent.`,
    )
    if (ok) dispatch({ type: 'releasePayment', boardId: board.id })
  }

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Deliverables & Pricing</h1>
          <p className="text-sm text-ink-3 mt-0.5">Milestones for {board.name}, and what's owed for each.</p>
        </div>
        {mayEdit && (
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" className="w-4 h-4" />
            <span className="hidden xs:inline">Add deliverable</span>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="cash"
          title="No deliverables yet"
          hint={
            mayEdit
              ? 'Add a milestone with its price to start tracking billing here.'
              : 'Nothing has been added here yet.'
          }
          action={mayEdit ? <Button onClick={() => setAdding(true)}>Add a deliverable</Button> : null}
        />
      ) : (
        <>
          <div className="space-y-3 pb-24">
            {items.map((d) => (
              <DeliverableRow
                key={d.id}
                deliverable={d}
                mayEdit={mayEdit}
                onDelete={() => {
                  if (window.confirm(`Delete "${d.title}"?`)) {
                    dispatch({ type: 'deleteDeliverable', id: d.id })
                  }
                }}
              />
            ))}
          </div>

          <div className="sticky bottom-16 lg:bottom-0 z-10 -mx-4 sm:-mx-6 border-t border-line bg-surface/95 backdrop-blur px-4 sm:px-6 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-ink-3">Total project value</p>
                <p className="text-base font-semibold text-ink tabular-nums">
                  {money(totals.total, totals.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3">Ready to pay</p>
                <p className="text-base font-semibold text-success tabular-nums">
                  {money(totals.readyToPay, totals.currency)}
                </p>
              </div>
              <Button
                variant="success"
                className="ml-auto"
                onClick={releasePayment}
                disabled={totals.readyToPay <= 0}
              >
                Release Payment
              </Button>
            </div>
          </div>
        </>
      )}

      {adding && <AddDeliverableModal boardId={board.id} onClose={() => setAdding(false)} />}
    </div>
  )
}
