import { useEffect, useRef, useState } from 'react'
import { Icon, Avatar, AvatarStack, Button } from './ui'
import { useStore, ACCENTS, accentOf, ROLES, roleOf, canManage } from '../store'

const VIEW_TITLES = {
  board: 'Board',
  planner: 'Planner',
  inbox: 'Inbox',
  boards: 'Projects',
  overview: 'Overview',
  people: 'People',
}

/* ---------------- top bar ---------------- */

export function TopBar({
  board,
  view,
  onInvite,
  onSearch,
  query,
  unread,
  onOpenInbox,
  onOpenMenu,
  calendarOpen,
  onToggleCalendar,
}) {
  const { state, dispatch, signOut } = useStore()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(board?.name ?? '')
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

  const onBoard = view === 'board' && board
  const myRole = board ? roleOf(board, state.user?.id) : null
  const mayManage = board ? canManage(board, state.user) : false

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-line">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14">
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-1 rounded-lg text-ink-2 hover:bg-muted transition"
          aria-label="Open menu"
        >
          <Icon name="board" className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          {onBoard ? (
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
                className="min-w-0 rounded-md border border-primary bg-surface px-2 py-1 text-base font-semibold outline-none ring-2 ring-primary/20"
              />
            ) : (
              <>
                <span className={`hidden sm:block w-2 h-2 rounded-full accent-${accentOf(board)}`} />
                <h1 className="text-base sm:text-lg font-semibold text-ink truncate">{board.name}</h1>
                {mayManage && (
                  <button
                    onClick={() => setRenaming(true)}
                    className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
                    aria-label="Rename board"
                    title="Rename board"
                  >
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                )}
                {myRole && myRole !== 'owner' && (
                  <span
                    className="hidden sm:inline shrink-0 rounded-md border border-line bg-muted px-1.5 py-0.5 text-xs font-medium text-ink-2"
                    title={ROLES[myRole]?.hint}
                  >
                    {ROLES[myRole]?.label}
                  </span>
                )}
              </>
            )
          ) : (
            <h1 className="text-base sm:text-lg font-semibold text-ink truncate">{VIEW_TITLES[view]}</h1>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="relative hidden sm:block">
            <Icon
              name="search"
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search cards"
              className="w-40 lg:w-60 rounded-lg border border-line-strong bg-surface pl-8 pr-3 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-3"
            />
          </div>

          {onBoard && (
            <button
              onClick={onToggleCalendar}
              className={`p-2 rounded-lg transition ${
                calendarOpen ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:text-ink hover:bg-muted'
              }`}
              aria-pressed={calendarOpen}
              aria-label={calendarOpen ? 'Hide the deadline calendar' : 'Show the deadline calendar'}
              title={calendarOpen ? 'Hide the deadline calendar' : 'Show the deadline calendar'}
            >
              <Icon name="planner" className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenInbox}
            className="relative p-2 rounded-lg text-ink-2 hover:text-ink hover:bg-muted transition"
            aria-label={unread > 0 ? `${unread} new reminders` : 'Reminders'}
          >
            <Icon name="bell" className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 grid place-items-center rounded-full bg-danger text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>

          {onBoard && (
            <>
              <div className="hidden sm:block">
                <AvatarStack members={board.members} size={28} />
              </div>
              <Button variant="secondary" onClick={onInvite}>
                <Icon name="share" className="w-4 h-4" />
                <span className="hidden xs:inline">Share</span>
              </Button>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              className="rounded-full block transition hover:opacity-85"
              aria-label="Account menu"
            >
              <Avatar user={state.user} size={32} />
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-pop">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-ink truncate">{state.user?.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">{state.user?.email}</p>
                </div>

                {onBoard && mayManage && (
                  <div className="px-3 py-2 border-t border-line">
                    <p className="text-xs font-medium text-ink-2 mb-2">Board colour</p>
                    <div className="flex gap-1.5">
                      {ACCENTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => dispatch({ type: 'updateBoard', id: board.id, patch: { accent: a } })}
                          className={`w-6 h-6 rounded-full accent-${a} transition ${
                            accentOf(board) === a
                              ? 'ring-2 ring-offset-2 ring-ink-3'
                              : 'hover:scale-110'
                          }`}
                          aria-label={`${a} board colour`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-line pt-1 mt-1">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-muted hover:text-ink transition"
                  >
                    <Icon name="logout" className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sm:hidden px-3 pb-2.5">
        <div className="relative">
          <Icon
            name="search"
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search cards"
            className="w-full rounded-lg border border-line-strong bg-surface pl-8 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-3"
          />
        </div>
      </div>
    </header>
  )
}

/* ---------------- mobile bottom nav ---------------- */

const NAV = [
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'planner', label: 'Planner', icon: 'planner' },
  { key: 'inbox', label: 'Inbox', icon: 'inbox' },
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'boards', label: 'Projects', icon: 'folder' },
  { key: 'people', label: 'People', icon: 'users' },
]

export function BottomNav({ view, onChange, unread }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6">
        {NAV.map((item) => {
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] sm:text-[11px] font-medium transition ${
                active ? 'text-primary' : 'text-ink-3 hover:text-ink-2'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              {item.label}
              {item.key === 'inbox' && unread > 0 && (
                <span className="absolute top-1.5 right-1/2 translate-x-3.5 w-2 h-2 rounded-full bg-danger" />
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
    <div className="fixed top-16 right-3 sm:right-5 z-50 flex flex-col gap-2 w-[min(92vw,350px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-line bg-surface p-3.5 shadow-lg animate-slide-up flex items-start gap-3"
          role="status"
        >
          <span
            className={`mt-0.5 shrink-0 grid place-items-center w-8 h-8 rounded-full ${
              t.overdue ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'
            }`}
          >
            <Icon name="bell" className="w-4 h-4" />
          </span>
          <button onClick={() => onOpenCard(t.cardId)} className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium text-ink truncate">{t.title}</p>
            <p className="text-xs text-ink-3 mt-0.5 truncate">{t.body}</p>
          </button>
          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
            aria-label="Dismiss"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------- sidebar ---------------- */

function SidebarContent({ activeBoardId, onOpenBoard, view, onChangeView, onClose }) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(null)
  const [name, setName] = useState('')

  const submit = (e, folderId) => {
    e.preventDefault()
    if (name.trim()) {
      dispatch({ type: 'addBoard', name: name.trim(), folderId })
      onClose?.()
    }
    setName('')
    setAdding(null)
  }

  const nav = [
    { key: 'board', label: 'Current board', icon: 'board' },
    { key: 'overview', label: 'Overview', icon: 'overview' },
    { key: 'planner', label: 'Planner', icon: 'planner' },
    { key: 'inbox', label: 'Inbox', icon: 'inbox' },
    { key: 'boards', label: 'All projects', icon: 'folder' },
    { key: 'people', label: 'People', icon: 'users' },
  ]

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-line">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-white">
          <Icon name="board" className="w-[18px] h-[18px]" />
        </div>
        <span className="font-semibold text-ink">Novi</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg text-ink-3 hover:bg-muted transition"
            aria-label="Close menu"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="p-2 space-y-0.5">
        {nav.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              onChangeView(item.key)
              onClose?.()
            }}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              view === item.key ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-muted hover:text-ink'
            }`}
          >
            <Icon name={item.icon} className="w-[18px] h-[18px]" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">
        Projects
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-2 pb-6 space-y-2">
        {state.folders.map((folder) => {
          const boards = state.boards.filter((b) => b.folderId === folder.id)
          return (
            <div key={folder.id}>
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-ink">
                <span aria-hidden="true">{folder.emoji}</span>
                <span className="truncate">{folder.name}</span>
                <button
                  onClick={() => setAdding(adding === folder.id ? null : folder.id)}
                  className="ml-auto p-1 rounded-md text-ink-3 hover:text-primary hover:bg-muted transition"
                  aria-label={`Add a board to ${folder.name}`}
                  title="Add a board"
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
                    placeholder="Board name, then Enter"
                    className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </form>
              )}

              <div className="space-y-0.5">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onOpenBoard(b.id)
                      onClose?.()
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-lg pl-6 pr-3 py-2 text-sm transition ${
                      view === 'board' && activeBoardId === b.id
                        ? 'bg-primary-soft text-primary font-medium'
                        : 'text-ink-2 hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 accent-${accentOf(b)}`} />
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
                {boards.length === 0 && (
                  <p className="pl-6 pr-3 py-1.5 text-xs text-ink-3">No boards yet</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar(props) {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-line">
      <SidebarContent {...props} />
    </aside>
  )
}

export function MobileMenu({ open, onClose, ...props }) {
  if (!open) return null
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-72 max-w-[82vw] h-full shadow-xl animate-slide-up">
        <SidebarContent {...props} onClose={onClose} />
      </div>
    </div>
  )
}
