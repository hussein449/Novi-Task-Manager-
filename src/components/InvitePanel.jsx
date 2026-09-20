import { useState } from 'react'
import { Icon, Button, inputClass, Field } from './ui'
import { sendInvite } from '../lib/api'
import { isEmail, nameFromEmail } from '../lib/utils'

/**
 * Adds someone to a folder or a board and tries to email them about it.
 *
 * Sending mail needs a provider, and providers cost money past a free tier, so
 * a failure here is expected rather than exceptional: the membership is saved
 * either way and the invitation link is handed back to send by hand.
 */
export default function InvitePanel({ scope, targetId, label, existing = [], onAdded, compact = false }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (!isEmail(cleanEmail)) {
      setError('Enter the email address to invite.')
      return
    }
    const finalName = cleanName || nameFromEmail(cleanEmail)
    if (existing.some((m) => m.email?.toLowerCase() === cleanEmail)) {
      setError(`Already in this ${scope}.`)
      return
    }

    setBusy(true)
    setError('')
    setResult(null)
    try {
      const data = await sendInvite({
        scope,
        id: targetId,
        email: cleanEmail,
        name: finalName,
        role,
        label,
      })
      setResult({ ...data, email: cleanEmail, name: finalName })
      onAdded?.({ email: cleanEmail, name: finalName, role })
      setName('')
      setEmail('')
    } catch (e2) {
      setError(e2.message ?? 'Could not send that invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(result.inviteUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = result.inviteUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const mailto = result
    ? `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent(
        result.subject ?? 'You have been added to a project',
      )}&body=${encodeURIComponent(result.body ?? result.inviteUrl)}`
    : ''

  return (
    <div className={compact ? '' : 'rounded-xl border border-line bg-muted/50 p-3'}>
      <form noValidate onSubmit={submit}>
        <div className={compact ? 'flex flex-wrap gap-2' : 'grid gap-3 xs:grid-cols-2'}>
          {compact ? (
            <>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Name"
                className={`${inputClass} flex-1 min-w-28 py-1.5`}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="name@company.com"
                className={`${inputClass} flex-[2] min-w-44 py-1.5`}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`${inputClass} w-28 py-1.5`}
                aria-label="Role"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? 'Sending…' : 'Invite'}
              </Button>
            </>
          ) : (
            <>
              <Field label="Name">
                <input
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
            </>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div className="w-36">
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </Field>
            </div>
            <Button type="submit" disabled={busy} className="mb-0.5">
              <Icon name="plus" className="w-4 h-4" />
              {busy ? 'Sending…' : `Invite to ${scope}`}
            </Button>
            <p className="text-xs text-ink-3 flex-1 min-w-40 mb-2">
              They get an email with the link, and can sign in with this address.
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </form>

      {result && (
        <div
          className={`mt-3 rounded-lg border p-3 ${
            result.emailed ? 'border-emerald-200 bg-success-soft' : 'border-amber-200 bg-warning-soft'
          }`}
        >
          <p className="text-sm font-medium text-ink">
            {result.emailed
              ? `Invitation emailed to ${result.email}.`
              : `${result.name} was added — but the email could not be sent.`}
          </p>

          {!result.emailed && (
            <>
              <p className="text-xs text-ink-2 mt-1">
                {result.reason === 'no_email_provider'
                  ? 'No email provider is configured, which is the free setup. Send them the link yourself:'
                  : 'The email provider refused the message. Send them the link yourself:'}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  readOnly
                  value={result.inviteUrl}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} flex-1 min-w-48 text-xs py-1.5`}
                />
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  <Icon name={copied ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
                <a
                  href={mailto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-muted transition"
                >
                  <Icon name="inbox" className="w-3.5 h-3.5" />
                  Open mail app
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
