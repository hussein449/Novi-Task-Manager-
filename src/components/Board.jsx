import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import StatusGroup from './StatusGroup'
import { RowFace } from './TaskRow'
import { Icon, EmptyState, Button } from './ui'
import Calendar from './Calendar'
import { useStore, cardsOfBoard, canEdit, memberFor } from '../store'

const DOTS = ['bg-slate-500', 'bg-blue-600', 'bg-amber-600', 'bg-violet-600']
const DONE_DOT = 'bg-emerald-600'

const dotFor = (index, total) => {
  if (total > 1 && index === total - 1) return DONE_DOT
  return DOTS[index % DOTS.length]
}

export default function Board({ board, onOpenCard, query, calendarOpen, onCloseCalendar }) {
  const { state, dispatch } = useStore()
  const mayEdit = canEdit(board, state.user)
  const [activeId, setActiveId] = useState(null)
  const [overListId, setOverListId] = useState(null)
  const [addingList, setAddingList] = useState(false)
  const [listTitle, setListTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const boardCards = useMemo(() => cardsOfBoard(state, board.id), [state, board.id])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return boardCards
    return boardCards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (memberFor(board, c.assigneeId)?.name ?? '').toLowerCase().includes(q),
    )
  }, [boardCards, query, board.members])

  const byList = useMemo(() => {
    const map = {}
    board.lists.forEach((l) => {
      map[l.id] = visible.filter((c) => c.listId === l.id)
    })
    return map
  }, [board.lists, visible])

  const activeCard = activeId ? boardCards.find((c) => c.id === activeId) : null

  /**
   * Whatever is under the pointer wins, which is what a person expects when
   * they let go of a row. rectIntersection is only a fallback for keyboard
   * dragging, where there is no pointer.
   */
  const collisionDetection = (args) => {
    const pointerHits = pointerWithin(args)
    return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
  }

  const listIdOf = (over) => {
    if (!over) return null
    const data = over.data.current
    if (data?.type === 'list' || data?.type === 'card') return data.listId
    return board.lists.some((l) => l.id === over.id) ? over.id : null
  }

  const handleDragOver = ({ over }) => setOverListId(listIdOf(over))

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    setOverListId(null)
    if (!over || !mayEdit) return

    const toListId = listIdOf(over)
    if (!toListId) return

    // The reducer removes the card before re-inserting it, so the index handed
    // over is the card's final position, matching arrayMove semantics.
    const target = byList[toListId] ?? []
    const overIndex = target.findIndex((c) => c.id === over.id)
    const toIndex = overIndex === -1 ? target.length : overIndex

    dispatch({ type: 'moveCard', cardId: active.id, toListId, toIndex })
  }

  const submitList = (e) => {
    e.preventDefault()
    const value = listTitle.trim()
    if (value) dispatch({ type: 'addList', boardId: board.id, title: value })
    setListTitle('')
    setAddingList(false)
  }

  if (board.lists.length === 0) {
    return (
      <EmptyState
        icon="board"
        title="This board has no statuses yet"
        hint="Add one to start tracking work."
        action={
          mayEdit ? (
            <Button onClick={() => dispatch({ type: 'addList', boardId: board.id, title: 'To Do' })}>
              <Icon name="plus" className="w-4 h-4" />
              Add a status
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => {
        setActiveId(null)
        setOverListId(null)
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`px-4 sm:px-6 mx-auto w-full grid gap-4 items-start ${
          calendarOpen ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_320px]' : 'max-w-4xl'
        }`}
      >
        <div className="space-y-3 min-w-0">
        {board.lists.map((list, index) => (
          <StatusGroup
            key={list.id}
            board={board}
            list={list}
            cards={byList[list.id] ?? []}
            dot={dotFor(index, board.lists.length)}
            onOpenCard={onOpenCard}
            isDragTarget={activeId !== null && overListId === list.id}
            readOnly={!mayEdit}
            daily={index === 0}
            searching={Boolean(query.trim())}
          />
        ))}

        {!mayEdit ? null : addingList ? (
          <form onSubmit={submitList} className="rounded-xl border border-line bg-surface p-3">
            <input
              autoFocus
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setAddingList(false)}
              placeholder="Status name, for example Review"
              className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="rounded-lg bg-primary hover:bg-primary-dark text-white px-3 py-1.5 text-sm font-medium transition"
              >
                Add status
              </button>
              <button
                type="button"
                onClick={() => setAddingList(false)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingList(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-ink-2 hover:border-primary hover:text-primary hover:bg-surface transition"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add another status
          </button>
        )}
        </div>

        {calendarOpen && (
          <div className="lg:sticky lg:top-20">
            <Calendar board={board} onOpenCard={onOpenCard} onClose={onCloseCalendar} />
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeCard ? (
          <RowFace
            card={activeCard}
            member={memberFor(board, activeCard.assigneeId)}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
