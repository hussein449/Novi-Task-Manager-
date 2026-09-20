import { useState } from 'react'
import { Icon, inputClass } from './ui'
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
        setError('That invite code is not valid.')
        return
      }
      dispatch({ type: 'importBoard', payload })
    }
    dispatch({ type: 'login', name: value })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-7">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30">
            <Icon name="board" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novi</h1>
            <p className="text-sm text-white/55">Boards, deadlines and reminders.</p>
          </div>
        </div>

        <form onSubmit={submit} className="glass rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold">Sign in with your name</h2>
          <p className="text-sm text-white/50 mt-1 mb-5">
            No password. Your boards stay on this device, and invite links carry a board to anyone else.
          </p>

          <label className="block mb-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-1.5">
              Your name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hussein"
              className={inputClass}
            />
          </label>

          {showJoin && (
            <label className="block mb-4 animate-pop">
              <span className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-1.5">
                Invite code or link
              </span>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError('')
                }}
                placeholder="Paste the invite you were sent"
                className={inputClass}
              />
              {error && <span className="block mt-1.5 text-xs text-rose-300">{error}</span>}
            </label>
          )}

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:pointer-events-none px-4 py-3 font-semibold transition active:scale-[0.99]"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={() => setShowJoin((v) => !v)}
            className="w-full mt-3 text-sm text-white/55 hover:text-white transition"
          >
            {showJoin ? 'Skip the invite' : 'I have an invite code'}
          </button>
        </form>
      </div>
    </div>
  )
}
