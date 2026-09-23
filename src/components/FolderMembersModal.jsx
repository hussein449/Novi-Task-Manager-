import { Modal, Button, Avatar, Icon } from './ui'
import InvitePanel from './InvitePanel'
import { useStore, ROLES, folderMembers, folderRoleOf, canManageFolder, isAssignedTo } from '../store'

export default function FolderMembersModal({ folder, onClose }) {
  const { state, dispatch } = useStore()
  const members = folderMembers(folder)
  const mayManage = canManageFolder(folder, state.user)
  const boards = state.boards.filter((b) => b.folderId === folder.id)

  const workload = (email) => {
    const boardIds = boards.map((b) => b.id)
    const mine = state.cards.filter((c) => boardIds.includes(c.boardId) && isAssignedTo(c, email))
    return { open: mine.filter((c) => !c.done).length, done: mine.filter((c) => c.done).length }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${folder.emoji ? `${folder.emoji} ` : ''}${folder.name} — people`}
      subtitle={`Everyone here works on all ${boards.length} ${
        boards.length === 1 ? 'project' : 'projects'
      } in this folder`}
    >
      {mayManage ? (
        <InvitePanel
          scope="folder"
          targetId={folder.id}
          label={folder.name}
          existing={members}
          onAdded={({ email, name, role }) =>
            dispatch({ type: 'addFolderMember', folderId: folder.id, email, name, role })
          }
        />
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink-2">
          Only the folder owner can add people or change their role.
        </p>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-2 mb-2">In this folder ({members.length})</p>

        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-sm text-ink-3 text-center">
            Nobody has been added to this folder yet.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-72 overflow-y-auto thin-scroll">
            {members.map((m) => {
              const role = folderRoleOf(folder, m.id)
              const { open, done } = workload(m.id)
              return (
                <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted">
                  <Avatar user={m} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">
                      {m.name}
                      {state.user?.id === m.id && <span className="text-xs text-ink-3"> · you</span>}
                      {m.pending && (
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                          invited
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-3 truncate">
                      {m.email} · {open} open, {done} done
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {role === 'owner' || !mayManage ? (
                      <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2">
                        {ROLES[role]?.label}
                      </span>
                    ) : (
                      <select
                        value={role}
                        onChange={(e) =>
                          dispatch({
                            type: 'setFolderMemberRole',
                            folderId: folder.id,
                            memberId: m.id,
                            role: e.target.value,
                          })
                        }
                        className="rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                        aria-label={`Role for ${m.name}`}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}

                    {mayManage && role !== 'owner' && (
                      <button
                        onClick={() => {
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
                        className="p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                        aria-label={`Remove ${m.name} from ${folder.name}`}
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
