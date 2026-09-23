import { useState } from 'react'
import { Icon, Button, AvatarStack, Modal, Field, inputClass, EmptyState } from './ui'
import FolderNotepadModal from './FolderNotepadModal'
import { useStore, ACCENTS, accentOf, cardsOfBoard, folderMembers, canManageFolder } from '../store'

const EMOJIS = ['💼', '🎯', '🚀', '🎨', '📈', '🧩', '🏠', '📁']

function NewBoardModal({ folderId, onClose }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [accent, setAccent] = useState('blue')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'addBoard', name: name.trim(), folderId, accent })
    onClose('created')
  }

  return (
    <Modal open onClose={onClose} title="New board" subtitle="Boards start with To Do, Doing and Done.">
      <form onSubmit={submit}>
        <Field label="Board name" hint="One board per client or project works well.">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fontain — Q4 campaign"
            className={inputClass}
          />
        </Field>

        <div className="mt-5">
          <span className="block text-sm font-medium text-ink-2 mb-2">Colour</span>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAccent(a)}
                className={`w-8 h-8 rounded-full accent-${a} transition ${
                  accent === a ? 'ring-2 ring-offset-2 ring-ink-3' : 'hover:scale-105'
                }`}
                aria-label={`${a} colour`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={!name.trim()}>
            Create board
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function NewFolderModal({ onClose }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'addFolder', name: name.trim(), emoji })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="New project folder">
      <form onSubmit={submit}>
        <Field label="Folder name" hint="Group boards by client, team or project.">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Teka"
            className={inputClass}
          />
        </Field>
        <div className="mt-5">
          <span className="block text-sm font-medium text-ink-2 mb-2">Icon</span>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-lg border text-lg transition ${
                  emoji === e ? 'border-primary bg-primary-soft' : 'border-line hover:bg-muted'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={!name.trim()}>
            Create folder
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function BoardCard({ board, onOpen }) {
  const { state, dispatch } = useStore()
  const cards = cardsOfBoard(state, board.id)
  const done = cards.filter((c) => c.done).length
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0
  const overdue = cards.filter(
    (c) => !c.done && c.dueDate && new Date(c.dueDate).getTime() < Date.now(),
  ).length

  return (
    <div className="group relative rounded-xl border border-line bg-surface shadow-xs hover:shadow-md hover:border-line-strong transition overflow-hidden">
      <span className={`block h-1 accent-${accentOf(board)}`} />
      <button onClick={() => onOpen(board.id)} className="block w-full text-left p-4">
        <p className="font-semibold text-ink truncate pr-7">{board.name}</p>

        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
          <span>
            {done}/{cards.length} done
          </span>
          {overdue > 0 && (
            <span className="rounded-md bg-danger-soft text-danger px-1.5 py-0.5 font-medium">
              {overdue} overdue
            </span>
          )}
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3">
          <AvatarStack members={board.members} size={24} />
        </div>
      </button>
      <button
        onClick={() => {
          if (window.confirm(`Delete the board "${board.name}" and all of its cards?`)) {
            dispatch({ type: 'deleteBoard', id: board.id })
          }
        }}
        className="absolute top-3 right-2 p-1.5 rounded-md text-ink-3 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger-soft transition"
        aria-label={`Delete ${board.name}`}
      >
        <Icon name="trash" className="w-4 h-4" />
      </button>
    </div>
  )
}

function NotepadCard({ folder, onOpen }) {
  const preview = (folder.notes ?? '').trim()

  return (
    <button
      onClick={() => onOpen(folder.id)}
      className="group relative rounded-xl border border-line bg-surface shadow-xs hover:shadow-md hover:border-line-strong transition overflow-hidden text-left"
    >
      <span className="block h-1 bg-warning" />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-warning-soft text-warning shrink-0">
            <Icon name="note" className="w-4 h-4" />
          </span>
          <p className="font-semibold text-ink truncate">Notepad</p>
        </div>
        <p className="mt-2.5 text-xs text-ink-3 line-clamp-3 min-h-[2.5rem]">
          {preview || 'General points and notes — jot something down before it becomes a task.'}
        </p>
      </div>
    </button>
  )
}

export default function BoardsView({ onOpenBoard, onManageFolder }) {
  const { state, dispatch } = useStore()
  const [newBoardFolder, setNewBoardFolder] = useState(null)
  const [newFolder, setNewFolder] = useState(false)
  const [notepadFolderId, setNotepadFolderId] = useState(null)

  const closeBoardModal = (reason) => {
    setNewBoardFolder(null)
    if (reason === 'created') onOpenBoard(null)
  }

  return (
    <div className="px-4 sm:px-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Projects</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {state.folders.length} {state.folders.length === 1 ? 'folder' : 'folders'} ·{' '}
            {state.boards.length} {state.boards.length === 1 ? 'board' : 'boards'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setNewFolder(true)}>
          <Icon name="folder" className="w-4 h-4" />
          <span className="hidden xs:inline">New folder</span>
        </Button>
      </div>

      {state.folders.length === 0 && (
        <EmptyState
          icon="folder"
          title="No project folders yet"
          hint="Folders keep each client or project separate."
          action={<Button onClick={() => setNewFolder(true)}>Create a folder</Button>}
        />
      )}

      <div className="space-y-8">
        {state.folders.map((folder) => {
          const boards = state.boards.filter((b) => b.folderId === folder.id)
          return (
            <section key={folder.id}>
              <header className="flex items-center gap-2 mb-3">
                <span aria-hidden="true">{folder.emoji}</span>
                <h2 className="font-semibold text-ink">{folder.name}</h2>
                <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">
                  {boards.length}
                </span>

                <button
                  onClick={() => onManageFolder(folder.id)}
                  className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink-2 hover:bg-muted hover:text-ink transition"
                  title={`People in ${folder.name}`}
                >
                  {folderMembers(folder).length > 0 ? (
                    <AvatarStack members={folderMembers(folder)} size={20} max={3} />
                  ) : (
                    <Icon name="users" className="w-4 h-4" />
                  )}
                  <span className="hidden xs:inline">
                    {folderMembers(folder).length || 'Add'} {folderMembers(folder).length === 1 ? 'person' : 'people'}
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  {canManageFolder(folder, state.user) && (
                  <button
                    onClick={() => {
                      const value = window.prompt('Rename folder', folder.name)
                      if (value?.trim()) dispatch({ type: 'renameFolder', id: folder.id, name: value.trim() })
                    }}
                    className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
                    aria-label={`Rename ${folder.name}`}
                    title="Rename folder"
                  >
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                  )}
                  {canManageFolder(folder, state.user) && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${folder.name}" and its ${boards.length} board(s)?`)) {
                        dispatch({ type: 'deleteFolder', id: folder.id })
                      }
                    }}
                    className="p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                    aria-label={`Delete ${folder.name}`}
                    title="Delete folder"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                  )}
                </div>
              </header>

              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                <NotepadCard folder={folder} onOpen={setNotepadFolderId} />
                {boards.map((b) => (
                  <BoardCard key={b.id} board={b} onOpen={onOpenBoard} />
                ))}
                <button
                  onClick={() => setNewBoardFolder(folder.id)}
                  className="rounded-xl border border-dashed border-line-strong min-h-[132px] flex flex-col items-center justify-center gap-1.5 text-ink-2 hover:border-primary hover:text-primary hover:bg-primary-soft/40 transition"
                >
                  <Icon name="plus" className="w-5 h-5" />
                  <span className="text-sm font-medium">New board</span>
                </button>
              </div>
            </section>
          )
        })}
      </div>

      {newBoardFolder && <NewBoardModal folderId={newBoardFolder} onClose={closeBoardModal} />}
      {newFolder && <NewFolderModal onClose={() => setNewFolder(false)} />}
      {notepadFolderId &&
        (() => {
          const folder = state.folders.find((f) => f.id === notepadFolderId)
          return folder ? (
            <FolderNotepadModal folder={folder} onClose={() => setNotepadFolderId(null)} />
          ) : null
        })()}
    </div>
  )
}
