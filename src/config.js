/**
 * The workspace admin.
 *
 * Whoever signs in with this address is treated as the owner of every folder
 * and every board: they can add and remove people, change roles, and edit any
 * task, without being invited first.
 *
 * Note this is a front-end rule on data kept in the browser — it decides what
 * the interface offers, not what a determined person could reach. Real access
 * control needs a backend that checks identity on every request.
 */
export const ADMIN_EMAIL = 'husseinnaserddine21@gmail.com'

export const isAdminEmail = (email) =>
  Boolean(email) && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
