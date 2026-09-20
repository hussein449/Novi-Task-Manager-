import { useState } from 'react'
import { Icon, inputClass, Button } from './ui'
import { useStore } from '../store'
import { decodePayload } from '../lib/utils'

export default function Login() {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const value = name.trim()
    if (!value) return

    if (code.trim()) {
      const payload = decodePayload(code.trim().split('join=').pop())
      if (!payload?.board) {
        setError('That invite code could not be read. Check that you copied all of it.')
        return
      }
      dispatch({ type: 'importBoard', payload })
    }
    dispatch({ type: 'login', name: value })
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-white">
              <Icon name="board" className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold text-ink">Novi</span>
          </div>

          <h1 className="text-2xl font-semibold text-ink tracking-tight">Sign in</h1>
          <p className="text-sm text-ink-2 mt-1.5 mb-6">
            Enter your name to open your boards. No password needed.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-ink-2 mb-1.5">Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hussein"
                className={inputClass}
              />
            </label>

            {showJoin && (
              <label className="block animate-pop">
                <span className="block text-sm font-medium text-ink-2 mb-1.5">Invite code or link</span>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError('')
                  }}
                  placeholder="Paste the invite you were sent"
                  className={inputClass}
                />
                {error && <span className="block mt-1.5 text-xs text-danger">{error}</span>}
              </label>
            )}

            <Button type="submit" disabled={!name.trim()} className="w-full py-2.5">
              Continue
            </Button>

            <button
              type="button"
              onClick={() => setShowJoin((v) => !v)}
              className="w-full text-sm text-ink-2 hover:text-primary transition"
            >
              {showJoin ? 'I do not have an invite' : 'I have an invite code'}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center border-l border-line bg-surface px-12">
        <h2 className="text-xl font-semibold text-ink">Plan work, hit deadlines.</h2>
        <ul className="mt-6 space-y-4 max-w-sm">
          {[
            ['Boards per client or project', 'Group them in folders so nothing gets mixed up.'],
            ['To Do, Doing, Done', 'Drag cards between stages on desktop or on your phone.'],
            ['Deadlines with reminders', 'Get a nudge before a card is due, not after.'],
            ['One view of everything', 'Overview and Planner show every board at once.'],
          ].map(([title, hint]) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-primary-soft text-primary shrink-0">
                <Icon name="check" className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="text-sm text-ink-3">{hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
