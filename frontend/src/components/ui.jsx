import { useEffect, useRef } from 'react'

const cx = (...a) => a.filter(Boolean).join(' ')

const variants = {
  primary: 'bg-tank text-foam hover:bg-tank-soft disabled:bg-tank/50',
  danger: 'bg-shell text-white hover:bg-shell-dark disabled:bg-shell/50',
  ghost: 'border border-mist bg-white text-tank hover:bg-mist/50 disabled:opacity-50',
}

export function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

const fieldBase =
  'mt-1 block w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-tank placeholder:text-tank/40 focus:border-kelp'

export function Field({ label, hint, error, children }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {hint && !error && <span className="mt-1 block text-xs font-normal text-tank/60">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-shell-dark">{error}</span>}
    </label>
  )
}

export function TextField({ label, hint, error, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input className={fieldBase} {...props} />
    </Field>
  )
}

export function TextArea({ label, hint, error, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea rows={3} className={fieldBase} {...props} />
    </Field>
  )
}

export function Select({ label, hint, error, children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <select className={fieldBase} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function Spinner({ label = 'Memuat...' }) {
  return (
    <div className="flex items-center gap-3 py-12 text-sm text-tank/70" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-mist border-t-tank" />
      {label}
    </div>
  )
}

export function ErrorNote({ message, onRetry }) {
  return (
    <div className="rounded-md border border-shell/40 bg-white p-4 text-sm">
      <p className="font-semibold text-shell-dark">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Coba lagi
        </button>
      )}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-md border border-dashed border-mist bg-white/60 px-6 py-12 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-tank/70">{children}</div>}
    </div>
  )
}

// Modal memakai elemen <dialog> bawaan browser: Esc dan fokus sudah ditangani.
export function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        'm-auto max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-foam p-0 text-tank backdrop:bg-tank/60',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <button onClick={onClose} aria-label="Tutup" className="-mr-2 -mt-1 rounded p-2 text-tank/60 hover:text-tank">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Hapus', busy, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-tank/80">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Batal</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Memproses...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
