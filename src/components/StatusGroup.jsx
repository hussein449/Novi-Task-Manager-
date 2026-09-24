import { useEffect, useMemo, useRef, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import TaskRow, { RowFace } from './TaskRow'
import { Icon, ConfirmModal } from './ui'
import { useStore, memberFor } from '../store'
import { dateKey, dateKeyOffset, formatDayKey } from '../lib/utils'

/**
 * One status group in the task list. The droppable ref sits on the whole
 * section — header included — so a card dropped anywhere over the group lands
 * in it, rather than only over the rows themselves.
 *
 * Every status doubles as a day-by-day list: a card's `day` — separate from
 * any deadline — says which day's list it is on. The board's shared day
 * switcher (above all the statuses) pages every one of them at once, each new
 * day starts empty, and anything left open from before shows in a pinned
 * Overdue section until it is checked off.
 */
export default function StatusGroup({
  board,
  list,
  cards,
  dot,
  onOpenCard,
  isDragTarget,
  readOnly = false,
  dayOffset = 0,
  searching = false,
}) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [collapsed, setCollapsed] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  const { setNodeRef } = useDroppable({ id: list.id, data: { type: 'list', listId: list.id } })

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  useEffect(() => setListTitle(list.title), [list.title])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const showDaily = !searching
  const isToday = dayOffset === 0
  const todayKey = dateKey()
  const viewedKey = showDaily ? dateKeyOffset(dayOffset) : null

  const dayCards = useMemo(() => {
    if (!showDaily) return cards
    return cards.filter((c) => (c.day ? c.day === viewedKey : isToday))
  }, [showDaily, cards, viewedKey, isToday])

  const overdueCards = useMemo(() => {
    if (!showDaily || !isToday) return []
    return cards.filter((c) => !c.done && c.day && c.day < todayKey)
  }, [showDaily, isToday, cards, todayKey])

  const visibleCards = showDaily ? dayCards : cards
  const canAddHere = !readOnly && (isToday || searching)

  const toggleDaily = (id) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    if (card.done) {
      dispatch({ type: 'updateCard', id: card.id, patch: { done: false } })
      return
    }
    const needsStamp = !card.day || card.day < todayKey
    dispatch({
      type: 'updateCard',
      id: card.id,
      patch: needsStamp ? { done: true, day: todayKey } : { done: true },
    })
  }

  const handleToggle = showDaily ? toggleDaily : (id) => dispatch({ type: 'toggleDone', id })

  const handleDelete = (id) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    setConfirm({
      title: 'Delete task?',
      message: `Delete "${card.title}"? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => dispatch({ type: 'deleteCard', id }),
    })
  }

  const submit = (e) => {
    e?.preventDefault()
    const value = title.trim()
    if (!value) {
      setAdding(false)
      return
    }
    dispatch({
      type: 'addCard',
      boardId: board.id,
      listId: list.id,
      title: value,
      assigneeId: state.user?.id ?? null,
      day: todayKey,
    })
    setTitle('')
  }

  const saveRename = () => {
    const value = listTitle.trim()
    if (value) dispatch({ type: 'renameList', boardId: board.id, listId: list.id, title: value })
    else setListTitle(list.title)
    setRenaming(false)
  }

  const startAdding = () => {
    if (!canAddHere) return
    setCollapsed(false)
    setAdding(true)
  }

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border bg-surface overflow-hidden transition ${
        isDragTarget ? 'border-primary ring-2 ring-primary/20' : 'border-line'
      }`}
    >
      <header className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-muted/70 border-b border-line">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-line/70 transition"
          aria-label={collapsed ? `Expand ${list.title}` : `Collapse ${list.title}`}
          aria-expanded={!collapsed}
        >
          <Icon name="chevron" className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
        </button>

        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

        {renaming ? (
          <input
            autoFocus
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename()
              if (e.key === 'Escape') {
                setListTitle(list.title)
                setRenaming(false)
              }
            }}
            className="min-w-0 max-w-56 rounded-md border border-primary bg-surface px-2 py-1 text-sm font-semibold outline-none ring-2 ring-primary/20"
          />
        ) : (
          <button
            onClick={() => !readOnly && setRenaming(true)}
            className={`text-sm font-semibold text-ink truncate transition ${
              readOnly ? 'cursor-default' : 'hover:text-primary'
            }`}
            title={readOnly ? list.title : 'Rename status'}
          >
            {list.title}
          </button>
        )}

        <span className="text-xs font-medium text-ink-2 bg-surface border border-line rounded-full px-1.5 py-0.5 tabular-nums">
          {visibleCards.length}
        </span>

        {showDaily && overdueCards.length > 0 && (
          <span className="text-xs font-medium text-danger bg-danger-soft border border-red-200 rounded-full px-1.5 py-0.5 tabular-nums">
            {overdueCards.length} overdue
          </span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          {!canAddHere ? null : (
          <button
            onClick={startAdding}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink transition"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span className="hidden xs:inline">Add task</span>
          </button>
          )}

          {readOnly ? null : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface transition"
              aria-label={`Actions for ${list.title}`}
            >
              <Icon name="dots" className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-30 w-44 rounded-lg border border-line bg-surface p-1 shadow-lg animate-pop">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setRenaming(true)
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
                >
                  Rename status
                </button>
                {canAddHere && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      startAdding()
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
                  >
                    Add a task
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    if (board.lists.length <= 1) return
                    if (window.confirm(`Delete "${list.title}" and its ${cards.length} task(s)?`)) {
                      dispatch({ type: 'deleteList', boardId: board.id, listId: list.id })
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-soft disabled:opacity-40"
                  disabled={board.lists.length <= 1}
                >
                  Delete status
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </header>

      {!collapsed && (
        <div>
          {showDaily && isToday && overdueCards.length > 0 && (
            <div className="border-b border-line bg-danger-soft/40">
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-danger">
                Overdue · {overdueCards.length}
              </p>
              {overdueCards.map((card) => (
                <div key={card.id} className="border-t border-red-200/60 first:border-t-0">
                  <RowFace
                    card={card}
                    member={memberFor(board, card.assigneeId)}
                    onToggleDone={handleToggle}
                    onOpen={onOpenCard}
                    onDelete={handleDelete}
                    meta={`Was ${formatDayKey(card.day)}`}
                    readOnly={readOnly}
                    noDrag
                  />
                </div>
              ))}
            </div>
          )}

          <SortableContext items={visibleCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {visibleCards.map((card) => (
              <TaskRow
                key={card.id}
                card={card}
                member={memberFor(board, card.assigneeId)}
                onOpen={onOpenCard}
                onToggleDone={handleToggle}
                onDelete={handleDelete}
                readOnly={readOnly}
              />
            ))}
          </SortableContext>

          {visibleCards.length === 0 && !adding && (
            readOnly ? (
              <p className="px-3 py-4 text-sm text-ink-3 text-center">Nothing in this status.</p>
            ) : !canAddHere ? (
              <p className="px-3 py-4 text-sm text-ink-3 text-center">Nothing was on the list this day.</p>
            ) : (
              <button
                onClick={startAdding}
                className="w-full px-3 py-4 text-sm text-ink-3 hover:text-primary hover:bg-muted/60 transition"
              >
                {isDragTarget ? 'Drop here' : 'Nothing here yet — add a task, or drag one in'}
              </button>
            )
          )}

          {adding && (
            <form onSubmit={submit} className="px-2 sm:px-3 py-2.5 border-t border-line">
              <textarea
                ref={inputRef}
                rows={1}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e)
                  if (e.key === 'Escape') {
                    setTitle('')
                    setAdding(false)
                  }
                }}
                placeholder="Task name, then press Enter"
                className="w-full resize-none rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-3"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary hover:bg-primary-dark text-white px-3 py-1.5 text-sm font-medium transition"
                >
                  Add task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('')
                    setAdding(false)
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-muted transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </section>
  )
}
