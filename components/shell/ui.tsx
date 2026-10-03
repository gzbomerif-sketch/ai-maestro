'use client'

import type { ReactNode } from 'react'
import type { ShellStatus } from '@/lib/agent-status'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-0'

export function Button({ children, onClick, disabled, title, variant = 'outline' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string; variant?: 'outline' | 'accent'
}) {
  const look = variant === 'accent'
    ? 'bg-accent-fill text-white border-transparent hover:bg-blue-600'
    : 'border-[rgb(42_42_47)] text-ink hover:bg-raised'
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
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

export function Row({ title, description, control, onClick }: {
  title: ReactNode; description?: ReactNode; control?: ReactNode; onClick?: () => void
}) {
  const body = (
    <>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink truncate">{title}</div>
        {description && <div className="text-[14px] text-ink-muted mt-0.5 truncate">{description}</div>}
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
      className={`relative w-10 h-[22px] rounded-full transition-colors ${checked ? 'bg-accent-fill' : 'bg-[rgb(38_38_43)]'} ${focus}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full transition-all ${checked ? 'left-[21px] bg-white' : 'left-[3px] bg-sunken'}`} />
    </button>
  )
}
