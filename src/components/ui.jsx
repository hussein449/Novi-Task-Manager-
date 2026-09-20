import { useEffect } from 'react'
import { initials } from '../lib/utils'

/* ---------------- icons ---------------- */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const Icon = ({ name, className = 'w-5 h-5' }) => {
  const paths = {
    board: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></>,
    inbox: <><path d="M3 12h4l2 3h6l2-3h4" /><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" /></>,
    planner: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    switch: <><path d="M4 7h11l-3-3M20 17H9l3 3" /></>,
    overview: <><path d="M4 19V10M10 19V5M16 19v-6M22 19H2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a6 6 0 0 0-2-4.5" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3" /></>,
    dots: <><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></>,
    x: <><path d="M6 6l12 12M18 6L6 18" /></>,
    check: <><path d="M5 12.5l4.5 4.5L19 7" /></>,
    trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 19a2 2 0 0 0 3 0" /></>,
    flag: <><path d="M6 21V4M6 4h11l-2 3.5L17 11H6" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
    logout: <><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M10 12h10l-3-3M20 12l-3 3" /></>,
    grip: <><circle cx="9" cy="6" r="1.2" fill="currentColor" /><circle cx="15" cy="6" r="1.2" fill="currentColor" /><circle cx="9" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="12" r="1.2" fill="currentColor" /><circle cx="9" cy="18" r="1.2" fill="currentColor" /><circle cx="15" cy="18" r="1.2" fill="currentColor" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
    sparkle: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  )
}

/* ---------------- avatar ---------------- */

export const Avatar = ({ user, size = 32, ring = true, title }) => {
  if (!user) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full border border-dashed border-white/30 text-white/50"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        title={title ?? 'Unassigned'}
      >
        <Icon name="user" className="w-1/2 h-1/2" />
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm ${
        ring ? 'ring-2 ring-white/25' : ''
      }`}
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}
      title={title ?? user.name}
    >
      {initials(user.name)}
    </span>
  )
}

export const AvatarStack = ({ members = [], max = 3, size = 30 }) => (
  <div className="flex -space-x-2">
    {members.slice(0, max).map((m) => (
      <Avatar key={m.id} user={m} size={size} />
    ))}
    {members.length > max && (
      <span
        className="inline-flex items-center justify-center rounded-full bg-white/15 text-white/80 ring-2 ring-white/25 font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        +{members.length - max}
      </span>
    )}
  </div>
)

/* ---------------- modal ---------------- */

export const Modal = ({ open, onClose, children, title, wide = false }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/55 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`glass w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto thin-scroll`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10 sticky top-0 glass z-10">
          <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- form bits ---------------- */

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-1.5">
      {label}
    </span>
    {children}
    {hint && <span className="block mt-1 text-xs text-white/45">{hint}</span>}
  </label>
)

export const inputClass =
  'w-full rounded-xl bg-white/8 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-brand-500 focus:bg-white/12 focus:ring-2 focus:ring-brand-500/30'

export const Button = ({ variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25',
    ghost: 'bg-white/8 hover:bg-white/14 text-white/85 border border-white/10',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/25',
    subtle: 'text-white/65 hover:text-white hover:bg-white/10',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export const EmptyState = ({ icon = 'sparkle', title, hint, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="mb-4 p-4 rounded-2xl glass-soft text-white/60">
      <Icon name={icon} className="w-7 h-7" />
    </div>
    <p className="font-semibold text-white/85">{title}</p>
    {hint && <p className="mt-1 text-sm text-white/50 max-w-sm">{hint}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)
