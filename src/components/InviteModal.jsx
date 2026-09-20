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
    <Modal open onClose={onClose} title={`Share “${board.name}”`}>
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

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">
          Board members ({board.members.length})
        </p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto thin-scroll pr-1">
          {board.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/6">
              <Avatar user={m} size={30} />
              <span className="text-sm truncate">{m.name}</span>
              {state.user?.id === m.id && (
                <span className="text-[10px] uppercase tracking-wider text-white/40">you</span>
              )}
              <button
                onClick={() => dispatch({ type: 'removeMember', boardId: board.id, memberId: m.id })}
                className="ml-auto p-1.5 rounded-lg text-white/40 hover:text-rose-300 hover:bg-rose-500/10 transition"
                aria-label={`Remove ${m.name}`}
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold">Invite link</p>
        <p className="text-xs text-white/50 mt-1">
          Anyone who opens this link gets a copy of the board, its lists and its cards.
        </p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link.url} className={`${inputClass} text-xs`} onFocus={(e) => e.target.select()} />
          <Button variant="ghost" onClick={() => copy(link.url, 'link')} className="shrink-0">
            <Icon name={copied === 'link' ? 'check' : 'copy'} className="w-4 h-4" />
            {copied === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <button
          onClick={() => copy(link.code, 'code')}
          className="mt-2 text-xs text-white/50 hover:text-white transition"
        >
          {copied === 'code' ? 'Invite code copied' : 'Or copy the plain invite code'}
        </button>
      </div>
    </Modal>
  )
}
