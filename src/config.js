/**
 * Configuration comes from the environment, so nothing personal is committed.
 * Copy .env.example to .env.local for development, and set the same three
 * variables in Netlify for the deployed site.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * The workspace admin: whoever signs in with this address owns every folder and
 * board. The database enforces the same thing through its `admins` table — this
 * constant only decides what the interface offers.
 */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase()

export const isAdminEmail = (email) =>
  Boolean(email) && Boolean(ADMIN_EMAIL) && email.trim().toLowerCase() === ADMIN_EMAIL

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
