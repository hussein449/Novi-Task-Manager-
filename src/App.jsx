import { useEffect, useState } from 'react'
import { useStore } from './store'
import { useReminders } from './lib/useReminders'
import Login from './components/Login'
import Board from './components/Board'
import BoardsView from './components/BoardsView'
import Planner from './components/Planner'
import Inbox from './components/Inbox'
import Overview from './components/Overview'
import People from './components/People'
import Meetings from './components/Meetings'
import Whiteboard from './components/meeting/Whiteboard'
import CardModal from './components/CardModal'
import InviteModal from './components/InviteModal'
import FolderMembersModal from './components/FolderMembersModal'
import { TopBar, BottomNav, Toasts, Sidebar, MobileMenu } from './components/Chrome'
import { EmptyState, Button, Icon } from './components/ui'

/** Shown when the site is deployed without its Supabase settings. */
function NotConfigured() {
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-md rounded-xl border border-line bg-surface p-6 shadow-xs">
        <h1 className="text-lg font-semibold text-ink">Almost there</h1>
        <p className="text-sm text-ink-2 mt-2">
          This copy of Novi has no database to talk to. Set these three variables and redeploy:
        </p>
        <pre className="mt-3 rounded-lg bg-muted p-3 text-xs text-ink-2 overflow-x-auto">
{`VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ADMIN_EMAIL`}
        </pre>
        <p className="text-sm text-ink-3 mt-3">
          Locally they go in <code className="text-ink-2">.env.local</code>; on Netlify, in Site
          configuration → Environment variables.
        </p>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <p className="text-sm text-ink-3">Loading your workspace…</p>
    </div>
  )
}

export default function App() {
  const { state, dispatch, refresh, dismissError } = useStore()
  const [view, setView] = useState('board')
  const [openCardId, setOpenCardId] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [manageFolderId, setManageFolderId] = useState(null)
  const [openMeetingId, setOpenMeetingId] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  )
  const [query, setQuery] = useState('')
  const reminders = useReminders()

  const board = state.boards.find((b) => b.id === state.activeBoardId) ?? state.boards[0] ?? null
  const unread = state.notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (view === 'inbox' && unread > 0) dispatch({ type: 'readNotifications' })
  }, [view, unread, dispatch])

  const openBoard = (id) => {
    if (id) dispatch({ type: 'setActiveBoard', id })
    setView('board')
    setQuery('')
  }

  const openCard = (id) => setOpenCardId(id)

  if (state.status === 'unconfigured') return <NotConfigured />
  if (!state.user) return state.status === 'loading' ? <Loading /> : <Login />
  if (state.status === 'loading') return <Loading />

  const sidebarProps = {
    activeBoardId: board?.id,
    onOpenBoard: openBoard,
    view,
    onChangeView: setView,
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar {...sidebarProps} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} {...sidebarProps} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          board={board}
          view={view}
          query={query}
          onSearch={setQuery}
          onInvite={() => setInviting(true)}
          unread={unread}
          onOpenInbox={() => setView('inbox')}
          onOpenMenu={() => setMenuOpen(true)}
          calendarOpen={calendarOpen}
          onToggleCalendar={() => setCalendarOpen((v) => !v)}
        />

        {state.error && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-danger-soft px-3 py-2.5">
            <Icon name="bell" className="w-4 h-4 mt-0.5 text-danger shrink-0" />
            <p className="flex-1 text-sm text-ink-2">{state.error}</p>
            <button
              onClick={dismissError}
              className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-white/60 transition"
              aria-label="Dismiss"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 pt-5 pb-24 lg:pb-8">
          {view === 'board' &&
            (board ? (
              <Board
                board={board}
                onOpenCard={openCard}
                query={query}
                calendarOpen={calendarOpen}
                onCloseCalendar={() => setCalendarOpen(false)}
              />
            ) : (
              <EmptyState
                icon="board"
                title="No project open"
                hint={
                  state.folders.length === 0
                    ? 'Create a folder for your first client or project, then add a board to it.'
                    : 'Pick a project from your folders, or create a new one.'
                }
                action={
                  <Button onClick={() => setView('boards')}>
                    <Icon name="folder" className="w-4 h-4" />
                    Go to projects
                  </Button>
                }
              />
            ))}

          {view === 'boards' && (
            <BoardsView onOpenBoard={openBoard} onManageFolder={setManageFolderId} />
          )}
          {view === 'planner' && <Planner onOpenCard={openCard} query={query} />}
          {view === 'inbox' && <Inbox onOpenCard={openCard} reminders={reminders} />}
          {view === 'people' && <People onManageFolder={setManageFolderId} />}
          {view === 'meetings' && <Meetings onOpenMeeting={setOpenMeetingId} />}
          {view === 'overview' && (
            <Overview
              onOpenBoard={openBoard}
              onOpenCard={openCard}
              onManageFolder={setManageFolderId}
            />
          )}
        </main>
      </div>

      <BottomNav view={view} onChange={setView} unread={unread} />

      <Toasts toasts={reminders.toasts} onDismiss={reminders.dismissToast} onOpenCard={openCard} />

      {openCardId && <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />}
      {inviting && board && <InviteModal board={board} onClose={() => setInviting(false)} />}

      {(() => {
        const meeting = state.meetings.find((m) => m.id === openMeetingId)
        const project = meeting && state.boards.find((b) => b.id === meeting.boardId)
        return meeting && project ? (
          <Whiteboard
            key={meeting.id}
            meeting={meeting}
            board={project}
            onClose={() => setOpenMeetingId(null)}
          />
        ) : null
      })()}

      {manageFolderId && state.folders.some((f) => f.id === manageFolderId) && (
        <FolderMembersModal
          folder={state.folders.find((f) => f.id === manageFolderId)}
          onClose={() => {
            setManageFolderId(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
