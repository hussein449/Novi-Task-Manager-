import { Modal, Avatar, Icon, Button } from './ui'
import InvitePanel from './InvitePanel'
import { useStore, ROLES, roleOf, canManage } from '../store'

export default function InviteModal({ board, onClose }) {
  const { state, dispatch } = useStore()
  const mayManage = canManage(board, state.user)
  const folder = state.folders.find((f) => f.id === board.folderId)

  return (
    <Modal open onClose={onClose} title="Share this project" subtitle={board.name}>
      {mayManage ? (
        <InvitePanel
          scope="board"
          targetId={board.id}
          label={board.name}
          existing={board.members}
          onAdded={({ email, name, role }) =>
            dispatch({ type: 'addMember', boardId: board.id, email, name, role })
          }
        />
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink-2">
          Only an owner of this project can invite people or change their role.
        </p>
      )}

      <p className="mt-3 text-xs text-ink-3">
        This adds them to this project only. To give someone every project of{' '}
        <strong className="font-medium text-ink-2">{folder?.name ?? 'a client'}</strong>, add them to
        the folder from <strong className="font-medium text-ink-2">People</strong>.
      </p>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-2 mb-2">On this project ({board.members.length})</p>
        <div className="space-y-0.5 max-h-64 overflow-y-auto thin-scroll">
          {board.members.map((m) => {
            const role = roleOf(board, m.id)
            return (
              <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted">
                <Avatar user={m} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate">
                    {m.name}
                    {state.user?.id === m.id && <span className="text-xs text-ink-3"> · you</span>}
                    {m.inherited && (
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                        from folder
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-3 truncate">{m.email}</span>
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {role === 'owner' || !mayManage || m.inherited ? (
                    <span
                      className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2"
                      title={m.inherited ? 'Set in the folder this project belongs to' : undefined}
                    >
                      {ROLES[role]?.label}
                    </span>
                  ) : (
                    <select
                      value={role}
                      onChange={(e) =>
                        dispatch({
                          type: 'setMemberRole',
                          boardId: board.id,
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

                  {mayManage && role !== 'owner' && !m.inherited && (
                    <button
                      onClick={() => dispatch({ type: 'removeMember', boardId: board.id, memberId: m.id })}
                      className="p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                      aria-label={`Remove ${m.name}`}
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
