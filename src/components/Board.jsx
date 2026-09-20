import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import List from './List'
import { CardFace } from './TaskCard'
import { Icon, EmptyState, Button } from './ui'
import { useStore, cardsOfBoard } from '../store'

export default function Board({ board, onOpenCard, query }) {
  const { state, dispatch } = useStore()
  const [activeId, setActiveId] = useState(null)
  const [addingList, setAddingList] = useState(false)
  const [listTitle, setListTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
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
        (board.members.find((m) => m.id === c.assigneeId)?.name ?? '').toLowerCase().includes(q),
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

  const listIdOf = (over) => {
    if (!over) return null
    if (over.data.current?.type === 'list') return over.data.current.listId
    if (over.data.current?.type === 'card') return over.data.current.listId
    return board.lists.some((l) => l.id === over.id) ? over.id : null
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const toListId = listIdOf(over)
    if (!toListId) return

    // The reducer removes the card first and re-inserts it, which matches
    // arrayMove semantics: the index we hand it is the card's final position.
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
        title="This board has no lists yet"
        hint="Add a list to start tracking work."
        action={
          <Button onClick={() => dispatch({ type: 'addList', boardId: board.id, title: 'To Do' })}>
            <Icon name="plus" className="w-4 h-4" />
            Add a list
          </Button>
        }
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 items-start overflow-x-auto thin-scroll px-4 sm:px-6 pb-4 snap-x snap-mandatory sm:snap-none">
        {board.lists.map((list) => (
          <div key={list.id} className="snap-center">
            <List board={board} list={list} cards={byList[list.id] ?? []} onOpenCard={onOpenCard} />
          </div>
        ))}

        <div className="shrink-0 w-[82vw] xs:w-[300px] sm:w-[312px] snap-center">
          {addingList ? (
            <form onSubmit={submitList} className="rounded-xl border border-line bg-muted p-3">
              <input
                autoFocus
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setAddingList(false)}
                placeholder="List name"
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary hover:bg-primary-dark text-white px-3 py-1.5 text-sm font-medium transition"
                >
                  Add list
                </button>
                <button
                  type="button"
                  onClick={() => setAddingList(false)}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-line/70 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="w-full flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-3 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink transition"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add another list
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeCard ? (
          <div className="w-[82vw] xs:w-[292px] cursor-grabbing">
            <CardFace
              card={activeCard}
              member={board.members.find((m) => m.id === activeCard.assigneeId) ?? null}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
