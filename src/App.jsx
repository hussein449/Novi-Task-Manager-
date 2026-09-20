import { useEffect, useState } from 'react'
import { useStore } from './store'
import { useReminders } from './lib/useReminders'
import Login from './components/Login'
import Board from './components/Board'
import BoardsView from './components/BoardsView'
import Planner from './components/Planner'
import Inbox from './components/Inbox'
import Overview from './components/Overview'
import CardModal from './components/CardModal'
import InviteModal from './components/InviteModal'
import { TopBar, BottomNav, Toasts, Sidebar, MobileMenu } from './components/Chrome'
import { EmptyState, Button, Icon } from './components/ui'

export default function App() {
  const { state, dispatch } = useStore()
  const [view, setView] = useState('board')
  const [openCardId, setOpenCardId] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  if (!state.user) return <Login />

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
                title="No board open"
                hint="Pick a board from your projects, or create a new one."
                action={
                  <Button onClick={() => setView('boards')}>
                    <Icon name="folder" className="w-4 h-4" />
                    Go to projects
                  </Button>
                }
              />
            ))}

          {view === 'boards' && <BoardsView onOpenBoard={openBoard} />}
          {view === 'planner' && <Planner onOpenCard={openCard} query={query} />}
          {view === 'inbox' && <Inbox onOpenCard={openCard} reminders={reminders} />}
          {view === 'overview' && <Overview onOpenBoard={openBoard} onOpenCard={openCard} />}
        </main>
      </div>

      <BottomNav view={view} onChange={setView} unread={unread} />

      <Toasts toasts={reminders.toasts} onDismiss={reminders.dismissToast} onOpenCard={openCard} />

      {openCardId && <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />}
      {inviting && board && <InviteModal board={board} onClose={() => setInviting(false)} />}
    </div>
  )
}
