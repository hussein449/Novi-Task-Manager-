import { useEffect, useRef, useState } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import TaskCard from './TaskCard'
import { Icon } from './ui'
import { useStore } from '../store'

/**
 * One status band. The board stacks these down the page, so a status is a
 * partition of the background rather than a column you scroll sideways to.
 */
export default function StatusSection({ board, list, cards, tone, onOpenCard }) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [collapsed, setCollapsed] = useState(false)
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

  const startAdding = () => {
    setCollapsed(false)
    setAdding(true)
  }

  return (
    <section
      className={`rounded-xl border transition ${tone.band} ${
        isOver ? 'border-primary ring-2 ring-primary/15' : 'border-line'
      }`}
    >
      <header className="flex items-center gap-2 px-3 sm:px-4 py-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 -ml-1 rounded-md text-ink-3 hover:text-ink hover:bg-black/5 transition"
          aria-label={collapsed ? `Expand ${list.title}` : `Collapse ${list.title}`}
          aria-expanded={!collapsed}
        >
          <Icon
            name="chevron"
            className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          />
        </button>

        <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />

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
            className="min-w-0 flex-1 max-w-56 rounded-md border border-primary bg-surface px-2 py-1 text-sm font-semibold outline-none ring-2 ring-primary/20"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="font-semibold text-sm text-ink truncate hover:text-primary transition"
            title="Rename status"
          >
            {list.title}
          </button>
        )}

        <span className="text-xs font-medium text-ink-2 bg-white/70 rounded-full px-2 py-0.5 tabular-nums">
          {cards.length}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={startAdding}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-2 hover:bg-white hover:text-ink transition"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span className="hidden xs:inline">Add card</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-white transition"
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
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    startAdding()
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
                >
                  Add a card
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    if (board.lists.length <= 1) return
                    if (window.confirm(`Delete "${list.title}" and its ${cards.length} card(s)?`)) {
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
        </div>
      </header>

      {!collapsed && (
        <div ref={setNodeRef} className="px-3 sm:px-4 pb-4">
          <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {cards.map((card) => (
                <TaskCard
                  key={card.id}
                  card={card}
                  member={board.members.find((m) => m.id === card.assigneeId) ?? null}
                  onOpen={onOpenCard}
                  onToggleDone={(id) => dispatch({ type: 'toggleDone', id })}
                />
              ))}

              {adding && (
                <form
                  onSubmit={submit}
                  className="rounded-lg border border-primary bg-surface p-2 shadow-xs"
                >
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
                    className="w-full resize-none rounded-md px-1.5 py-1 text-sm outline-none placeholder:text-ink-3"
                  />
                  <div className="flex items-center gap-2 mt-1">
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
                      className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-muted transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {cards.length === 0 && !adding && (
                <button
                  onClick={startAdding}
                  className="col-span-full rounded-lg border border-dashed border-line-strong py-6 text-sm text-ink-3 hover:border-primary hover:text-primary transition"
                >
                  Drag a card here, or add one
                </button>
              )}
            </div>
          </SortableContext>
        </div>
      )}
    </section>
  )
}
