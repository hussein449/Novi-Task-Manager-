import { useState } from 'react'
import { Icon, Button, AvatarStack, Modal, Field, inputClass, EmptyState } from './ui'
import { useStore, SCENES, cardsOfBoard } from '../store'

const EMOJIS = ['\u{1F4BC}', '\u{1F3AF}', '\u{1F680}', '\u{1F3A8}', '\u{1F4C8}', '\u{1F9E9}', '\u{1F3E0}', '\u{1F4C1}']

function NewBoardModal({ folderId, onClose }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [scene, setScene] = useState('night')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'addBoard', name: name.trim(), folderId, scene })
    onClose('opened')
  }

  return (
    <Modal open onClose={onClose} title="New board">
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
          <span className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">
            Background
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SCENES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setScene(s)}
                className={`h-14 rounded-xl scene-${s} border-2 transition ${
                  scene === s ? 'border-white ring-2 ring-brand-500/40' : 'border-white/10 hover:border-white/30'
                }`}
                aria-label={s}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={!name.trim()} className="flex-1">
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
          <span className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">Icon</span>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-11 h-11 rounded-xl text-xl transition ${
                  emoji === e ? 'bg-white/20 ring-2 ring-brand-500/50' : 'bg-white/6 hover:bg-white/12'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={!name.trim()} className="flex-1">
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
    <div className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition shadow-lg">
      <button onClick={() => onOpen(board.id)} className="block w-full text-left">
        <div className={`h-20 scene-${board.scene ?? 'night'}`} />
        <div className="glass p-4 border-0">
          <p className="font-semibold truncate">{board.name}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-white/55">
            <span>{cards.length} cards</span>
            <span>·</span>
            <span>{done} done</span>
            {overdue > 0 && (
              <span className="ml-auto text-rose-300 font-semibold">{overdue} overdue</span>
            )}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack members={board.members} size={26} />
          </div>
        </div>
      </button>
      <button
        onClick={() => {
          if (window.confirm(`Delete the board “${board.name}” and all of its cards?`)) {
            dispatch({ type: 'deleteBoard', id: board.id })
          }
        }}
        className="absolute top-2 right-2 p-2 rounded-xl bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-300 transition"
        aria-label="Delete board"
      >
        <Icon name="trash" className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function BoardsView({ onOpenBoard }) {
  const { state, dispatch } = useStore()
  const [newBoardFolder, setNewBoardFolder] = useState(null)
  const [newFolder, setNewFolder] = useState(false)

  const closeBoardModal = (reason) => {
    const folder = newBoardFolder
    setNewBoardFolder(null)
    if (reason === 'opened') onOpenBoard(null, true)
    void folder
  }

  return (
    <div className="px-4 sm:px-6 pb-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your workspace</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {state.folders.length} {state.folders.length === 1 ? 'folder' : 'folders'} ·{' '}
            {state.boards.length} {state.boards.length === 1 ? 'board' : 'boards'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setNewFolder(true)}>
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
              <header className="flex items-center gap-2.5 mb-3">
                <span className="text-xl">{folder.emoji}</span>
                <h2 className="font-semibold text-lg">{folder.name}</h2>
                <span className="text-xs text-white/40">{boards.length}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => {
                      const name = window.prompt('Rename folder', folder.name)
                      if (name?.trim()) dispatch({ type: 'renameFolder', id: folder.id, name: name.trim() })
                    }}
                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
                    aria-label="Rename folder"
                  >
                    <Icon name="dots" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete “${folder.name}” with its ${boards.length} board(s)?`)) {
                        dispatch({ type: 'deleteFolder', id: folder.id })
                      }
                    }}
                    className="p-2 rounded-lg text-white/40 hover:text-rose-300 hover:bg-rose-500/10 transition"
                    aria-label="Delete folder"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                {boards.map((b) => (
                  <BoardCard key={b.id} board={b} onOpen={onOpenBoard} />
                ))}
                <button
                  onClick={() => setNewBoardFolder(folder.id)}
                  className="rounded-2xl glass-soft min-h-[150px] flex flex-col items-center justify-center gap-2 text-white/70 hover:text-white hover:bg-white/14 transition"
                >
                  <Icon name="plus" className="w-5 h-5" />
                  <span className="text-sm font-semibold">Create board</span>
                </button>
              </div>
            </section>
          )
        })}
      </div>

      {newBoardFolder && <NewBoardModal folderId={newBoardFolder} onClose={closeBoardModal} />}
      {newFolder && <NewFolderModal onClose={() => setNewFolder(false)} />}
    </div>
  )
}
