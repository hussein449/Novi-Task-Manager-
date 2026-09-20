import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, Icon } from './ui'
import { PRIORITIES } from '../store'
import { dueState, formatDue } from '../lib/utils'

const dueChip = {
  overdue: 'bg-danger-soft text-danger border-red-200',
  soon: 'bg-warning-soft text-warning border-amber-200',
  upcoming: 'bg-muted text-ink-2 border-line',
  done: 'bg-success-soft text-success border-emerald-200',
  none: '',
}

/** The visual row. Rendered both in place and inside the drag overlay. */
export function RowFace({
  card,
  member,
  onToggleDone,
  onOpen,
  handleProps,
  dragging = false,
  meta,
  readOnly = false,
}) {
  const state = dueState(card.dueDate, card.done)
  const priority = PRIORITIES[card.priority] ?? PRIORITIES.medium

  return (
    <div
      className={`group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 transition ${
        dragging ? 'rounded-lg border border-line-strong bg-surface shadow-lg' : 'hover:bg-muted/70'
      }`}
    >
      {readOnly ? (
        <span className="shrink-0 w-6" />
      ) : (
        <button
          {...handleProps}
          className={`shrink-0 p-1 -ml-1 rounded-md text-ink-3 transition touch-none ${
            dragging ? 'cursor-grabbing' : 'cursor-grab hover:text-ink hover:bg-line/70'
          }`}
          aria-label="Drag to reorder or change status"
          title="Drag to reorder or change status"
        >
          <Icon name="grip" className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleDone?.(card.id)
        }}
        disabled={readOnly}
        className={`shrink-0 w-[18px] h-[18px] rounded-full border flex items-center justify-center transition ${
          card.done
            ? 'bg-success border-success text-white'
            : 'border-line-strong text-transparent hover:border-primary hover:text-primary/40'
        } ${readOnly ? 'pointer-events-none' : ''}`}
        aria-label={card.done ? 'Mark as not done' : 'Mark as done'}
      >
        <Icon name="check" className="w-3 h-3" />
      </button>

      <button
        onClick={() => onOpen?.(card.id)}
        className="min-w-0 flex-1 text-left"
        disabled={dragging}
      >
        <span
          className={`block truncate text-sm font-medium ${
            card.done ? 'line-through text-ink-3' : 'text-ink'
          }`}
        >
          {card.title}
        </span>

        <span className="mt-0.5 flex sm:hidden items-center gap-1.5 flex-wrap">
          {card.dueDate && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${dueChip[state]}`}>
              <Icon name="clock" className="w-3 h-3" />
              {formatDue(card.dueDate)}
            </span>
          )}
          {card.priority !== 'medium' && (
            <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs ${priority.chip}`}>
              {priority.label}
            </span>
          )}
          {meta && <span className="text-xs text-ink-3 truncate">{meta}</span>}
        </span>
        {meta && <span className="hidden sm:block text-xs text-ink-3 truncate">{meta}</span>}
      </button>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {card.priority !== 'medium' && (
          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${priority.chip}`}>
            <Icon name="flag" className="w-3 h-3" />
            {priority.label}
          </span>
        )}
        {card.dueDate ? (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-[150px] justify-center whitespace-nowrap ${dueChip[state]}`}
          >
            <Icon name="clock" className="w-3 h-3" />
            {formatDue(card.dueDate)}
          </span>
        ) : (
          <span className="w-[150px] text-center text-xs text-ink-3">No deadline</span>
        )}
        <Avatar user={member} size={24} />
      </div>

      <div className="sm:hidden shrink-0">
        <Avatar user={member} size={24} />
      </div>
    </div>
  )
}

export default function TaskRow({ card, member, onOpen, onToggleDone, meta, readOnly = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', listId: card.listId },
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border-b border-line last:border-b-0">
      <RowFace
        card={card}
        member={member}
        onOpen={onOpen}
        onToggleDone={onToggleDone}
        meta={meta}
        readOnly={readOnly}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
