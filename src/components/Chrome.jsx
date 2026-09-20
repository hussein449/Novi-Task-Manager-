import { useEffect, useRef, useState } from 'react'
import { Icon, Avatar, AvatarStack, inputClass } from './ui'
import { useStore, SCENES } from '../store'

/* ---------------- top bar ---------------- */

export function TopBar({ board, view, onInvite, onSearch, query, unread, onOpenInbox }) {
  const { state, dispatch } = useStore()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(board?.name ?? '')
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => setName(board?.name ?? ''), [board?.id, board?.name])

  useEffect(() => {
    if (!menu) return undefined
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menu])

  const saveName = () => {
    const value = name.trim()
    if (value && board) dispatch({ type: 'updateBoard', id: board.id, patch: { name: value } })
    else setName(board?.name ?? '')
    setRenaming(false)
  }

  const titles = { board: board?.name ?? 'Board', planner: 'Planner', inbox: 'Inbox', boards: 'Boards', overview: 'Overview' }

  return (
    <header className="sticky top-0 z-30 glass border-x-0 border-t-0 px-3 sm:px-5 py-2.5">
      <div className="flex items-center gap-2 sm:gap-3">
        {view === 'board' && board ? (
          renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') {
                  setName(board.name)
                  setRenaming(false)
                }
              }}
              className="min-w-0 flex-1 bg-white/10 rounded-lg px-2.5 py-1.5 text-lg font-bold outline-none ring-2 ring-brand-500/40"
            />
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="min-w-0 text-lg sm:text-xl font-bold tracking-tight truncate hover:text-white/80 transition"
              title="Rename board"
            >
              {board.name}
            </button>
          )
        ) : (
          <span className="text-lg sm:text-xl font-bold tracking-tight truncate">{titles[view]}</span>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {searchOpen ? (
            <input
              autoFocus
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              onBlur={() => !query && setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearch('')
                  setSearchOpen(false)
                }
              }}
              placeholder="Search cards..."
              className="w-36 sm:w-56 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Search"
            >
              <Icon name="search" className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenInbox}
            className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label="Reminders"
          >
            <Icon name="bell" className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-accent-500 text-[10px] font-bold">
                {unread}
              </span>
            )}
          </button>

          {view === 'board' && board && (
            <>
              <div className="hidden sm:block">
                <AvatarStack members={board.members} size={30} />
              </div>
              <button
                onClick={onInvite}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 text-ink-900 px-3 py-1.5 text-sm font-semibold hover:bg-white transition"
              >
                <Icon name="share" className="w-4 h-4" />
                <span className="hidden xs:inline">Share</span>
              </button>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              className="rounded-full transition hover:opacity-80"
              aria-label="Account menu"
            >
              <Avatar user={state.user} size={32} />
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl glass p-2 shadow-2xl animate-pop">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold truncate">{state.user?.name}</p>
                  <p className="text-xs text-white/45">Signed in on this device</p>
                </div>

                {view === 'board' && board && (
                  <div className="px-3 py-2 border-t border-white/10">
                    <p className="text-[11px] uppercase tracking-wider text-white/45 mb-2">Background</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {SCENES.map((s) => (
                        <button
                          key={s}
                          onClick={() => dispatch({ type: 'updateBoard', id: board.id, patch: { scene: s } })}
                          className={`h-7 rounded-lg scene-${s} border transition ${
                            board.scene === s ? 'border-white' : 'border-white/15 hover:border-white/40'
                          }`}
                          aria-label={s}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/10 pt-1 mt-1">
                  <button
                    onClick={() => dispatch({ type: 'logout' })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/75 hover:bg-white/10 transition"
                  >
                    <Icon name="logout" className="w-4 h-4" />
                    Switch user
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

/* ---------------- bottom nav ---------------- */

const NAV = [
  { key: 'inbox', label: 'Inbox', icon: 'inbox' },
  { key: 'planner', label: 'Planner', icon: 'planner' },
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'boards', label: 'Boards', icon: 'switch' },
]

export function BottomNav({ view, onChange, unread }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-3xl glass px-2 py-2 shadow-2xl shadow-black/40 mx-3 overflow-x-auto no-scrollbar">
        {NAV.map((item) => {
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`relative flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? 'bg-white/12 text-white ring-2 ring-accent-500/70'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon name={item.icon} className="w-[18px] h-[18px]" />
              <span className={active ? 'inline' : 'hidden sm:inline'}>{item.label}</span>
              {item.key === 'inbox' && unread > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-accent-500" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ---------------- toasts ---------------- */

export function Toasts({ toasts, onDismiss, onOpenCard }) {
  return (
    <div className="fixed top-16 right-3 sm:right-5 z-50 flex flex-col gap-2 w-[min(92vw,340px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass rounded-2xl p-3.5 shadow-2xl animate-slide-up flex items-start gap-3"
          role="status"
        >
          <span
            className={`mt-0.5 shrink-0 grid place-items-center w-8 h-8 rounded-xl ${
              t.overdue ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/20 text-amber-200'
            }`}
          >
            <Icon name="bell" className="w-4 h-4" />
          </span>
          <button onClick={() => onOpenCard(t.cardId)} className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold truncate">{t.title}</p>
            <p className="text-xs text-white/55 mt-0.5 truncate">{t.body}</p>
          </button>
          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition"
            aria-label="Dismiss"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------- desktop sidebar ---------------- */

export function Sidebar({ activeBoardId, onOpenBoard, view, onChangeView }) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(null)
  const [name, setName] = useState('')

  const submit = (e, folderId) => {
    e.preventDefault()
    if (name.trim()) dispatch({ type: 'addBoard', name: name.trim(), folderId })
    setName('')
    setAdding(null)
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 glass border-y-0 border-l-0 overflow-y-auto thin-scroll">
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-500">
          <Icon name="board" className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-tight">Novi</span>
      </div>

      <nav className="px-2 pb-2 space-y-0.5">
        {[
          { key: 'overview', label: 'Overview', icon: 'overview' },
          { key: 'planner', label: 'Planner', icon: 'planner' },
          { key: 'inbox', label: 'Inbox', icon: 'inbox' },
          { key: 'boards', label: 'All boards', icon: 'switch' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => onChangeView(item.key)}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
              view === item.key ? 'bg-white/14 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Icon name={item.icon} className="w-[18px] h-[18px]" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
        Projects
      </div>

      <div className="px-2 pb-6 space-y-3">
        {state.folders.map((folder) => {
          const boards = state.boards.filter((b) => b.folderId === folder.id)
          return (
            <div key={folder.id}>
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70">
                <span>{folder.emoji}</span>
                <span className="truncate font-medium">{folder.name}</span>
                <button
                  onClick={() => setAdding(adding === folder.id ? null : folder.id)}
                  className="ml-auto p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                  aria-label={`Add board to ${folder.name}`}
                >
                  <Icon name="plus" className="w-4 h-4" />
                </button>
              </div>

              {adding === folder.id && (
                <form onSubmit={(e) => submit(e, folder.id)} className="px-2 pb-1.5">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setAdding(null)}
                    placeholder="Board name"
                    className={`${inputClass} py-1.5 text-xs`}
                  />
                </form>
              )}

              <div className="space-y-0.5">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onOpenBoard(b.id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl pl-6 pr-3 py-2 text-sm transition ${
                      view === 'board' && activeBoardId === b.id
                        ? 'bg-white/14 text-white font-medium'
                        : 'text-white/60 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 scene-${b.scene ?? 'night'}`} />
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
