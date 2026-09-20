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
import { TopBar, BottomNav, Toasts, Sidebar } from './components/Chrome'
import { EmptyState, Button, Icon } from './components/ui'

export default function App() {
  const { state, dispatch } = useStore()
  const [view, setView] = useState('board')
  const [openCardId, setOpenCardId] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [query, setQuery] = useState('')
  const reminders = useReminders()

  const board = state.boards.find((b) => b.id === state.activeBoardId) ?? state.boards[0] ?? null
  const unread = state.notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (view === 'inbox' && unread > 0) dispatch({ type: 'readNotifications' })
  }, [view, unread, dispatch])

  useEffect(() => {
    document.documentElement.dataset.scene = board?.scene ?? 'night'
  }, [board?.scene])

  const openBoard = (id, keepView = false) => {
    if (id) dispatch({ type: 'setActiveBoard', id })
    if (!keepView) setView('board')
    else setView('board')
    setQuery('')
  }

  const openCard = (id) => setOpenCardId(id)

  if (!state.user) {
    return (
      <>
        <div className="bg-scene scene-night" />
        <Login />
      </>
    )
  }

  return (
    <>
      <div className={`bg-scene scene-${board?.scene ?? 'night'}`} />

      <div className="flex min-h-dvh">
        <Sidebar
          activeBoardId={board?.id}
          onOpenBoard={openBoard}
          view={view}
          onChangeView={(v) => setView(v)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            board={board}
            view={view}
            query={query}
            onSearch={setQuery}
            onInvite={() => setInviting(true)}
            unread={unread}
            onOpenInbox={() => setView('inbox')}
          />

          <main className="flex-1 pt-4 pb-32">
            {view === 'board' &&
              (board ? (
                <Board board={board} onOpenCard={openCard} query={query} />
              ) : (
                <EmptyState
                  icon="board"
                  title="No board selected"
                  hint="Create a board or pick one from your workspace."
                  action={
                    <Button onClick={() => setView('boards')}>
                      <Icon name="switch" className="w-4 h-4" />
                      Go to boards
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
      </div>

      <BottomNav view={view} onChange={setView} unread={unread} />

      <Toasts
        toasts={reminders.toasts}
        onDismiss={reminders.dismissToast}
        onOpenCard={(id) => {
          openCard(id)
        }}
      />

      {openCardId && <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />}
      {inviting && board && <InviteModal board={board} onClose={() => setInviting(false)} />}
    </>
  )
}
