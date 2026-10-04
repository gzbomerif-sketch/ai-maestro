'use client'

import {
  Children, Fragment, isValidElement, useId,
  type ChangeEvent, type OptionHTMLAttributes, type ReactElement, type ReactNode,
  type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ShellStatus } from '@/lib/agent-status'
import { cn } from '@/lib/utils'
import { Dialog as DialogRoot, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select as SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox as CheckboxRoot } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

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

/** On/off switch over shadcn's Switch (Radix: role=switch, Space/Enter, focus ring). */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label}
      className="data-[state=unchecked]:bg-control-off [&>span]:data-[state=checked]:bg-primary-foreground" />
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

type OptionSpec = { value: string; label: ReactNode; disabled?: boolean }

/** <option> children -> items. Looks through fragments; anything else is ignored. */
function optionsOf(children: ReactNode): OptionSpec[] {
  return Children.toArray(children).flatMap((child): OptionSpec[] => {
    if (!isValidElement(child)) return []
    if (child.type === Fragment) return optionsOf((child as ReactElement<{ children?: ReactNode }>).props.children)
    if (child.type !== 'option') return []
    const p = (child as ReactElement<OptionHTMLAttributes<HTMLOptionElement>>).props
    const label = p.children
    return [{ value: String(p.value ?? Children.toArray(label).join('')), label, disabled: p.disabled }]
  })
}

/**
 * Drop-in for a native <select> with <option> children, rendered with shadcn's Select
 * (Radix: styled popup, type-ahead, arrow keys). Same props and the same onChange
 * (e.target.value is the option's value as a string). Native-only attributes beyond
 * id, name, required, disabled, the aria-label family, title, className, value and defaultValue are not forwarded,
 * and an option cannot have an empty-string value (Radix reserves it for "no selection").
 */
export function Select({
  children, className = '', value, defaultValue, onChange, disabled, name, id, required, title,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const asString = (v: unknown) => (v === undefined || Array.isArray(v) ? undefined : String(v))
  const emit = (next: string) =>
    onChange?.({ target: { value: next, name }, currentTarget: { value: next, name } } as unknown as ChangeEvent<HTMLSelectElement>)
  return (
    <span className={`relative inline-flex ${className}`}>
      <SelectRoot value={asString(value)} defaultValue={asString(defaultValue)} onValueChange={emit}
        disabled={disabled} name={name} required={required}>
        <SelectTrigger id={id} title={title} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy}
          className={cn(control, 'w-full min-w-[160px] justify-between gap-2 cursor-pointer data-[placeholder]:text-ink-muted')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[1000]">
          {optionsOf(children).map(o => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
        </SelectContent>
      </SelectRoot>
    </span>
  )
}

/** Checkbox + label over shadcn's Checkbox (Radix); the label text toggles it too. */
export function Checkbox({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 select-none">
      <CheckboxRoot id={id} checked={checked} onCheckedChange={v => onChange(v === true)}
        className="mt-1 rounded-[4px] bg-sunken border-control-border data-[state=checked]:border-primary" />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[14px] text-ink">{label}</span>
        {description && <span className="block text-[13px] text-ink-muted">{description}</span>}
      </label>
    </div>
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

/**
 * Modal card over shadcn's Dialog (Radix): Escape, backdrop click and the corner X close it;
 * focus is trapped inside and returns to where it was on close.
 */
export function Dialog({ open, onClose, title, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number
}) {
  return (
    <DialogRoot open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent aria-describedby={undefined} style={{ width }}
        // [&>button:last-child] is shadcn's built-in close X, moved into the 56px header row
        className="flex flex-col gap-0 p-0 max-w-[calc(100vw-3rem)] max-h-[90vh] overflow-hidden bg-surface border-hairline rounded-[14px] sm:rounded-[14px] shadow-none [&>button:last-child]:right-[18px] [&>button:last-child]:top-[19px]">
        <div className="flex items-center gap-3 px-[22px] h-[56px] flex-none border-b border-hairline/70">
          <DialogTitle className="text-[15px] font-medium leading-normal tracking-normal text-ink">{title}</DialogTitle>
        </div>
        <div className="flex-1 overflow-y-auto px-[22px] py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-[22px] py-3.5 flex-none border-t border-hairline/70">{footer}</div>}
      </DialogContent>
    </DialogRoot>
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
