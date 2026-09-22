import { useMemo, useState } from 'react'
import { Icon, Button, Modal, Field, inputClass, EmptyState } from './ui'
import { useStore, accentOf, canEdit } from '../store'

const ago = (iso) => {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

const defaultTitle = () =>
  `Meeting — ${new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`

function NewMeetingModal({ projects, initialProjectId, onClose, onCreated }) {
  const { dispatch } = useStore()
  const [boardId, setBoardId] = useState(initialProjectId ?? projects[0]?.board.id ?? '')
  const [title, setTitle] = useState(defaultTitle)

  const submit = (e) => {
    e.preventDefault()
    if (!boardId || !title.trim()) return
    const id = crypto.randomUUID()
    dispatch({ type: 'addMeeting', id, boardId, title: title.trim() })
    onCreated(id)
  }

  return (
    <Modal open onClose={onClose} title="New meeting board" subtitle="Filed under a project, saved as you write.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Project">
          <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={inputClass}>
            {projects.map(({ board, folder }) => (
              <option key={board.id} value={board.id}>
                {folder ? `${folder.name} — ` : ''}
                {board.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name" hint="e.g. Kick-off, Weekly sync, Campaign brainstorm">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={!boardId || !title.trim()}>
            Create and open
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MeetingCard({ meeting, board, mayEdit, onOpen }) {
  const { dispatch } = useStore()
  const [menu, setMenu] = useState(false)

  return (
    <div className="group relative rounded-xl border border-line bg-surface shadow-xs hover:shadow-md hover:border-line-strong transition overflow-hidden">
      <span className={`block h-1 accent-${accentOf(board)}`} />
      <button onClick={() => onOpen(meeting.id)} className="block w-full text-left p-4">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-warning-soft text-warning shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h14v10l-5 6H5z" />
              <path d="M14 20v-6h5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <p className="font-semibold text-ink truncate">{meeting.title}</p>
            <p className="mt-0.5 text-xs text-ink-3 truncate">Edited {ago(meeting.updatedAt)}</p>
          </div>
        </div>
      </button>

      {mayEdit && (
        <div className="absolute top-3 right-2">
          <button
            onClick={() => setMenu((v) => !v)}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
            aria-label={`Options for ${meeting.title}`}
          >
            <Icon name="dots" className="w-4 h-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-line bg-surface p-1 shadow-lg animate-pop">
              <button
                onClick={() => {
                  setMenu(false)
                  const value = window.prompt('Rename meeting board', meeting.title)
                  if (value?.trim()) dispatch({ type: 'renameMeeting', id: meeting.id, title: value.trim() })
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-ink hover:bg-muted"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setMenu(false)
                  if (window.confirm(`Delete "${meeting.title}" and everything written on it?`)) {
                    dispatch({ type: 'deleteMeeting', id: meeting.id })
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-soft"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Meetings({ onOpenMeeting }) {
  const { state } = useStore()
  const [creating, setCreating] = useState(null) // null, or the project to preselect
  const [projectFilter, setProjectFilter] = useState('all')

  const projects = useMemo(
    () =>
      state.boards.map((board) => ({
        board,
        folder: state.folders.find((f) => f.id === board.folderId),
        meetings: state.meetings.filter((m) => m.boardId === board.id),
        mayEdit: canEdit(board, state.user),
      })),
    [state.boards, state.folders, state.meetings, state.user],
  )

  const writable = projects.filter((p) => p.mayEdit)
  const shown = projects.filter((p) => projectFilter === 'all' || p.board.id === projectFilter)
  const total = state.meetings.length

  // group the projects under their folders
  const byFolder = state.folders
    .map((folder) => ({ folder, projects: shown.filter((p) => p.board.folderId === folder.id) }))
    .filter((g) => g.projects.length > 0)

  return (
    <div className="px-4 sm:px-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Meeting boards</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Whiteboards for main ideas and brainstorming, filed under each project. {total}{' '}
            {total === 1 ? 'board' : 'boards'} so far.
          </p>
        </div>
        {writable.length > 0 && (
          <Button onClick={() => setCreating('any')}>
            <Icon name="plus" className="w-4 h-4" />
            New meeting board
          </Button>
        )}
      </div>

      {projects.length > 1 && (
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className={`${inputClass} w-auto mb-6 py-1.5`}
          aria-label="Show meetings for"
        >
          <option value="all">All projects</option>
          {projects.map(({ board, folder }) => (
            <option key={board.id} value={board.id}>
              {folder ? `${folder.name} — ` : ''}
              {board.name}
            </option>
          ))}
        </select>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon="board"
          title="No projects yet"
          hint="Meeting boards live inside a project. Create a folder and a project first."
        />
      ) : (
        <div className="space-y-8">
          {byFolder.map(({ folder, projects: group }) => (
            <section key={folder.id}>
              <header className="flex items-center gap-2 mb-3">
                <span aria-hidden="true">{folder.emoji}</span>
                <h2 className="font-semibold text-ink">{folder.name}</h2>
              </header>

              <div className="space-y-5">
                {group.map(({ board, meetings, mayEdit }) => (
                  <div key={board.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full accent-${accentOf(board)}`} />
                      <h3 className="text-sm font-semibold text-ink-2">{board.name}</h3>
                      <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">
                        {meetings.length}
                      </span>
                    </div>

                    <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                      {meetings.map((m) => (
                        <MeetingCard
                          key={m.id}
                          meeting={m}
                          board={board}
                          mayEdit={mayEdit}
                          onOpen={onOpenMeeting}
                        />
                      ))}
                      {mayEdit && (
                        <button
                          onClick={() => setCreating(board.id)}
                          className="rounded-xl border border-dashed border-line-strong min-h-[84px] flex items-center justify-center gap-2 text-sm font-medium text-ink-2 hover:border-primary hover:text-primary hover:bg-primary-soft/40 transition"
                        >
                          <Icon name="plus" className="w-4 h-4" />
                          New board for {board.name}
                        </button>
                      )}
                      {!mayEdit && meetings.length === 0 && (
                        <p className="text-sm text-ink-3">No meeting boards here yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {creating && (
        <NewMeetingModal
          projects={writable}
          initialProjectId={creating === 'any' ? undefined : creating}
          onClose={() => setCreating(null)}
          onCreated={(id) => {
            setCreating(null)
            onOpenMeeting(id)
          }}
        />
      )}
    </div>
  )
}
