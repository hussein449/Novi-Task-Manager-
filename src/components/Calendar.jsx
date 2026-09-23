import { useMemo, useState } from 'react'
import { Icon, Avatar } from './ui'
import { useStore, cardsOfBoard, memberFor, isAssignedTo } from '../store'
import { startOfDay, formatDue, dueState } from '../lib/utils'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

/** Monday-first grid of the 6 weeks covering the given month. */
function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function Calendar({ board, onOpenCard, onClose }) {
  const { state } = useStore()
  const [month, setMonth] = useState(() => startOfDay(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [personId, setPersonId] = useState('all')

  const cards = useMemo(
    () =>
      cardsOfBoard(state, board.id)
        .filter((c) => c.dueDate)
        .filter((c) => (personId === 'all' ? true : isAssignedTo(c, personId))),
    [state, board.id, personId],
  )

  const byDay = useMemo(() => {
    const map = new Map()
    cards.forEach((c) => {
      const key = startOfDay(c.dueDate).getTime()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    })
    return map
  }, [cards])

  const days = useMemo(() => monthGrid(month), [month])
  const selectedCards = byDay.get(startOfDay(selected).getTime()) ?? []
  const today = new Date()

  const memberOf = (card) => memberFor(board, card.assigneeId)

  const shiftMonth = (delta) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Icon name="planner" className="w-4 h-4 text-ink-3" />
        <h2 className="text-sm font-semibold text-ink">Deadlines</h2>
        <button
          onClick={onClose}
          className="ml-auto p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
          aria-label="Hide the calendar"
          title="Hide the calendar"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>
      </header>

      {/* who the calendar is showing */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line overflow-x-auto no-scrollbar">
        <button
          onClick={() => setPersonId('all')}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition ${
            personId === 'all'
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-line text-ink-2 hover:bg-muted'
          }`}
        >
          Everyone
        </button>
        {board.members.map((m) => {
          const count = cardsOfBoard(state, board.id).filter(
            (c) => c.dueDate && !c.done && isAssignedTo(c, m.id),
          ).length
          return (
            <button
              key={m.id}
              onClick={() => setPersonId(personId === m.id ? 'all' : m.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 text-xs font-medium border transition ${
                personId === m.id
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line text-ink-2 hover:bg-muted'
              }`}
              title={`${m.name} — ${count} open with a deadline`}
            >
              <Avatar user={m} size={18} />
              <span className="max-w-20 truncate">{m.name.split(' ')[0]}</span>
              {count > 0 && <span className="tabular-nums text-ink-3">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
            aria-label="Previous month"
          >
            <Icon name="chevron" className="w-4 h-4 rotate-180" />
          </button>
          <p className="text-sm font-semibold text-ink">
            {month.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
            aria-label="Next month"
          >
            <Icon name="chevron" className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-center text-[11px] font-medium text-ink-3 py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const items = byDay.get(startOfDay(day).getTime()) ?? []
            const outside = day.getMonth() !== month.getMonth()
            const isToday = sameDay(day, today)
            const isSelected = sameDay(day, selected)
            const overdue = items.some((c) => !c.done && new Date(c.dueDate) < today)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(startOfDay(day))}
                className={`relative aspect-square rounded-md text-xs transition flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-primary text-white font-semibold'
                    : isToday
                      ? 'bg-primary-soft text-primary font-semibold'
                      : outside
                        ? 'text-ink-3/50 hover:bg-muted'
                        : 'text-ink-2 hover:bg-muted'
                }`}
                aria-label={`${day.toDateString()}, ${items.length} due`}
              >
                {day.getDate()}
                {items.length > 0 && (
                  <span className="flex gap-0.5">
                    {items.slice(0, 3).map((c) => {
                      const m = memberOf(c)
                      return (
                        <span
                          key={c.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: isSelected
                              ? 'rgba(255,255,255,.9)'
                              : c.done
                                ? '#9aa4b2'
                                : (m?.color ?? (overdue ? '#d92d20' : '#7b8796')),
                          }}
                        />
                      )
                    })}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-line px-3 py-3">
        <p className="text-xs font-semibold text-ink-2 mb-2">
          {selected.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {selectedCards.length === 0 ? (
          <p className="text-xs text-ink-3 py-2">Nothing due on this day.</p>
        ) : (
          <div className="space-y-1">
            {selectedCards.map((c) => {
              const m = memberOf(c)
              const s = dueState(c.dueDate, c.done)
              return (
                <button
                  key={c.id}
                  onClick={() => onOpenCard(c.id)}
                  className="w-full flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition text-left"
                >
                  <Avatar user={m} size={20} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-medium truncate ${
                        c.done ? 'line-through text-ink-3' : 'text-ink'
                      }`}
                    >
                      {c.title}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        s === 'overdue' ? 'text-danger' : s === 'soon' ? 'text-warning' : 'text-ink-3'
                      }`}
                    >
                      {formatDue(c.dueDate)}
                      {m ? ` · ${m.name}` : ' · unassigned'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
