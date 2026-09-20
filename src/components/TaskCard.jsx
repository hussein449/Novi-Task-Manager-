import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, Icon } from './ui'
import { PRIORITIES } from '../store'
import { dueState, formatDue } from '../lib/utils'

const dueChip = {
  overdue: 'bg-rose-500/25 text-rose-100 border-rose-400/40',
  soon: 'bg-amber-500/25 text-amber-100 border-amber-400/40',
  upcoming: 'bg-white/10 text-white/70 border-white/15',
  done: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
  none: '',
}

export function CardFace({ card, member, onToggleDone, dragging = false, compact = false }) {
  const state = dueState(card.dueDate, card.done)
  const priority = PRIORITIES[card.priority] ?? PRIORITIES.medium

  return (
    <div
      className={`group rounded-2xl border p-3 text-left transition ${
        dragging
          ? 'bg-ink-700/95 border-white/25 shadow-2xl shadow-black/50 rotate-2'
          : 'bg-white/[0.07] border-white/10 hover:bg-white/[0.12] hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone?.(card.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border flex items-center justify-center transition ${
            card.done
              ? 'bg-emerald-500 border-emerald-400 text-white'
              : 'border-white/35 text-transparent hover:border-white/70'
          }`}
          aria-label={card.done ? 'Mark as not done' : 'Mark as done'}
        >
          <Icon name="check" className="w-3 h-3" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug break-words ${
              card.done ? 'line-through text-white/45' : 'text-white/95'
            }`}
          >
            {card.title}
          </p>

          {!compact && card.description && (
            <p className="mt-1 text-xs text-white/45 line-clamp-2">{card.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${dueChip[state]}`}
              >
                <Icon name="clock" className="w-3.5 h-3.5" />
                {formatDue(card.dueDate)}
              </span>
            )}
            {card.priority && card.priority !== 'medium' && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${priority.chip}`}
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
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <CardFace card={card} member={member} onToggleDone={onToggleDone} />
    </div>
  )
}
