'use client'

import { useEffect, useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ShellStatus } from '@/lib/agent-status'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-0'

const BUTTON_LOOK = {
  outline: 'border-control-border text-ink hover:bg-raised',
  accent: 'bg-accent-fill text-white border-transparent hover:bg-accent-fill/90',
  danger: 'border-danger/30 text-danger hover:bg-danger/10',
} as const

export function Button({ children, onClick, disabled, title, variant = 'outline', type = 'button' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string
  variant?: keyof typeof BUTTON_LOOK; type?: 'button' | 'submit'
}) {
  const look = BUTTON_LOOK[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] border text-[14px] transition-colors disabled:opacity-50 ${look} ${focus}`}>
      {children}
    </button>
  )
}

export function IconButton({ label, onClick, children, active }: {
  label: string; onClick?: () => void; children: ReactNode; active?: boolean
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`grid place-items-center w-[34px] h-[34px] rounded-[10px] transition-colors ${active ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink hover:bg-raised'} ${focus}`}>
      {children}
    </button>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="min-w-[18px] px-1.5 rounded-full bg-accent-fill text-white text-[11px] leading-[18px] text-center">{children}</span>
}

const DOT: Record<ShellStatus, string> = {
  'needs-you': 'bg-warn',
  working: 'bg-accent-fill ring-[3px] ring-accent-fill/20',
  idle: 'bg-gray-600',
  asleep: 'bg-gray-700',
  offline: 'bg-gray-700',
}

export function StatusDot({ status }: { status: ShellStatus }) {
  return <span aria-hidden className={`inline-block w-[7px] h-[7px] rounded-full flex-none ${DOT[status]}`} />
}

export function SectionLabel({ children, count, action }: { children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mx-2.5 mt-[18px] mb-1.5 text-[13px] text-ink-muted">
      <span>{children}</span>
      <span className="flex-1 h-px bg-hairline/70" />
      {count !== undefined && <span className="text-[12px] text-gray-500">{count}</span>}
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-hairline rounded-[14px] overflow-hidden ${className}`}>{children}</div>
}

export function Row({ title, description, control, onClick, wrap = false }: {
  title: ReactNode; description?: ReactNode; control?: ReactNode; onClick?: () => void
  /** Let a long description wrap instead of truncating (settings help text) */
  wrap?: boolean
}) {
  const body = (
    <>
      <div className={`min-w-0 ${wrap ? 'flex-1 max-w-[60ch]' : ''}`}>
        <div className="text-[15px] font-medium text-ink truncate">{title}</div>
        {description && <div className={`text-[14px] text-ink-muted mt-0.5 ${wrap ? '' : 'truncate'}`}>{description}</div>}
      </div>
      {control && <div className="ml-auto flex-none">{control}</div>}
    </>
  )
  const cls = 'flex items-center gap-4 px-[22px] py-4 border-t border-hairline/70 first:border-t-0 w-full text-left'
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:bg-raised/50 ${focus}`}>{body}</button>
    : <div className={cls}>{body}</div>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors ${checked ? 'bg-accent-fill' : 'bg-control-off'} ${focus}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full transition-all ${checked ? 'left-[21px] bg-white' : 'left-[3px] bg-sunken'}`} />
    </button>
  )
}

const control = `bg-sunken border border-control-border rounded-[10px] px-3 h-[34px] text-[14px] text-ink placeholder:text-gray-500 disabled:opacity-50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill`

/** Text input in the ink style. `mono` for URLs, paths and keys. */
export function Field({ mono = false, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return <input {...rest} className={`${control} w-[260px] ${mono ? 'font-mono text-[13px]' : ''} ${className}`} />
}

export function NumberField({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...rest} className={`${control} w-[110px] font-mono text-[13px] ${className}`} />
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${control} h-auto py-2 w-full min-h-[80px] resize-y ${className}`} />
}

export function Select({ children, className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select {...rest} className={`${control} appearance-none pr-8 min-w-[160px] cursor-pointer`}>{children}</select>
      <ChevronDown strokeWidth={1.5} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
    </span>
  )
}

export function Checkbox({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 rounded-[4px] accent-accent-fill bg-sunken border-control-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2" />
      <span>
        <span className="block text-[14px] text-ink">{label}</span>
        {description && <span className="block text-[13px] text-ink-muted">{description}</span>}
      </span>
    </label>
  )
}

const NOTICE = {
  success: { icon: CheckCircle2, cls: 'text-ok' },
  error: { icon: AlertCircle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-ink-muted' },
} as const

/** One-line inline result: "Saved", test results, load errors. */
export function Notice({ tone = 'info', children }: { tone?: keyof typeof NOTICE; children: ReactNode }) {
  const { icon: Icon, cls } = NOTICE[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 text-[13px] ${cls}`}>
      <Icon strokeWidth={1.5} className="w-4 h-4 flex-none" /><span>{children}</span>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 px-6 py-12">
      {icon && <div className="text-ink-muted mb-1">{icon}</div>}
      <div className="text-[15px] font-medium text-ink">{title}</div>
      {description && <div className="text-[14px] text-ink-muted max-w-[42ch]">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** Modal card: Escape and backdrop close it, focus moves inside and returns on close. */
export function Dialog({ open, onClose, title, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea') ?? ref.current?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.hasAttribute('disabled'))
        if (items.length === 0) return
        const [a, b] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus() }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); previous?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()} style={{ width }}
        className="max-w-full max-h-[90vh] flex flex-col bg-surface border border-hairline rounded-[14px] overflow-hidden">
        <div className="flex items-center gap-3 px-[22px] h-[56px] border-b border-hairline/70">
          <h2 className="text-[15px] font-medium text-ink">{title}</h2>
          <span className="ml-auto"><IconButton label="Close" onClick={onClose}><X strokeWidth={1.5} className="w-4 h-4" /></IconButton></span>
        </div>
        <div className="flex-1 overflow-y-auto px-[22px] py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-[22px] py-3.5 border-t border-hairline/70">{footer}</div>}
      </div>
    </div>
  )
}

/** Muted label above a card, sentence case (T3 settings style). */
export function GroupLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end gap-3 mt-7 mb-3 first:mt-0">
      <h3 className="text-[15px] font-normal text-gray-400">{children}</h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
