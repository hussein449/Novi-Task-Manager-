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
      className={`shrink-0 w-[85vw] xs:w-[78vw] sm:w-[320px] max-w-[340px] rounded-3xl glass p-3 transition ${
        isOver ? 'ring-2 ring-brand-500/60 bg-brand-500/5' : ''
      }`}
    >
      <header className="flex items-center gap-2 px-1.5 pb-2.5">
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
            className="flex-1 min-w-0 bg-white/10 rounded-lg px-2 py-1 text-sm font-semibold outline-none ring-2 ring-brand-500/40"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="font-semibold text-[15px] text-white/90 truncate hover:text-white"
            title="Rename list"
          >
            {list.title}
          </button>
        )}

        <span className="ml-auto text-xs font-semibold text-white/45 tabular-nums">{cards.length}</span>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-white/55 hover:text-white hover:bg-white/10 transition"
            aria-label="List actions"
          >
            <Icon name="dots" className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 w-44 rounded-xl glass p-1.5 shadow-2xl animate-pop">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setRenaming(true)
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
              >
                Rename list
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setAdding(true)
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
              >
                Add a card
              </button>
              <button
                onClick={() => {
                  if (board.lists.length <= 1) return
                  dispatch({ type: 'deleteList', boardId: board.id, listId: list.id })
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"
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
        className="flex flex-col gap-2 min-h-[12px] max-h-[calc(100vh-360px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto thin-scroll pr-0.5"
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
          <p className="text-xs text-white/35 px-2 py-6 text-center">
            Drop a card here
          </p>
        )}
      </div>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
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
            placeholder="What needs doing?"
            className="w-full resize-none rounded-2xl bg-white/10 border border-white/15 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 placeholder:text-white/35"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-500 hover:bg-brand-600 px-3.5 py-2 text-sm font-semibold transition"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle('')
                setAdding(false)
              }}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
              aria-label="Cancel"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm text-white/65 hover:text-white hover:bg-white/10 transition"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add a card
        </button>
      )}
    </div>
  )
}
