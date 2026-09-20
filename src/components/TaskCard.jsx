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

export function CardFace({ card, member, onToggleDone, dragging = false, compact = false, meta }) {
  const state = dueState(card.dueDate, card.done)
  const priority = PRIORITIES[card.priority] ?? PRIORITIES.medium

  return (
    <div
      className={`rounded-lg border bg-surface p-3 text-left transition ${
        dragging
          ? 'border-line-strong shadow-lg rotate-1'
          : 'border-line shadow-xs hover:border-line-strong hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone?.(card.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`mt-px shrink-0 w-[18px] h-[18px] rounded-full border flex items-center justify-center transition ${
            card.done
              ? 'bg-success border-success text-white'
              : 'border-line-strong text-transparent hover:border-primary hover:text-primary/40'
          }`}
          aria-label={card.done ? 'Mark as not done' : 'Mark as done'}
        >
          <Icon name="check" className="w-3 h-3" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug break-words ${
              card.done ? 'line-through text-ink-3' : 'text-ink'
            }`}
          >
            {card.title}
          </p>

          {!compact && card.description && (
            <p className="mt-1 text-xs text-ink-3 line-clamp-2">{card.description}</p>
          )}
          {meta && <p className="mt-1 text-xs text-ink-3">{meta}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${dueChip[state]}`}
              >
                <Icon name="clock" className="w-3.5 h-3.5" />
                {formatDue(card.dueDate)}
              </span>
            )}
            {card.priority && card.priority !== 'medium' && (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${priority.chip}`}
              >
                <Icon name="flag" className="w-3.5 h-3.5" />
                {priority.label}
              </span>
            )}
            <span className="ml-auto">
              <Avatar user={member} size={24} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TaskCard({ card, member, onOpen, onToggleDone }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', listId: card.listId },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className="touch-none cursor-grab active:cursor-grabbing rounded-lg"
    >
      <CardFace card={card} member={member} onToggleDone={onToggleDone} />
    </div>
  )
}
