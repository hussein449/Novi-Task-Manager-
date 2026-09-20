import { useEffect } from 'react'
import { initials } from '../lib/utils'

/* ---------------- icons ---------------- */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
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
    share: <><path d="M12 15V4M12 4L8 8M12 4l4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
    dots: <><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
    x: <><path d="M6 6l12 12M18 6L6 18" /></>,
    check: <><path d="M5 12.5l4.5 4.5L19 7" /></>,
    trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 19a2 2 0 0 0 3 0" /></>,
    flag: <><path d="M6 21V4M6 4h11l-2 3.5L17 11H6" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
    logout: <><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M10 12h10l-3-3M20 12l-3 3" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
    pencil: <><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" /></>,
    chevron: <><path d="M9 6l6 6-6 6" /></>,
    grip: <><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></>,
    sparkle: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  )
}

/* ---------------- avatar ---------------- */

export const Avatar = ({ user, size = 32, title }) => {
  if (!user) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3 bg-white"
        style={{ width: size, height: size }}
        title={title ?? 'Unassigned'}
      >
        <Icon name="user" className="w-1/2 h-1/2" />
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.38 }}
      title={title ?? user.name}
    >
      {initials(user.name)}
    </span>
  )
}

export const AvatarStack = ({ members = [], max = 3, size = 28 }) => (
  <div className="flex -space-x-1.5">
    {members.slice(0, max).map((m) => (
      <Avatar key={m.id} user={m} size={size} />
    ))}
    {members.length > max && (
      <span
        className="inline-flex items-center justify-center rounded-full bg-muted text-ink-2 ring-2 ring-white font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        +{members.length - max}
      </span>
    )}
  </div>
)

/* ---------------- modal ---------------- */

export const Modal = ({ open, onClose, children, title, subtitle, wide = false }) => {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-ink/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-surface w-full ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        } rounded-t-2xl sm:rounded-2xl shadow-xl ring-1 ring-line animate-slide-up max-h-[92vh] overflow-y-auto thin-scroll`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line sticky top-0 bg-surface z-10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink truncate">{title}</h2>
            {subtitle && <p className="text-sm text-ink-3 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-1 rounded-lg text-ink-3 hover:text-ink hover:bg-muted transition"
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
    <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block mt-1.5 text-xs text-ink-3">{hint}</span>}
  </label>
)

export const inputClass =
  'w-full rounded-lg bg-surface border border-line-strong px-3 py-2 text-sm text-ink placeholder:text-ink-3 shadow-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

export const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-xs',
    secondary: 'bg-surface hover:bg-muted text-ink border border-line-strong shadow-xs',
    danger: 'bg-surface hover:bg-danger-soft text-danger border border-danger/30',
    ghost: 'text-ink-2 hover:text-ink hover:bg-muted',
  }
  const sizes = { sm: 'px-2.5 py-1.5 text-xs gap-1.5', md: 'px-3.5 py-2 text-sm gap-2' }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-45 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}

export const EmptyState = ({ icon = 'sparkle', title, hint, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="mb-3 grid place-items-center w-11 h-11 rounded-full bg-muted text-ink-3">
      <Icon name={icon} className="w-5 h-5" />
    </div>
    <p className="font-semibold text-ink">{title}</p>
    {hint && <p className="mt-1 text-sm text-ink-3 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export const SectionTitle = ({ children, count, action }) => (
  <div className="flex items-center gap-2 mb-3">
    <h2 className="text-sm font-semibold text-ink">{children}</h2>
    {count !== undefined && (
      <span className="text-xs font-medium text-ink-3 bg-muted rounded-full px-2 py-0.5">{count}</span>
    )}
    {action && <div className="ml-auto">{action}</div>}
  </div>
)
