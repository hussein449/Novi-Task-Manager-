import { useEffect, useRef, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import TaskCard from './TaskCard'
import { Icon } from './ui'
import { useStore } from '../store'

export default function List({ board, list, cards, onOpenCard }) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  const { setNodeRef, isOver } = useDroppable({ id: list.id, data: { type: 'list', listId: list.id } })

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
    })
    setTitle('')
  }

  const saveRename = () => {
    const value = listTitle.trim()
    if (value) dispatch({ type: 'renameList', boardId: board.id, listId: list.id, title: value })
    else setListTitle(list.title)
    setRenaming(false)
  }

  return (
    <div
      className={`shrink-0 w-[82vw] xs:w-[300px] sm:w-[312px] rounded-xl border bg-muted transition ${
        isOver ? 'border-primary ring-2 ring-primary/15' : 'border-line'
      }`}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
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
            className="flex-1 min-w-0 rounded-md border border-primary bg-surface px-2 py-1 text-sm font-semibold outline-none ring-2 ring-primary/20"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="font-semibold text-sm text-ink truncate hover:text-primary transition"
            title="Rename list"
          >
            {list.title}
          </button>
        )}

        <span className="ml-auto text-xs font-medium text-ink-3 tabular-nums">{cards.length}</span>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-line/70 transition"
            aria-label={`Actions for ${list.title}`}
          >
            <Icon name="dots" className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-30 w-44 rounded-lg border border-line bg-surface p-1 shadow-lg animate-pop">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setRenaming(true)
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
              >
                Rename list
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setAdding(true)
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
              >
                Add a card
              </button>
              <button
                onClick={() => {
                  if (board.lists.length <= 1) return
                  if (window.confirm(`Delete the list "${list.title}" and its cards?`)) {
                    dispatch({ type: 'deleteList', boardId: board.id, listId: list.id })
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-soft disabled:opacity-40"
                disabled={board.lists.length <= 1}
              >
                Delete list
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 px-2 min-h-[8px] max-h-[calc(100vh-330px)] sm:max-h-[calc(100vh-270px)] overflow-y-auto thin-scroll"
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              member={board.members.find((m) => m.id === card.assigneeId) ?? null}
              onOpen={onOpenCard}
              onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-line-strong text-xs text-ink-3 px-3 py-5 text-center">
            Drag a card here
          </p>
        )}
      </div>

      {adding ? (
        <form onSubmit={submit} className="p-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
              if (e.key === 'Escape') {
                setTitle('')
                setAdding(false)
              }
            }}
            placeholder="Card title, then press Enter"
            className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-3"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              className="rounded-lg bg-primary hover:bg-primary-dark text-white px-3 py-1.5 text-sm font-medium transition"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle('')
                setAdding(false)
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-line/70 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="m-2 w-[calc(100%-1rem)] flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-2 hover:bg-line/70 hover:text-ink transition"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add a card
        </button>
      )}
    </div>
  )
}
