import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Adds someone to a folder or a board and tries to tell them by email.
 *
 * The membership write goes through the caller's own token, so row level
 * security decides whether they are allowed to invite at all — this function
 * never uses the service role to bypass a permission check.
 *
 * Sending mail is optional. With RESEND_API_KEY set the invitation is emailed;
 * without it the function still records the membership and hands back a link
 * so the inviter can send it themselves.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Sign in first' }, 401)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Expected a JSON body' }, 400)
  }

  const scope = String(payload.scope ?? '')
  const targetId = String(payload.id ?? '')
  const email = String(payload.email ?? '').trim().toLowerCase()
  const name = String(payload.name ?? '').trim() || email.split('@')[0]
  const role = String(payload.role ?? 'editor')
  const appUrl = String(payload.appUrl ?? '').replace(/\/$/, '')
  const label = String(payload.label ?? '')

  if (scope !== 'folder' && scope !== 'board') {
    return json({ error: 'scope must be folder or board' }, 400)
  }
  if (!targetId) return json({ error: 'Missing the folder or board id' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: 'That email address is not valid' }, 400)
  }
  if (!['editor', 'viewer', 'owner'].includes(role)) return json({ error: 'Unknown role' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Sign in first' }, 401)
  const inviter = userData.user.email ?? ''

  const table = scope === 'folder' ? 'folder_members' : 'board_members'
  const key = scope === 'folder' ? 'folder_id' : 'board_id'

  const { data: member, error: writeError } = await supabase
    .from(table)
    .upsert(
      { [key]: targetId, email, display_name: name, role, invited_by: inviter },
      { onConflict: `${key},email` },
    )
    .select()
    .single()

  if (writeError) {
    // RLS refuses the row when the caller is not an owner of the target
    const denied = writeError.code === '42501' || /row-level security/i.test(writeError.message)
    return json(
      {
        error: denied
          ? 'Only an owner of this folder or board can invite people'
          : writeError.message,
      },
      denied ? 403 : 400,
    )
  }

  const inviteUrl = `${appUrl || Deno.env.get('APP_URL') || ''}/?invited=1&email=${encodeURIComponent(email)}`
  const subject = `${inviter || 'Someone'} added you to ${label || 'a project'} on Novi`
  const body = [
    `Hi ${name},`,
    '',
    `${inviter || 'A colleague'} added you to ${label || 'a project'} on Novi as ${
      role === 'viewer' ? 'a viewer' : 'an editor'
    }.`,
    '',
    `Open it here and sign in with this address (${email}):`,
    inviteUrl,
  ].join('\n')

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return json({ ok: true, member, emailed: false, reason: 'no_email_provider', inviteUrl, subject, body })
  }

  try {
    const from = Deno.env.get('INVITE_FROM_EMAIL') ?? 'Novi <onboarding@resend.dev>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text: body,
        html: `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#16202c;line-height:1.55">
          <p>Hi ${escapeHtml(name)},</p>
          <p><strong>${escapeHtml(inviter || 'A colleague')}</strong> added you to <strong>${escapeHtml(
            label || 'a project',
          )}</strong> on Novi as ${role === 'viewer' ? 'a viewer' : 'an editor'}.</p>
          <p><a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open Novi</a></p>
          <p style="color:#4a5666;font-size:14px">Sign in with this address: ${escapeHtml(email)}</p>
        </div>`,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return json({ ok: true, member, emailed: false, reason: 'send_failed', detail, inviteUrl, subject, body })
    }

    return json({ ok: true, member, emailed: true, inviteUrl, subject, body })
  } catch (error) {
    return json({
      ok: true,
      member,
      emailed: false,
      reason: 'send_failed',
      detail: String(error),
      inviteUrl,
      subject,
      body,
    })
  }
})
