import { useMemo, useState } from 'react'
import { Icon, Avatar, AvatarStack, Button, EmptyState } from './ui'
import InvitePanel from './InvitePanel'
import {
  useStore,
  ROLES,
  accentOf,
  folderMembers,
  folderRoleOf,
  canManageFolder,
  canManage,
  roleOf,
  isAdmin,
  isAssignedTo,
} from '../store'

/* ---------------- one person's row ---------------- */

function PersonRow({ member, role, counts, mayManage, onRole, onRemove, indent = false }) {
  const { state } = useStore()
  const isMe = state.user?.id === member.id
  const locked = role === 'owner' || !mayManage || member.inherited

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted transition ${
        indent ? 'ml-1' : ''
      }`}
    >
      <Avatar user={member} size={indent ? 26 : 32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate">
          {member.name}
          {isMe && <span className="text-xs text-ink-3"> · you</span>}
          {member.pending && (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
              invited
            </span>
          )}
          {member.inherited && (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
              from folder
            </span>
          )}
        </p>
        <p className="text-xs text-ink-3 truncate">
          {member.email ?? 'No email'}
          {counts ? ` · ${counts.open} open, ${counts.done} done` : ''}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {locked ? (
          <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2">
            {ROLES[role]?.label ?? 'Member'}
          </span>
        ) : (
          <select
            value={role}
            onChange={(e) => onRole(e.target.value)}
            className="rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
            aria-label={`Role for ${member.name}`}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        )}

        {mayManage && role !== 'owner' && !member.inherited && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
            aria-label={`Remove ${member.name}`}
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------- a board inside a folder ---------------- */

function BoardPeople({ board, mayManage }) {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const cards = state.cards.filter((c) => c.boardId === board.id)

  const counts = (memberId) => ({
    open: cards.filter((c) => isAssignedTo(c, memberId) && !c.done).length,
    done: cards.filter((c) => isAssignedTo(c, memberId) && c.done).length,
  })

  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 -ml-1 rounded-md text-ink-3 hover:text-ink hover:bg-muted transition"
          aria-label={open ? `Collapse ${board.name}` : `Expand ${board.name}`}
          aria-expanded={open}
        >
          <Icon name="chevron" className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <span className={`w-2 h-2 rounded-full shrink-0 accent-${accentOf(board)}`} />
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-ink truncate hover:text-primary transition"
        >
          {board.name}
        </button>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <AvatarStack members={board.members} size={22} max={4} />
          <span className="text-xs text-ink-3 tabular-nums">{board.members.length}</span>
          {mayManage && (
            <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setAdding(true) }}>
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Add</span>
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line p-2 space-y-1">
          {adding && (
            <InvitePanel
              compact
              scope="board"
              targetId={board.id}
              label={board.name}
              existing={board.members}
              onAdded={({ email, name, role }) =>
                dispatch({ type: 'addMember', boardId: board.id, email, name, role })
              }
            />
          )}

          {board.members.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-ink-3">Nobody is on this board yet.</p>
          ) : (
            board.members.map((m) => (
              <PersonRow
                key={m.id}
                member={m}
                role={roleOf(board, m.id)}
                counts={counts(m.id)}
                mayManage={mayManage}
                indent
                onRole={(role) =>
                  dispatch({ type: 'setMemberRole', boardId: board.id, memberId: m.id, role })
                }
                onRemove={() => {
                  if (window.confirm(`Remove ${m.name} from "${board.name}"?`)) {
                    dispatch({ type: 'removeMember', boardId: board.id, memberId: m.id })
                  }
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- the view ---------------- */

export default function People({ onManageFolder }) {
  const { state, dispatch } = useStore()
  const [addingFolderId, setAddingFolderId] = useState(null)

  const folders = useMemo(
    () =>
      state.folders.map((folder) => {
        const boards = state.boards.filter((b) => b.folderId === folder.id)
        const ids = boards.map((b) => b.id)
        const cards = state.cards.filter((c) => ids.includes(c.boardId))
        return { folder, boards, cards }
      }),
    [state.folders, state.boards, state.cards],
  )

  const headcount = useMemo(() => {
    const ids = new Set()
    state.folders.forEach((f) => folderMembers(f).forEach((m) => ids.add(m.email ?? m.name)))
    state.boards.forEach((b) => b.members.forEach((m) => ids.add(m.email ?? m.name)))
    return ids.size
  }, [state.folders, state.boards])

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink tracking-tight">People</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          {headcount} {headcount === 1 ? 'person' : 'people'} across{' '}
          {state.folders.length} {state.folders.length === 1 ? 'folder' : 'folders'}. Add someone to a
          folder to put them on all of its projects, or to one project on its own.
        </p>
      </div>

      {isAdmin(state.user) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-primary-soft/60 p-3.5">
          <span className="grid place-items-center w-8 h-8 rounded-full bg-primary text-white shrink-0">
            <Icon name="users" className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">You are the workspace admin</p>
            <p className="text-sm text-ink-2 mt-0.5">
              {state.user.email} owns every folder and project here, so you can add people, set
              roles and edit any task without being invited first.
            </p>
          </div>
        </div>
      )}

      {folders.length === 0 && (
        <EmptyState
          icon="folder"
          title="No folders yet"
          hint="Create a project folder first, then add people to it."
        />
      )}

      <div className="space-y-4">
        {folders.map(({ folder, boards, cards }) => {
          const members = folderMembers(folder)
          const mayManage = canManageFolder(folder, state.user)

          const counts = (memberId) => ({
            open: cards.filter((c) => isAssignedTo(c, memberId) && !c.done).length,
            done: cards.filter((c) => isAssignedTo(c, memberId) && c.done).length,
          })

          return (
            <section key={folder.id} className="rounded-xl border border-line bg-surface shadow-xs">
              <header className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
                <span aria-hidden="true">{folder.emoji}</span>
                <h2 className="font-semibold text-ink truncate">{folder.name}</h2>
                <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">
                  {members.length} {members.length === 1 ? 'person' : 'people'}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  {mayManage && (
                    <Button
                      size="sm"
                      onClick={() => setAddingFolderId(addingFolderId === folder.id ? null : folder.id)}
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      Add to folder
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onManageFolder(folder.id)}>
                    Invite link
                  </Button>
                </div>
              </header>

              <div className="p-3 space-y-1">
                {addingFolderId === folder.id && (
                  <InvitePanel
                    compact
                    scope="folder"
                    targetId={folder.id}
                    label={folder.name}
                    existing={members}
                    onAdded={({ email, name, role }) =>
                      dispatch({ type: 'addFolderMember', folderId: folder.id, email, name, role })
                    }
                  />
                )}

                {members.length === 0 ? (
                  <p className="px-2.5 py-3 text-sm text-ink-3">
                    Nobody has been added to this folder yet.
                  </p>
                ) : (
                  members.map((m) => (
                    <PersonRow
                      key={m.id}
                      member={m}
                      role={folderRoleOf(folder, m.id)}
                      counts={counts(m.id)}
                      mayManage={mayManage}
                      onRole={(role) =>
                        dispatch({
                          type: 'setFolderMemberRole',
                          folderId: folder.id,
                          memberId: m.id,
                          role,
                        })
                      }
                      onRemove={() => {
                        if (
                          window.confirm(
                            `Remove ${m.name} from "${folder.name}"? They lose access to every project in it.`,
                          )
                        ) {
                          dispatch({
                            type: 'removeFolderMember',
                            folderId: folder.id,
                            memberId: m.id,
                          })
                        }
                      }}
                    />
                  ))
                )}
              </div>

              <div className="px-3 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 px-1 mb-2">
                  Projects in this folder
                </p>
                {boards.length === 0 ? (
                  <p className="px-1 text-sm text-ink-3">No projects in this folder yet.</p>
                ) : (
                  <div className="space-y-2">
                    {boards.map((b) => (
                      <BoardPeople key={b.id} board={b} mayManage={canManage(b, state.user)} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
