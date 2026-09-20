import { useMemo, useState } from 'react'
import { Modal, Field, inputClass, Button, Avatar, Icon } from './ui'
import {
  useStore,
  ROLES,
  folderMembers,
  folderRoleOf,
  canManageFolder,
} from '../store'
import { encodePayload, isEmail, nameFromEmail } from '../lib/utils'

export default function FolderMembersModal({ folder, onClose }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const members = folderMembers(folder)
  const mayManage = canManageFolder(folder, state.user)
  const boards = state.boards.filter((b) => b.folderId === folder.id)

  const invite = useMemo(() => {
    const boardIds = boards.map((b) => b.id)
    const payload = {
      folder,
      boards,
      cards: state.cards.filter((c) => boardIds.includes(c.boardId)),
    }
    const code = encodePayload(payload)
    return { code, url: `${window.location.origin}${window.location.pathname}?join=${code}` }
  }, [folder, boards, state.cards])

  const workload = (memberId) => {
    const boardIds = boards.map((b) => b.id)
    const mine = state.cards.filter((c) => boardIds.includes(c.boardId) && c.assigneeId === memberId)
    return { open: mine.filter((c) => !c.done).length, done: mine.filter((c) => c.done).length }
  }

  const add = (e) => {
    e.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (!cleanName && !cleanEmail) {
      setError('Add a name or an email address.')
      return
    }
    if (cleanEmail && !isEmail(cleanEmail)) {
      setError('That email address does not look right.')
      return
    }

    const finalName = cleanName || nameFromEmail(cleanEmail)
    const duplicate = members.some(
      (m) =>
        m.name.toLowerCase() === finalName.toLowerCase() ||
        (cleanEmail && m.email?.toLowerCase() === cleanEmail.toLowerCase()),
    )
    if (duplicate) {
      setError('Someone with that name or email is already in this folder.')
      return
    }

    dispatch({
      type: 'addFolderMember',
      folderId: folder.id,
      name: finalName,
      email: cleanEmail,
      role,
    })
    setName('')
    setEmail('')
    setError('')
  }

  const copy = async (text, kind) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(kind)
    setTimeout(() => setCopied(''), 1800)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${folder.emoji ? `${folder.emoji} ` : ''}${folder.name} — people`}
      subtitle={`Everyone here works on all ${boards.length} ${
        boards.length === 1 ? 'board' : 'boards'
      } in this folder`}
    >
      {mayManage ? (
        <form noValidate onSubmit={add}>
          <div className="grid gap-3 xs:grid-cols-2">
            <Field label="Name">
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="e.g. Sara"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="sara@company.com"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div className="w-36">
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className="mb-0.5">
              <Icon name="plus" className="w-4 h-4" />
              Add to folder
            </Button>
            <p className="text-xs text-ink-3 flex-1 min-w-40 mb-2">
              Give a name, an email, or both — an email on its own becomes the name.
            </p>
          </div>

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </form>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink-2">
          Only the folder owner can add people or change their role.
        </p>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-2 mb-2">
          In this folder ({members.length})
        </p>

        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-sm text-ink-3 text-center">
            Nobody has been added to this folder yet.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-72 overflow-y-auto thin-scroll">
            {members.map((m) => {
              const memberRole = folderRoleOf(folder, m.id)
              const { open, done } = workload(m.id)
              return (
                <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted">
                  <Avatar user={m} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">
                      {m.name}
                      {state.user?.id === m.id && <span className="text-xs text-ink-3"> · you</span>}
                    </p>
                    <p className="text-xs text-ink-3 truncate">
                      {m.email ?? 'No email'} · {open} open, {done} done
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {memberRole === 'owner' || !mayManage ? (
                      <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2">
                        {ROLES[memberRole]?.label}
                      </span>
                    ) : (
                      <select
                        value={memberRole}
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

                    {mayManage && memberRole !== 'owner' && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${m.name} from "${folder.name}"? They lose access to every board in it.`,
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

      <div className="mt-6 rounded-xl border border-line bg-muted/60 p-4">
        <p className="text-sm font-medium text-ink">Invite link for this folder</p>
        <p className="text-sm text-ink-3 mt-1">
          Send this to someone and opening it gives them the folder with all of its boards and tasks.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={invite.url}
            onFocus={(e) => e.target.select()}
            className={`${inputClass} text-xs`}
          />
          <Button variant="secondary" onClick={() => copy(invite.url, 'link')} className="shrink-0">
            <Icon name={copied === 'link' ? 'check' : 'copy'} className="w-4 h-4" />
            {copied === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
