import { useMemo, useState } from 'react'
import { Modal, Field, inputClass, Button, Avatar, Icon } from './ui'
import { useStore, cardsOfBoard } from '../store'
import { encodePayload } from '../lib/utils'

export default function InviteModal({ board, onClose }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [copied, setCopied] = useState('')

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
    const value = name.trim()
    if (!value) return
    dispatch({ type: 'addMember', boardId: board.id, name: value })
    setName('')
  }

  return (
    <Modal open onClose={onClose} title="Share board" subtitle={board.name}>
      <form onSubmit={add} className="flex gap-2 items-end">
        <div className="flex-1">
          <Field label="Invite by name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ali"
              className={inputClass}
            />
          </Field>
        </div>
        <Button type="submit" disabled={!name.trim()} className="mb-0.5">
          <Icon name="plus" className="w-4 h-4" />
          Invite
        </Button>
      </form>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-2 mb-2">Board members ({board.members.length})</p>
        <div className="space-y-0.5 max-h-56 overflow-y-auto thin-scroll">
          {board.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted">
              <Avatar user={m} size={28} />
              <span className="text-sm text-ink truncate">{m.name}</span>
              {state.user?.id === m.id && <span className="text-xs text-ink-3">you</span>}
              <button
                onClick={() => dispatch({ type: 'removeMember', boardId: board.id, memberId: m.id })}
                className="ml-auto p-1.5 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                aria-label={`Remove ${m.name}`}
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
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
