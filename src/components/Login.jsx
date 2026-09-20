import { useEffect, useState } from 'react'
import { Icon, inputClass, Button } from './ui'
import { supabase } from '../lib/supabase'
import { isEmail } from '../lib/utils'
import { isAdminEmail } from '../config'

const MODES = {
  signin: { title: 'Sign in', action: 'Sign in', other: 'signup', otherLabel: 'Create an account' },
  signup: {
    title: 'Create an account',
    action: 'Create account',
    other: 'signin',
    otherLabel: 'I already have one',
  },
}

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Someone arriving from an invitation gets their address filled in
  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get('email')
    if (invited) {
      setEmail(invited)
      setNotice('You have been invited. Sign in with this address to see the work shared with you.')
    }
  }, [])

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      const { error: authError } = await fn()
      if (authError) throw authError
      return true
    } catch (e) {
      setError(e.message ?? 'That did not work.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Use a password of at least 6 characters.')
      return
    }

    if (mode === 'signin') {
      await run(() => supabase.auth.signInWithPassword({ email: email.trim(), password }))
      return
    }

    const ok = await run(() =>
      supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() || email.split('@')[0] } },
      }),
    )
    if (ok) {
      setNotice(
        'Account created. If the project asks for email confirmation, open the link sent to you, then sign in.',
      )
      setMode('signin')
    }
  }

  const magicLink = async () => {
    if (!isEmail(email)) {
      setError('Enter your email address first.')
      return
    }
    const ok = await run(() =>
      supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      }),
    )
    if (ok) setNotice(`A sign-in link is on its way to ${email.trim()}.`)
  }

  const copy = MODES[mode]

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

          <h1 className="text-2xl font-semibold text-ink tracking-tight">{copy.title}</h1>
          <p className="text-sm text-ink-2 mt-1.5 mb-6">
            Boards, deadlines and people, shared with your team.
          </p>

          {notice && (
            <p className="mb-4 rounded-lg border border-line bg-primary-soft/60 px-3 py-2 text-sm text-ink-2">
              {notice}
            </p>
          )}

          <form noValidate onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
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
            )}

            <label className="block">
              <span className="block text-sm font-medium text-ink-2 mb-1.5">Email</span>
              <input
                type="email"
                autoFocus={mode === 'signin'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="you@company.com"
                className={inputClass}
              />
              {isAdminEmail(email) && (
                <span className="block mt-1.5 text-xs text-primary">
                  This is the workspace admin — you own every folder and project.
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-ink-2 mb-1.5">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="At least 6 characters"
                className={inputClass}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button type="submit" disabled={busy} className="w-full py-2.5">
              {busy ? 'Working…' : copy.action}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode(copy.other)
                  setError('')
                }}
                className="text-ink-2 hover:text-primary transition"
              >
                {copy.otherLabel}
              </button>
              <button
                type="button"
                onClick={magicLink}
                disabled={busy}
                className="text-ink-2 hover:text-primary transition"
              >
                Email me a link
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center border-l border-line bg-surface px-12">
        <h2 className="text-xl font-semibold text-ink">Plan work, hit deadlines.</h2>
        <ul className="mt-6 space-y-4 max-w-sm">
          {[
            ['Folders per client or project', 'Add people once and they join every board inside.'],
            ['To Do, Doing, Done', 'Drag tasks between stages on a desktop or a phone.'],
            ['Deadlines with reminders', 'A nudge before a task is due, not after.'],
            ['Everyone sees the same board', 'Changes land for your team as they happen.'],
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
