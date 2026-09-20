import { useMemo, useState } from 'react'
import { Modal, Field, inputClass, Button, Avatar, Icon } from './ui'
import { useStore, cardsOfBoard, ROLES, roleOf, canManage } from '../store'
import { encodePayload, isEmail, nameFromEmail } from '../lib/utils'

export default function InviteModal({ board, onClose }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const mayManage = canManage(board, state.user)

  const link = useMemo(() => {
    const payload = { board, cards: cardsOfBoard(state, board.id) }
    const code = encodePayload(payload)
    const base = `${window.location.origin}${window.location.pathname}`
    return { code, url: `${base}?join=${code}` }
  }, [board, state])

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
    dispatch({
      type: 'addMember',
      boardId: board.id,
      name: cleanName || nameFromEmail(cleanEmail),
      email: cleanEmail,
      role,
    })
    setName('')
    setEmail('')
    setError('')
  }

  return (
    <Modal open onClose={onClose} title="Share board" subtitle={board.name}>
      {mayManage ? (
        <form noValidate onSubmit={add} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-32">
            <Field label="Name">
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="e.g. Ali"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex-1 min-w-40">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="ali@teka.co"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </Field>
          </div>
          <Button type="submit" disabled={!name.trim() && !email.trim()} className="mb-0.5">
            <Icon name="plus" className="w-4 h-4" />
            Invite
          </Button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink-2">
          Only the board owner can invite people or change their role.
        </p>
      )}

      <p className="mt-3 text-xs text-ink-3">
        Adding someone here puts them on this board only. To give access to every board of a
        client or project, add them to its folder from <strong className="font-medium text-ink-2">Projects</strong>.
      </p>

      <p className="mt-2 text-xs text-ink-3">
        <strong className="text-ink-2 font-medium">Editor</strong> {ROLES.editor.hint.toLowerCase()}.{' '}
        <strong className="text-ink-2 font-medium">Viewer</strong> {ROLES.viewer.hint.toLowerCase()}.
      </p>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-2 mb-2">Board members ({board.members.length})</p>
        <div className="space-y-0.5 max-h-56 overflow-y-auto thin-scroll">
          {board.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted">
              <Avatar user={m} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink truncate">
                  {m.name}
                  {state.user?.id === m.id && <span className="text-xs text-ink-3"> · you</span>}
                </span>
                {m.email && <span className="block text-xs text-ink-3 truncate">{m.email}</span>}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {roleOf(board, m.id) === 'owner' || !mayManage ? (
                  <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2">
                    {ROLES[roleOf(board, m.id)]?.label}
                  </span>
                ) : (
                  <select
                    value={roleOf(board, m.id)}
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

                {mayManage && roleOf(board, m.id) !== 'owner' && (
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
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-muted/60 p-4">
        <p className="text-sm font-medium text-ink">Invite link</p>
        <p className="text-sm text-ink-3 mt-1">
          Anyone who opens this link gets a copy of the board, its lists and its cards.
        </p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link.url} className={`${inputClass} text-xs`} onFocus={(e) => e.target.select()} />
          <Button variant="secondary" onClick={() => copy(link.url, 'link')} className="shrink-0">
            <Icon name={copied === 'link' ? 'check' : 'copy'} className="w-4 h-4" />
            {copied === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <button
          onClick={() => copy(link.code, 'code')}
          className="mt-2 text-sm text-ink-2 hover:text-primary transition"
        >
          {copied === 'code' ? 'Invite code copied' : 'Or copy the plain invite code'}
        </button>
      </div>
    </Modal>
  )
}
