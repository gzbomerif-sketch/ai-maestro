# Components (shared UI primitives and shell panels)

Stack: Next.js 14 (App Router) + React 18 + Tailwind 3.4 + lucide-react (strokeWidth 1.5, w-4 h-4). No CSS modules.
Two primitive layers coexist:
1. **`components/shell/ui.tsx`** — the ink-theme primitives actually used by the command-center shell (Button, IconButton, Badge, StatusDot, SectionLabel, Card, Row, Toggle, Field, NumberField, Textarea, Select, Checkbox, Notice, EmptyState, Dialog, GroupLabel). Prefer these for shell / settings UI.
2. **`components/ui/*`** — shadcn/ui (Radix + cva, `components.json`: style default, baseColor neutral, cssVariables). Only used by ColonyProfileCard, AgentTaskList and marketplace editors. shadcn `accent` is NOT mapped (it is the brand accent here); vendored files use `bg-control-off` / `text-ink` instead.

Colour rule: reference semantic roles (`bg-surface`, `bg-raised`, `bg-sunken`, `border-hairline`, `text-ink`, `text-ink-muted`, `bg-accent-fill`, `text-warn`...) — never hex. See theme.md. Radii used: 10px controls, 12px menus/windows, 14px cards. Type sizes are explicit px (`text-[15px]`, `text-[13px]`).

Sections: A. shell primitives · B. shadcn/ui set · C. shared domain atoms · D. shell panels rendered inside windows · E. feature panels (ChatView, MessageCenter, full source).

## A. Shell primitives

### shell/ui primitives (Button, IconButton, Badge, StatusDot, SectionLabel, Card, Row, Toggle, Field, NumberField, Textarea, Select, Checkbox, Notice, EmptyState, Dialog, GroupLabel)
- Path: `components/shell/ui.tsx`
- Description: All ink-theme primitives in one file. Button variants outline|accent|danger (34px high, 10px radius). Card = bg-surface border-hairline rounded-[14px]. Row = settings row (title/description/control). Dialog = modal with focus trap, Esc/backdrop close.
- Props: Button{variant,onClick,disabled,title,type}; IconButton{label,active,onClick}; Badge{children}; StatusDot{status: needs-you|working|idle|asleep|offline}; SectionLabel{count,action}; Card{className}; Row{title,description,control,onClick,wrap}; Toggle{checked,onChange,label}; Field{mono}; Select; Checkbox{checked,onChange,label,description}; Notice{tone: success|error|info}; EmptyState{icon,title,description,action}; Dialog{open,onClose,title,footer,width}; GroupLabel{action}

```tsx
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
        className="mt-1 w-4 h-4 rounded-[4px] accent-accent-fill bg-sunken border-control-border" />
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
```

## B. shadcn/ui set (`components/ui/`)

### Button / buttonVariants
- Path: `components/ui/button.tsx`
- Description: cva button, variants default|destructive|outline|secondary|ghost|link, sizes default|sm|lg|icon, asChild via Radix Slot.
- Props: variant,size,asChild

```tsx
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-control-off hover:text-ink",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-control-off hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Checkbox
- Path: `components/ui/checkbox.tsx`
- Description: Radix checkbox.
- Props: checked,onCheckedChange

```tsx
"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
```

### Command (cmdk)
- Path: `components/ui/command.tsx`
- Description: cmdk command palette primitives (Command, CommandInput, CommandList, CommandItem, CommandDialog...).

```tsx
"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-control-off data-[selected=true]:text-ink data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
```

### Dialog (Radix)
- Path: `components/ui/dialog.tsx`
- Description: Radix dialog primitives (Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle...).
- Props: open,onOpenChange

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-control-off data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

### DropdownMenu
- Path: `components/ui/dropdown-menu.tsx`
- Description: Radix dropdown menu primitives.

```tsx
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-control-off data-[state=open]:bg-control-off [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-control-off focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-control-off focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-control-off focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
```

### Popover
- Path: `components/ui/popover.tsx`
- Description: Radix popover.

```tsx
"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
```

### ScrollArea
- Path: `components/ui/scroll-area.tsx`
- Description: Radix scroll area with styled scrollbar.

```tsx
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
```

### Select
- Path: `components/ui/select.tsx`
- Description: Radix select primitives (Select, SelectTrigger, SelectContent, SelectItem...).
- Props: value,onValueChange

```tsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-control-off focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
```

### Switch
- Path: `components/ui/switch.tsx`
- Description: Radix switch.
- Props: checked,onCheckedChange

```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

### Tabs
- Path: `components/ui/tabs.tsx`
- Description: Radix tabs (Tabs, TabsList, TabsTrigger, TabsContent).
- Props: value,onValueChange

```tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

### Tooltip
- Path: `components/ui/tooltip.tsx`
- Description: Radix tooltip (TooltipProvider, Tooltip, TooltipTrigger, TooltipContent).

```tsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

### cn() helper
- Path: `lib/utils.ts`
- Description: clsx + tailwind-merge class combiner used by shadcn files and FloatingWindow.

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function formatDistanceToNow(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return past.toLocaleDateString()
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
```

## C. Shared domain atoms

### AgentAvatar
- Path: `components/AgentAvatar.tsx`
- Description: Single avatar for every surface: portrait image, emoji, or hash-coloured initial; optional live status dot.
- Props: agent, size: xs(20)|sm(28)|md(40)|lg(64), showStatus, className

```tsx
'use client'

import { useState } from 'react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import type { AgentPresence } from '@/lib/agent-presence'
import { isHibernated, type ShellStatus } from '@/lib/agent-status'
import { hashColor } from '@/lib/agent-colors'
import { resolveAvatar, type AvatarSubject } from '@/lib/avatar-resolve'
import { StatusDot } from '@/components/shell/ui'

export { resolveAvatar } from '@/lib/avatar-resolve'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 40, lg: 64 }

export type AgentAvatarSubject = Agent | (AvatarSubject & { id: string })

export interface AgentAvatarProps {
  agent: AgentAvatarSubject | null
  size?: AvatarSize
  /** Status dot from presenceOf(agent). Only honoured when a full Agent is given. */
  showStatus?: boolean
  className?: string
}

function isFullAgent(agent: AgentAvatarSubject | null): agent is Agent {
  return !!agent && Array.isArray((agent as Agent).sessions)
}

/** presenceOf's vocabulary → the shell's status-dot vocabulary (one mapping, incl. the asleep case). */
export function shellStatusFor(agent: Agent, presence: AgentPresence): ShellStatus {
  if (presence === 'ready') return 'idle'
  if (presence === 'offline') return isHibernated(agent) ? 'asleep' : 'offline'
  return presence
}

/** Subscribes to session activity only when a status dot is actually shown. */
function AvatarStatus({ agent, px }: { agent: Agent; px: number }) {
  const { presenceOf } = useSessionActivity()
  const status = shellStatusFor(agent, presenceOf(agent))
  const offset = Math.max(0, Math.round(px * 0.04))
  return (
    <span
      className="absolute rounded-full bg-surface p-[2px] leading-none"
      style={{ right: -offset, bottom: -offset }}
    >
      <StatusDot status={status} />
    </span>
  )
}

/**
 * One avatar for every surface: portrait image, emoji, or a hash-coloured
 * initial. Resolution is lib/avatar-resolve.ts; this only draws the result.
 */
export function AgentAvatar({ agent, size = 'md', showStatus = false, className = '' }: AgentAvatarProps) {
  const px = PX[size]
  const resolved = resolveAvatar(agent)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  // A portrait that fails to load degrades to the initial rather than a broken icon.
  const view = resolved.kind === 'image' && failedSrc === resolved.src
    ? resolveAvatar({ name: agent?.name, label: agent?.label })
    : resolved

  const color = hashColor(agent?.label || agent?.name || agent?.id || '?')
  const label = agent?.label || agent?.name

  return (
    <span
      className={`relative inline-flex flex-none ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={label ? `${label} avatar` : 'Agent avatar'}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full select-none"
        style={view.kind === 'initial' ? { backgroundColor: color.active, color: color.activeText } : undefined}
      >
        {view.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(view.src)}
          />
        )}
        {view.kind === 'emoji' && (
          <span className="bg-raised flex h-full w-full items-center justify-center" style={{ fontSize: px * 0.55, lineHeight: 1 }}>
            {view.emoji}
          </span>
        )}
        {view.kind === 'initial' && (
          <span className="font-medium" style={{ fontSize: px * 0.45, lineHeight: 1 }}>{view.initial}</span>
        )}
      </span>
      {showStatus && isFullAgent(agent) && <AvatarStatus agent={agent} px={px} />}
    </span>
  )
}

export default AgentAvatar
```

### AgentTaskList
- Path: `components/tasks/AgentTaskList.tsx`
- Description: Per-agent task list with quick-add, checkbox toggle, priority/status selects (compact = card variant).
- Props: agentId: string|null, compact?: boolean

```tsx
'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Field, Textarea } from '@/components/shell/ui'
import type { TaskStatus } from '@/types/task'
import {
  useAgentTasks, isTeamTask, normalizeSubject, orderTasks, type AgentTaskView, type AgentTaskPatch,
} from '@/hooks/useAgentTasks'

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

const PRIORITIES: { value: number; label: string }[] = [
  { value: 0, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Low' },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'pending', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Done' },
]

/** Select value for a priority; '' shows the placeholder (the API cannot unset a priority). */
export function priorityValue(p: number | undefined): string {
  return typeof p === 'number' ? String(p) : ''
}

export function priorityFromValue(v: string): number | undefined {
  if (v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** The draft to show: local edits win while dirty, otherwise follow the server value. */
export function nextDescDraft(current: string, remote: string, dirty: boolean): string {
  return dirty ? current : remote
}

/** Only an edited draft that differs from the server value is worth a PATCH. */
export function shouldSaveDescription(dirty: boolean, draft: string, remote: string): boolean {
  return dirty && draft !== remote
}

// Menus portal to <body>; floating windows sit at z-index 10 + stack position
const POPUP_Z = 'z-[1000]'

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function TaskRow({ task, compact, onToggle, onUpdate, onRemove }: {
  task: AgentTaskView
  compact: boolean
  onToggle: (t: AgentTaskView) => void
  onUpdate: (id: string, patch: AgentTaskPatch) => Promise<boolean>
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState(task.description ?? '')
  const [dirty, setDirty] = useState(false)
  const remoteDesc = task.description ?? ''

  // Poll-delivered (or rolled-back) descriptions replace the draft unless the user is mid-edit
  useEffect(() => { setDesc(d => nextDescDraft(d, remoteDesc, dirty)) }, [remoteDesc, dirty])

  const saveDescription = async () => {
    if (!shouldSaveDescription(dirty, desc, remoteDesc)) { setDirty(false); return }
    const ok = await onUpdate(task.id, { description: desc })
    // Success: server value now equals the draft. Failure: the task reverted, so drop the rejected text too.
    setDirty(false)
    if (!ok) setDesc(remoteDesc)
  }
  const team = isTeamTask(task)
  const done = task.status === 'completed'
  const expandable = !compact
  const canMutate = !team

  const label = (
    <span className={`min-w-0 flex-1 truncate text-[14px] ${done ? 'line-through text-ink-muted' : 'text-ink'}`} title={task.subject}>
      {task.subject}
    </span>
  )

  const checkbox = (
    <Checkbox
      checked={done}
      disabled={team}
      onCheckedChange={() => onToggle(task)}
      aria-label={`${done ? 'Reopen' : 'Complete'} ${task.subject}`}
    />
  )

  return (
    <li className="border-b border-hairline/60 last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2 group">
        {team ? (
          <Tooltip>
            {/* span wrapper: a disabled button does not fire pointer events */}
            <TooltipTrigger asChild><span className="grid place-items-center" tabIndex={0}>{checkbox}</span></TooltipTrigger>
            <TooltipContent className={POPUP_Z}>Managed on the team kanban</TooltipContent>
          </Tooltip>
        ) : checkbox}
        {label}
        {team && (
          <span className="shrink-0 rounded-full border border-hairline px-1.5 text-[11px] leading-[18px] text-ink-muted">team</span>
        )}
        {expandable && canMutate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Task actions for ${task.subject}`}
                className="grid place-items-center w-6 h-6 rounded-md text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={POPUP_Z}>
              <DropdownMenuItem onSelect={() => onRemove(task.id)} className="text-danger focus:text-danger">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {expandable && (
          <button type="button" aria-label={open ? 'Collapse task' : 'Expand task'} aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="grid place-items-center w-6 h-6 rounded-md text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {expandable && open && (
        <div className="px-4 pb-3 pl-10 flex flex-col gap-2">
          {team ? (
            <p className="text-[13px] text-ink-muted whitespace-pre-wrap">{task.description || 'No description.'}</p>
          ) : (
            <Textarea
              value={desc}
              placeholder="Description"
              aria-label="Description"
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              onBlur={() => void saveDescription()}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={task.status} disabled={team} onValueChange={v => onUpdate(task.id, { status: v as TaskStatus })}>
              <SelectTrigger aria-label="Status" className="h-8 w-[140px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent className={POPUP_Z}>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityValue(task.priority)} disabled={team}
              onValueChange={v => { const p = priorityFromValue(v); if (p !== undefined) onUpdate(task.id, { priority: p }) }}>
              <SelectTrigger aria-label="Priority" className="h-8 w-[140px] text-[13px]"><SelectValue placeholder="No priority" /></SelectTrigger>
              <SelectContent className={POPUP_Z}>
                {typeof task.priority === 'number' && !PRIORITIES.some(p => p.value === task.priority) && (
                  <SelectItem value={String(task.priority)}>Priority {task.priority}</SelectItem>
                )}
                {PRIORITIES.map(p => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/**
 * One agent's tasks: personal todos (editable) plus team tasks assigned to it
 * (read-only here, they live on the team kanban). `compact` is the profile
 * card variant: quick-add and checkboxes only.
 */
export default function AgentTaskList({ agentId, compact = false }: { agentId: string | null; compact?: boolean }) {
  const { tasks, loading, add, toggle, update, remove } = useAgentTasks(agentId)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Runs a mutation, surfacing failures; resolves true when it succeeded. */
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setError(null)
    try { await fn(); return true } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); return false }
  }

  const submit = () => {
    const subject = normalizeSubject(draft)
    if (!subject) return
    setDraft('')
    void run(async () => {
      try { await add(subject) } catch (e) { setDraft(subject); throw e }
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
  }

  const ordered = orderTasks(tasks)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col">
        <div className="px-4 py-2">
          <Field
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!agentId}
            placeholder="Add a task and press Enter"
            aria-label="Add a task"
            className="w-full"
          />
        </div>
        {error && <p role="alert" className="px-4 pb-1 text-[13px] text-danger">{error}</p>}
        {ordered.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-ink-muted">{loading ? 'Loading tasks…' : 'No tasks yet.'}</p>
        ) : (
          <ul>
            {ordered.map(t => (
              <TaskRow
                key={`${t.source}:${t.id}`}
                task={t}
                compact={compact}
                onToggle={task => void run(() => toggle(task))}
                onUpdate={(id, patch) => run(() => update(id, patch))}
                onRemove={id => void run(() => remove(id))}
              />
            ))}
          </ul>
        )}
      </div>
    </TooltipProvider>
  )
}
```

## D. Shell panels (rendered inside floating windows / overlays)

### AgentTabContent
- Path: `components/shell/AgentTabContent.tsx`
- Description: Per-agent tab bodies (terminal, chat, messages, worktree, graph, memory, docs...). In the shell it is the base layer with chat (`chatVariant="ink"`, `hideHeaders`).
- Props: agent, activeTab, setActiveTab, onlineAgents, wakingAgentId, onWake, onShowProfile, hideHeaders, chatVariant

```tsx
'use client'

import dynamic from 'next/dynamic'
import TerminalView from '@/components/TerminalView'
import ChatView from '@/components/ChatView'
import StreamingChatView from '@/components/StreamingChatView'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import WorkTree from '@/components/WorkTree'
import AgentSearch from '@/components/AgentSearch'
import TranscriptExport from '@/components/TranscriptExport'
import AgentPlayback from '@/components/AgentPlayback'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import { isHibernated as isAgentHibernated } from '@/lib/agent-status'
import { Terminal, Moon, Power, Loader2, Zap } from 'lucide-react'
import type { Agent } from '@/types/agent'

const MemoryViewer = dynamic(() => import('@/components/MemoryViewer'), { ssr: false })
const AgentGraph = dynamic(() => import('@/components/AgentGraph'), { ssr: false })
const DocumentationPanel = dynamic(() => import('@/components/DocumentationPanel'), { ssr: false })
const CanvasPanel = dynamic(() => import('@/components/CanvasPanel'), { ssr: false })

export type AgentTab = 'terminal' | 'chat' | 'streaming' | 'messages' | 'worktree' | 'graph' | 'memory' | 'docs' | 'canvas' | 'search' | 'export' | 'playback'

export interface AgentTabContentProps {
  agent: Agent
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onShowProfile: (agent: Agent) => void
  hideHeaders?: boolean
  chatVariant?: 'classic' | 'ink'
}

/** The per-agent tab panels, shared by the classic layout and the command-center shell. */
export default function AgentTabContent({
  agent, activeTab, setActiveTab, onlineAgents, wakingAgentId, onWake, onShowProfile,
  hideHeaders = false, chatVariant = 'classic',
}: AgentTabContentProps) {
  const isActive = true
  const isHibernated = isAgentHibernated(agent)
  const session = agentToSession(agent)
  const agentMode = getRuntimeMode(agent.id)
  const handleWakeAgent = onWake
  const handleShowAgentProfile = onShowProfile

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {activeTab === 'terminal' ? (
        agentMode === 'streaming' ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-900/30 flex items-center justify-center">
                <Zap className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-2 text-gray-500">Terminal is disabled while this agent runs in streaming mode</p>
              <p className="text-xs text-gray-600 mb-4">Use the Streaming tab. To get the terminal back, hibernate and wake the agent in Terminal mode.</p>
              <button
                onClick={() => setActiveTab('streaming')}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-all flex items-center gap-2 mx-auto"
              >
                <Zap className="w-4 h-4" /> Go to Streaming
              </button>
            </div>
          </div>
        ) : isHibernated ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-900/30 flex items-center justify-center">
                <Moon className="w-10 h-10 text-yellow-500" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-4 text-gray-500">This agent is hibernating</p>
              <button
                onClick={() => handleWakeAgent(agent)}
                disabled={wakingAgentId === agent.id}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {wakingAgentId === agent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waking...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Wake Agent
                  </>
                )}
              </button>
            </div>
          </div>
        ) : session.standalone ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-900/30 flex items-center justify-center">
                <Terminal className="w-10 h-10 text-violet-400" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-2 text-gray-500">Standalone Agent</p>
              <p className="text-xs text-gray-600 mb-4">This agent is running outside tmux (plain terminal, API-only, or remote host). No terminal view available.</p>
              <button
                onClick={() => handleShowAgentProfile(agent)}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                View Profile
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary fallbackLabel="Terminal">
            <TerminalView hideHeader={hideHeaders} session={session} isVisible={isActive && activeTab === 'terminal'} avatar={{ src: agent.avatar, hostUrl: getAgentBaseUrl(agent) }} />
          </ErrorBoundary>
        )
      ) : !isActive ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : activeTab === 'chat' ? (
        isHibernated ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-900/30 flex items-center justify-center">
                <Moon className="w-10 h-10 text-yellow-500" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-4 text-gray-500">Wake this agent to use the chat interface</p>
              <button
                onClick={() => handleWakeAgent(agent)}
                disabled={wakingAgentId === agent.id}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {wakingAgentId === agent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waking...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Wake Agent
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary fallbackLabel="Chat">
            <ChatView agent={agent} isActive={true} hideHeader={hideHeaders} variant={chatVariant} />
          </ErrorBoundary>
        )
      ) : activeTab === 'streaming' ? (
        // Streaming is self-sufficient: the SDK session spawns on
        // connect and resumes the agent's latest conversation —
        // no tmux/wake needed, works even when tmux-hibernated.
        <ErrorBoundary fallbackLabel="Streaming">
          <StreamingChatView agent={agent} isActive={true} hideHeader={hideHeaders} />
        </ErrorBoundary>
      ) : activeTab === 'messages' ? (
        <ErrorBoundary fallbackLabel="Messages">
          <MessageCenter
            sessionName={session.id}
            agentId={agent.id}
            allAgents={onlineAgents.map(a => ({
              id: a.id,
              name: a.name || a.alias || a.id,  // Technical name for lookups
              alias: a.label || a.name || a.alias || a.id,  // Display name for UI
              tmuxSessionName: a.session?.tmuxSessionName,
              hostId: a.hostId,
              avatar: a.avatar
            }))}
            hostUrl={getAgentBaseUrl(agent)}
            isActive={true}
          />
        </ErrorBoundary>
      ) : activeTab === 'worktree' ? (
        <WorkTree
          sessionName={session.id}
          agentId={agent.id}
          agentAlias={agent.alias}
          hostId={agent.hostId}
          isActive={true}
        />
      ) : activeTab === 'graph' ? (
        <AgentGraph
          sessionName={session.id}
          agentId={agent.id}
          workingDirectory={session.workingDirectory}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'memory' ? (
        <MemoryViewer
          agentId={agent.id}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'docs' ? (
        <DocumentationPanel
          sessionName={session.id}
          agentId={agent.id}
          workingDirectory={session.workingDirectory}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'canvas' ? (
        <CanvasPanel
          agentId={agent.id}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'search' ? (
        <div className="flex-1 overflow-auto p-4">
          <AgentSearch
            agentId={agent.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : activeTab === 'playback' ? (
        <div className="flex-1 overflow-auto p-4">
          <AgentPlayback
            agentId={agent.id}
            sessionId={session.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : activeTab === 'export' ? (
        <div className="flex-1 overflow-auto p-4">
          <TranscriptExport
            agentId={agent.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : null}
    </div>
  )
}
```

### PanelBody
- Path: `components/shell/PanelBody.tsx`
- Description: renderTool(tool, ctx): maps a window tool id (inbox, tasks, skills, files, memory, browser, colony, ...) to its component.
- Props: ToolEnv/ToolContext

```tsx
'use client'

import type { ReactNode } from 'react'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { AgentSkillEditor } from '@/components/marketplace'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import type { PanelType } from '@/lib/panel-layout'
import type { WindowTool } from '@/lib/window-manager'
import AgentTabContent, { type AgentTab } from './AgentTabContent'
import BrowserPanel from './BrowserPanel'
import ColonyPanel from './ColonyPanel'
import { renderTeamTool, type TeamToolData } from './TeamTools'
import AgentTaskList from '@/components/tasks/AgentTaskList'

const TAB_FOR: Record<Exclude<PanelType, 'inbox' | 'browser' | 'colony'>, AgentTab> = {
  terminal: 'terminal', files: 'worktree', memory: 'memory', graph: 'graph', docs: 'docs',
  canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}

/** Same recipient shape the classic Messages tab passes to MessageCenter. */
function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,
    alias: a.label || a.name || a.alias || a.id,
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
    avatar: a.avatar,
  }))
}

/** What every tool needs from the shell, whatever the workspace. */
export interface ToolEnv {
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  /** The window is minimized: still mounted (terminals keep their size and scrollback), just hidden */
  minimized: boolean
  /** The window's stack position (ManagedWindow.z); the colony frame mirrors it */
  z: number
}

export interface ToolContext extends ToolEnv {
  /** The selected agent (agent workspace) */
  agent: Agent | null
  /** Present in a team workspace; its tools come from lib/team-panels */
  team?: TeamToolData
}

/** One tool's content inside its floating window. Every window's content comes through here. */
export function renderTool(tool: WindowTool, ctx: ToolContext): ReactNode {
  if (ctx.team) return renderTeamTool(tool, ctx.team, ctx)
  const { agent } = ctx
  if (!agent) return null
  if (tool === 'browser') return <BrowserPanel />
  if (tool === 'colony') return <ColonyPanel hidden={ctx.minimized} z={ctx.z} />
  if (tool === 'tasks') {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-sunken">
        <AgentTaskList agentId={agent.id} />
      </div>
    )
  }
  if (tool === 'skills') {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-sunken p-4">
        <AgentSkillEditor agentId={agent.id} hostUrl={getAgentBaseUrl(agent)} />
      </div>
    )
  }
  if (tool === 'inbox') {
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter sessionName={agentToSession(agent).id} agentId={agent.id} allAgents={toRecipients(ctx.onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)} isActive={true} compact />
        </ErrorBoundary>
      </div>
    )
  }
  const tab = TAB_FOR[tool as keyof typeof TAB_FOR]
  if (!tab) return null
  return (
    <AgentTabContent agent={agent} activeTab={tab} setActiveTab={() => {}} onlineAgents={ctx.onlineAgents}
      wakingAgentId={ctx.wakingAgentId} onWake={ctx.onWake} onShowProfile={ctx.onShowProfile} hideHeaders chatVariant="ink" />
  )
}
```

### ColonyPanel
- Path: `components/shell/ColonyPanel.tsx`
- Description: Body of the Colony window: slot div the persistent colony iframe pins itself over, plus empty/error states and the profile card.
- Props: hidden, z

```tsx
'use client'

import { useContext, useEffect, useRef } from 'react'
import { Orbit, RotateCw, ExternalLink } from 'lucide-react'
import { useColony } from './ColonyHost'
import ColonyProfileCard, { ColonyCardEnvContext, resolveColonySelection } from './ColonyProfileCard'
import { Button, EmptyState, IconButton } from './ui'

/**
 * The Colony window's body, in the agent and team workspaces alike: an empty slot the
 * persistent colony iframe (ColonyHost) pins itself over, plus the explain-yourself states
 * when there is nothing to show. `z` is this window's stack position, mirrored onto the frame. The iframe itself never mounts here — see ColonyHost.
 */
export default function ColonyPanel({ hidden = false, z = 0 }: { hidden?: boolean; z?: number } = {}) {
  const { setSlot, status, local, reload, selectedColonyAgentId, clearColonySelection } = useColony()
  const cardEnv = useContext(ColonyCardEnvContext)
  const slotRef = useRef<HTMLDivElement>(null)
  const showing = local && !!status?.running && !!status.url
  const { agent: selected, stale } = resolveColonySelection(cardEnv?.agents ?? [], cardEnv ? selectedColonyAgentId : null)
  // A bot this host does not know (removed, or from another host) shows nothing, and the selection is dropped
  useEffect(() => { if (stale) clearColonySelection() }, [stale, clearColonySelection])
  // Closing the window must not leave a selection that pops the card back open next time
  useEffect(() => clearColonySelection, [clearColonySelection])

  // A minimized window stays mounted but must release the slot, or the frame would keep floating over the chat
  useEffect(() => {
    if (!showing || hidden) return
    setSlot(slotRef.current, z)
    return () => setSlot(null)
  }, [setSlot, showing, hidden, z])

  if (!status) return <div className="flex-1 min-h-0 bg-sunken" aria-busy="true" />

  if (!local) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-sunken">
        <EmptyState
          icon={<Orbit strokeWidth={1.5} className="w-6 h-6" />}
          title="Colony is only on the host machine"
          description="Bot Crossing runs on the computer that hosts AI Maestro. Open AI Maestro there, at localhost, to see the colony."
        />
      </div>
    )
  }

  if (!showing) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-sunken">
        <EmptyState
          icon={<Orbit strokeWidth={1.5} className="w-6 h-6" />}
          title={status.enabled ? 'Colony isn’t running' : 'Colony is off'}
          description={status.reason ?? 'Bot Crossing has not started yet.'}
          action={
            <div className="flex flex-col items-center gap-3 max-w-full">
              {status.fix && (
                <code className="block max-w-full whitespace-pre-wrap break-all rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[12px] text-ink">
                  {status.fix}
                </code>
              )}
              {status.log.length > 0 && (
                <pre className="max-w-full max-h-[160px] overflow-auto rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[11px] text-ink-muted">
                  {status.log.slice(-8).join('\n')}
                </pre>
              )}
              <Button onClick={reload}>Check again</Button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sunken">
      <div className="flex-1 min-h-0 flex">
        <div ref={slotRef} className="flex-1 min-w-0" />
        {/* The colony frame is pinned over the slot above the whole shell (see ColonyHost), so the card
            is a sibling column the slot yields to, not an overlay it would hide behind. */}
        {selected && cardEnv && (
          <div className="flex-none w-[min(24rem,45%)] min-h-0">
            <ColonyProfileCard key={selected.id} agent={selected} env={cardEnv} hidden={hidden} onClose={clearColonySelection} />
          </div>
        )}
      </div>
      <div className="flex-none flex items-center gap-2 pl-3 pr-1 h-[38px] border-t border-hairline/70 text-[12px] text-gray-500">
        <span className="truncate">Based on Bot Crossing. Click a bot, then Open, to go to that agent.</span>
        <span className="ml-auto flex items-center">
          <IconButton label="Reload colony" onClick={reload}>
            <RotateCw strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
          <IconButton label="Open colony in a new tab" onClick={() => status.url && window.open(status.url, '_blank', 'noopener,noreferrer')}>
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
        </span>
      </div>
    </div>
  )
}
```

### ColonyHost
- Path: `components/shell/ColonyHost.tsx`
- Description: Provider that owns the single live Colony iframe fixed at the shell root; exposes useColony().
- Props: agents, onSelectAgent, children

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Agent } from '@/types/agent'
import {
  COLONY_REFRESH, colonyFrameUrl, colonyReachableFrom, findAgent, nextColonyStatus, originOf,
  parseColonyEvent, shouldShowColony, type ColonyStatus,
} from '@/lib/colony-message'
import { BROWSER_SANDBOX } from './BrowserPanel'

/** Status is re-read on this interval so a colony that dies, or finishes starting, shows up. */
const STATUS_POLL_MS = 4000

export interface ColonyContextValue {
  /** A Colony tab's body registers its placeholder here; the host pins the live iframe over it. */
  setSlot: (el: HTMLElement | null, z?: number) => void
  status: ColonyStatus | null
  /** True when this page runs on the machine that hosts the colony (it binds to localhost). */
  local: boolean
  /** Reload the iframe and re-read the status now. */
  reload: () => void
  /** The agent whose bot was last selected in the colony, or null. A newer selection replaces it. */
  selectedColonyAgentId: string | null
  clearColonySelection: () => void
}

const ColonyContext = createContext<ColonyContextValue | null>(null)

export function useColony(): ColonyContextValue {
  const v = useContext(ColonyContext)
  if (!v) throw new Error('useColony needs <ColonyHost> above it')
  return v
}

/**
 * The one live colony. The iframe lives HERE, fixed at the shell root, and is only ever
 * repositioned over whichever Colony tab is open — agent dock or team workspace. Moving an
 * iframe in the DOM reloads it, which is exactly the camera-resetting bug this exists to fix,
 * so the tabs render an empty slot div (ColonyPanel) and never the frame itself. Only one
 * Colony surface exists at a time: the shell shows either the agent dock or a team's.
 */
export default function ColonyHost({ agents, onSelectAgent, children }: {
  agents: Agent[]
  onSelectAgent: (a: Agent) => void
  children: ReactNode
}) {
  const [status, setStatus] = useState<ColonyStatus | null>(null)
  const [nonce, setNonce] = useState(0)
  const [slot, setSlotState] = useState<HTMLElement | null>(null)
  // The colony window's z (ManagedWindow.z): the frame stacks exactly like the window it covers
  const [slotZ, setSlotZ] = useState(0)
  const [selectedColonyAgentId, setSelectedColonyAgentId] = useState<string | null>(null)
  // Lazy-boot gate: the game loads on the first opened Colony tab, never in a session that
  // has not looked at it, and then stays alive for every later tab.
  const [everShown, setEverShown] = useState(false)
  const [pageOrigin, setPageOrigin] = useState<{ hostname: string; origin: string } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // window is read in an effect so the server render of this client component stays safe
  useEffect(() => { setPageOrigin({ hostname: window.location.hostname, origin: window.location.origin }) }, [])

  // Status poll: same cadence and same-object dedupe the dock panel used before it moved
  // here, folded through nextColonyStatus so one failed fetch cannot unmount the colony.
  useEffect(() => {
    let alive = true
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      let fetched: ColonyStatus | null = null
      try {
        const res = await fetch('/api/colony/status', { cache: 'no-store' })
        if (res.ok) fetched = await res.json() as ColonyStatus
      } catch { /* counted below */ }
      if (!alive) return
      setStatus(prev => {
        const next = nextColonyStatus(prev, fetched, failures)
        failures = next.failures
        return JSON.stringify(prev) === JSON.stringify(next.status) ? prev : next.status
      })
      timer = setTimeout(load, STATUS_POLL_MS)
    }
    void load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [nonce])

  const local = pageOrigin !== null && colonyReachableFrom(pageOrigin.hostname)
  const colonyOrigin = originOf(status?.running ? status.url : null)

  // Colony → host: Open on a bot selects that agent, whichever view the user is in; merely
  // selecting a bot is exposed as selectedColonyAgentId for whoever wants to follow along.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const ev = parseColonyEvent(event, colonyOrigin)
      if (!ev) return
      if (ev.kind === 'select') { setSelectedColonyAgentId(ev.agentId); return }
      const agent = findAgent(agents, ev.agentId)
      if (agent) onSelectAgent(agent)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [agents, colonyOrigin, onSelectAgent])

  // Host → colony: whoever just changed the agents (the creation wizard) dispatches this
  // event, and the colony rescans at once instead of waiting out its 15 s poll.
  useEffect(() => {
    const onRefresh = () => {
      if (colonyOrigin) iframeRef.current?.contentWindow?.postMessage({ type: COLONY_REFRESH }, colonyOrigin)
    }
    window.addEventListener('aimaestro:colony-refresh', onRefresh)
    return () => window.removeEventListener('aimaestro:colony-refresh', onRefresh)
  }, [colonyOrigin])

  // Pin the frame to the slot. rAF rather than observers: one rect read per frame follows
  // panel drags, maximize and window resizes alike, and stops when no slot is mounted.
  const showing = !!slot && shouldShowColony(everShown, local, status)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    if (!showing || !slot) {
      wrapper.style.visibility = 'hidden'
      wrapper.style.pointerEvents = 'none'
      return
    }
    let raf = 0
    const tick = () => {
      const r = slot.getBoundingClientRect()
      wrapper.style.transform = `translate(${r.left}px, ${r.top}px)`
      wrapper.style.width = `${r.width}px`
      wrapper.style.height = `${r.height}px`
      wrapper.style.visibility = 'visible'
      wrapper.style.pointerEvents = 'auto'
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [showing, slot])

  const setSlot = useCallback((el: HTMLElement | null, z = 0) => {
    if (el) { setEverShown(true); setSlotZ(z) }
    setSlotState(el)
  }, [])
  const reload = useCallback(() => setNonce(n => n + 1), [])
  const clearColonySelection = useCallback(() => setSelectedColonyAgentId(null), [])

  const src = shouldShowColony(everShown, local, status) && status?.url && pageOrigin
    ? colonyFrameUrl(status.url, pageOrigin.origin) : null

  return (
    <ColonyContext.Provider value={{ setSlot, status, local, reload, selectedColonyAgentId, clearColonySelection }}>
      {children}
      {/* zIndex 10 + z mirrors FloatingWindow, so windows above the colony window cover the frame too */}
      <div ref={wrapperRef} className="fixed left-0 top-0" style={{ visibility: 'hidden', pointerEvents: 'none', zIndex: 10 + slotZ }}>
        {src && (
          <iframe key={`${src}#${nonce}`} ref={iframeRef} src={src} title="Colony" sandbox={BROWSER_SANDBOX}
            allow="clipboard-write" referrerPolicy="no-referrer" className="w-full h-full border-0 bg-sunken" />
        )}
      </div>
    </ColonyContext.Provider>
  )
}
```

### ColonyProfileCard
- Path: `components/shell/ColonyProfileCard.tsx`
- Description: Bot profile card shown inside the Colony window (avatar, status, details, tasks, inline edit, actions).
- Props: agent, env: ColonyCardEnv, hidden, onClose

```tsx
'use client'

import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquarePlus, Pencil, SquareTerminal, Sparkles, LayoutDashboard, X } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { PRESENCE_STYLE } from '@/lib/agent-presence'
import { displayName } from '@/lib/agent-status'
import { isEditableTarget } from '@/lib/panel-layout'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { Button as ActionButton } from '@/components/ui/button'
import AgentAvatar, { shellStatusFor } from '@/components/AgentAvatar'
import AvatarPicker from '@/components/AvatarPicker'
import AgentTaskList from '@/components/tasks/AgentTaskList'
import { Badge, Button, Field, IconButton, Notice, StatusDot, Textarea } from './ui'

// ── Pure helpers (tested in tests/colony-profile-card.test.ts) ─────────────────────────────

/** The selected colony agent, or `stale` when the colony named one this host does not know (removed, or on another host). */
export function resolveColonySelection(agents: Agent[], id: string | null): { agent: Agent | null; stale: boolean } {
  if (!id) return { agent: null, stale: false }
  const agent = agents.find(a => a.id === id) ?? null
  return { agent, stale: agent === null }
}

export interface ProfileDraft {
  label: string
  taskDescription: string
  /** Comma-separated */
  tags: string
  avatar: string
}

export function draftOf(agent: Agent): ProfileDraft {
  return {
    label: agent.label ?? '',
    taskDescription: agent.taskDescription ?? '',
    tags: (agent.tags ?? []).join(', '),
    avatar: agent.avatar ?? '',
  }
}

/** "a, b,, a " → ['a', 'b']: trimmed, no blanks, first occurrence wins. */
export function parseTagsCsv(csv: string): string[] {
  const seen = new Set<string>()
  for (const raw of csv.split(',')) {
    const t = raw.trim()
    if (t) seen.add(t)
  }
  return [...seen]
}

export interface ProfilePatch {
  label?: string
  taskDescription?: string
  tags?: string[]
  avatar?: string
}

/**
 * Only what the user changed, or null when nothing changed. A blank label is left out on purpose: it is a
 * guard against clearing a label by accident (the API would accept it), not an API limitation.
 */
export function buildProfilePatch(agent: Agent, draft: ProfileDraft): ProfilePatch | null {
  const patch: ProfilePatch = {}
  const label = draft.label.trim()
  if (label && label !== (agent.label ?? '')) patch.label = label
  const task = draft.taskDescription.trim()
  if (task !== (agent.taskDescription ?? '').trim()) patch.taskDescription = task
  const tags = parseTagsCsv(draft.tags)
  const before = agent.tags ?? []
  if (tags.length !== before.length || tags.some((t, i) => t !== before[i])) patch.tags = tags
  if (draft.avatar && draft.avatar !== (agent.avatar ?? '')) patch.avatar = draft.avatar
  return Object.keys(patch).length > 0 ? patch : null
}

// ── What the card needs from the shell ────────────────────────────────────────────────────

/**
 * Provided by AppShell around the whole shell so the card works from the agent workspace and the
 * team workspace alike. ColonyPanel renders no card when it is absent.
 */
export interface ColonyCardEnv {
  agents: Agent[]
  unread: Record<string, number>
  /** An agent is mid-wake: New conversation waits */
  wakingAgentId: string | null
  onOpenWorkspace: (agent: Agent) => void
  onOpenTerminal: (agent: Agent) => void
  onOpenSkills: (agent: Agent) => void
  /** Select the agent and, if it is asleep, run the shell's wake flow */
  onNewConversation: (agent: Agent) => void
  /** The agent list changed (a profile edit): re-read it so the sidebar follows */
  onAgentsChanged: () => void
}

export const ColonyCardEnvContext = createContext<ColonyCardEnv | null>(null)

// ── The card ─────────────────────────────────────────────────────────────────────────────

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-3 text-[13px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** A bot's profile, shown inside the Colony window when its bot is selected. */
export default function ColonyProfileCard({ agent, env, hidden = false, onClose }: {
  agent: Agent
  env: ColonyCardEnv
  /** The colony window is minimized: the card stays mounted but must not claim Esc */
  hidden?: boolean
  onClose: () => void
}) {
  const { presenceOf } = useSessionActivity()
  const presence = presenceOf(agent)
  const status = shellStatusFor(agent, presence)
  const unread = env.unread[agent.id] ?? 0
  const busy = env.wakingAgentId === agent.id

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(agent))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = useMemo(() => buildProfilePatch(agent, draft), [agent, draft])
  const usedAvatars = useMemo(
    () => env.agents.filter(a => a.id !== agent.id && a.avatar).map(a => a.avatar as string),
    [env.agents, agent.id],
  )

  // Esc: leave the form first, then dismiss. Only while the colony window is showing, and never for
  // an Esc meant for something else: a terminal or chat field outside the card, or a dialog/menu/picker.
  // Capture phase + preventDefault is how this stays one-Esc-one-action without touching WorkArea: its
  // bubble listener (maximize restore) already yields to defaultPrevented, so when the card takes the Esc
  // the window stays put and the next Esc restores it.
  const rootRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (hidden) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || pickerOpen) return
      const target = e.target as Element | null
      if (target?.closest?.('[role="dialog"],[aria-modal="true"],[role="menu"]')) return
      if (isEditableTarget(target) && !rootRef.current?.contains(target)) return
      e.preventDefault()
      if (editing) { setEditing(false); setError(null) } else onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [hidden, editing, pickerOpen, onClose])

  const startEdit = () => { setDraft(draftOf(agent)); setError(null); setEditing(true) }

  const save = async () => {
    if (!patch) { setEditing(false); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error || `Could not save (${res.status})`)
      }
      setEditing(false)
      env.onAgentsChanged()
      // The colony rescans at once, so the bot's name and face follow the edit
      window.dispatchEvent(new Event('aimaestro:colony-refresh'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const name = displayName(agent)
  const host = agent.hostName || agent.hostId
  const program = [agent.program, agent.model].filter(Boolean).join(' · ')

  return (
    <aside ref={rootRef} aria-label={`${name} profile`}
      className="w-full max-w-sm h-full flex flex-col overflow-y-auto bg-surface border-l border-hairline/70 text-ink">
      <header className="flex items-start gap-3 p-4">
        <AgentAvatar agent={agent} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[16px] font-medium text-ink truncate">{name}</h2>
          {agent.label && agent.name && agent.label !== agent.name && (
            <div className="text-[12px] text-ink-muted truncate">{agent.name}</div>
          )}
          <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
            <StatusDot status={status} />
            <span>{PRESENCE_STYLE[presence].label}</span>
            {unread > 0 && <Badge>{unread}</Badge>}
          </div>
        </div>
        <div className="flex-none flex items-center">
          {!editing && <IconButton label="Edit profile" onClick={startEdit}><Pencil strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
          <IconButton label="Close profile (Esc)" onClick={onClose}><X strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </header>

      {editing ? (
        <form className="flex flex-col gap-3 px-4 pb-4" onSubmit={e => { e.preventDefault(); void save() }}>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Label
            <Field className="w-full" value={draft.label} placeholder={agent.name} maxLength={80}
              onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Task description
            <Textarea rows={3} value={draft.taskDescription}
              onChange={e => setDraft(d => ({ ...d, taskDescription: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Tags (comma separated)
            <Field className="w-full" value={draft.tags} placeholder="backend, api"
              onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))} />
          </label>
          <div className="flex items-center gap-3 text-[13px] text-ink-muted">
            <span>Avatar</span>
            <ActionButton type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              {draft.avatar && draft.avatar !== (agent.avatar ?? '') ? 'Change again' : 'Change avatar'}
            </ActionButton>
            {draft.avatar && draft.avatar !== (agent.avatar ?? '') && <span className="text-accent">New avatar selected</span>}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => { setEditing(false); setError(null) }} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving || !patch}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </Button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col gap-2 px-4 pb-4">
          {agent.taskDescription && <Detail label="Task">{agent.taskDescription}</Detail>}
          {host && <Detail label="Host">{host === 'local' ? 'this Mac' : host}</Detail>}
          {program && <Detail label="Program">{program}</Detail>}
          {agent.workingDirectory && <Detail label="Directory"><span className="font-mono text-[12px] break-all">{agent.workingDirectory}</span></Detail>}
          {agent.tags && agent.tags.length > 0 && (
            <Detail label="Tags">
              <span className="flex flex-wrap gap-1.5">
                {agent.tags.map(t => <span key={t} className="rounded-full border border-hairline px-2 text-[12px] text-ink-muted">{t}</span>)}
              </span>
            </Detail>
          )}
        </dl>
      )}

      <section className="border-t border-hairline/70">
        <h3 className="px-4 pt-3 text-[13px] text-ink-muted">Tasks</h3>
        <AgentTaskList agentId={agent.id} compact />
      </section>

      <div className="mt-auto grid grid-cols-2 gap-2 p-4 border-t border-hairline/70">
        <ActionButton variant="default" size="sm" disabled={busy} onClick={() => env.onNewConversation(agent)}>
          {busy ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}New conversation
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenWorkspace(agent)}>
          <LayoutDashboard />Open workspace
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenTerminal(agent)}>
          <SquareTerminal />Terminal
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenSkills(agent)}>
          <Sparkles />Skills
        </ActionButton>
      </div>

      <AvatarPicker
        isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={url => setDraft(d => ({ ...d, avatar: url }))}
        currentAvatar={draft.avatar || agent.avatar} usedAvatars={usedAvatars}
      />
    </aside>
  )
}
```

### CommandPalette
- Path: `components/shell/CommandPalette.tsx`
- Description: Cmd+K palette: agents, teams, screens, settings sections.
- Props: open, onOpenChange, agents, statusOf, onSelectAgent, onSelectHome, onSwitchClassic, teams, onSelectTeam

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName } from '@/lib/agent-status'
import AgentAvatar from '@/components/AgentAvatar'
import { rankCommandResults, shouldOpenPalette, SETTINGS_COMMANDS, SHELL_SCREENS, type CommandItem } from '@/lib/command-palette'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  statusOf: (agent: Agent) => string
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onSwitchClassic: () => void
  onCreateAgent?: () => void
  teams?: { id: string; name: string }[]
  onSelectTeam?: (id: string) => void
}


export default function CommandPalette(p: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
      if (shouldOpenPalette(e, e.target as Element | null, isMac)) {
        e.preventDefault()
        p.onOpenChange(!p.open)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [p])

  useEffect(() => {
    if (p.open) { setQuery(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [p.open])

  const items = useMemo<CommandItem[]>(() => [
    ...p.agents.map(a => ({ id: `agent:${a.id}`, kind: 'agent' as const, label: displayName(a), keywords: [a.name, a.alias || '', a.hostId, ...(a.tags || [])].filter(Boolean), hint: p.statusOf(a) })),
    ...(p.teams ?? []).map(t => ({ id: `team:${t.id}`, kind: 'screen' as const, label: `Team · ${t.name}`, keywords: ['team', t.name] })),
    ...SHELL_SCREENS,
    ...SETTINGS_COMMANDS,
    ...(p.onCreateAgent ? [{ id: 'action:create-agent', kind: 'action' as const, label: 'Create agent…', keywords: ['create', 'agent', 'new'] }] : []),
  ], [p])
  const results = rankCommandResults(query, items).slice(0, 12)

  if (!p.open) return null

  const run = (item: CommandItem | undefined) => {
    if (!item) return
    p.onOpenChange(false)
    if (item.kind === 'agent') {
      const a = p.agents.find(x => `agent:${x.id}` === item.id)
      if (a) p.onSelectAgent(a)
    } else if (item.id.startsWith('team:')) p.onSelectTeam?.(item.id.slice(5))
    else if (item.id === 'screen:home') p.onSelectHome()
    else if (item.id === 'action:classic') p.onSwitchClassic()
    else if (item.id === 'action:create-agent') p.onCreateAgent?.()
    else router.push(item.id.slice('screen:'.length))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); p.onOpenChange(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[index]) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[12vh]" onMouseDown={() => p.onOpenChange(false)}>
      <div role="dialog" aria-label="Command palette" onMouseDown={e => e.stopPropagation()}
        className="w-[560px] max-w-[92vw] rounded-[14px] border border-hairline bg-surface overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-hairline/70">
          <Search strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />
          <input ref={inputRef} autoFocus value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }} onKeyDown={onKeyDown}
            placeholder="Jump to an agent or screen…" aria-label="Search"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-gray-500 focus:outline-none" />
          <span className="text-[12px] text-gray-500">Esc</span>
        </div>
        <ul role="listbox" className="max-h-[360px] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-ink-muted">No matches</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onClick={() => run(r)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] cursor-pointer ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              {r.kind === 'agent' && <AgentAvatar agent={p.agents.find(a => `agent:${a.id}` === r.id) ?? null} size="xs" />}
              <span className="truncate">{r.label}</span>
              <span className="ml-auto text-[12px] text-gray-500">{r.kind === 'agent' ? r.hint : r.kind === 'action' ? 'Action' : 'Go to'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

### BrowserPanel
- Path: `components/shell/BrowserPanel.tsx`
- Description: Embedded sandboxed iframe browser with URL bar.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, PictureInPicture2 } from 'lucide-react'
import { currentUrl, normalizeUrl } from '@/lib/browser-nav'
import { useBrowser } from '@/hooks/useBrowser'
import { IconButton } from './ui'

/** Same sandbox for the panel and the mini preview. */
export const BROWSER_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'

const navBtn = 'grid place-items-center w-[30px] h-[30px] rounded-[8px] text-ink-muted hover:text-ink hover:bg-raised disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

/** A small browser in the tool panel: URL bar, back/forward/reload, live page. */
export default function BrowserPanel() {
  const { browser, dispatch } = useBrowser()
  const url = currentUrl(browser)
  const [draft, setDraft] = useState(url)
  const [nonce, setNonce] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setDraft(url) }, [url])

  const go = () => {
    const next = normalizeUrl(draft)
    if (!next) { setError('Enter an http:// or https:// address'); return }
    setError(null)
    if (next === url) setNonce(n => n + 1)
    else dispatch({ type: 'navigate', url: next })
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      <div className="h-[44px] flex-none flex items-center gap-1 px-2 border-b border-hairline/70">
        <button type="button" aria-label="Back" title="Back" className={navBtn} disabled={browser.index === 0} onClick={() => dispatch({ type: 'back' })}>
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Forward" title="Forward" className={navBtn} disabled={browser.index >= browser.history.length - 1} onClick={() => dispatch({ type: 'forward' })}>
          <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Reload" title="Reload" className={navBtn} onClick={() => setNonce(n => n + 1)}>
          <RotateCw strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <form className="flex-1 min-w-0 mx-1" onSubmit={e => { e.preventDefault(); go() }}>
          <input value={draft} onChange={e => { setDraft(e.target.value); setError(null) }} aria-label="Address" spellCheck={false}
            onFocus={e => e.currentTarget.select()}
            className={`w-full h-[30px] px-3 rounded-[8px] bg-sunken border text-[13px] font-mono text-ink placeholder:text-gray-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${error ? 'border-danger/60' : 'border-control-border'}`} />
        </form>
        <IconButton label="Open in new tab" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
        </IconButton>
        <IconButton label={browser.mini ? 'Hide mini preview' : 'Show mini preview'} active={browser.mini} onClick={() => dispatch({ type: 'setMini', mini: !browser.mini })}>
          <PictureInPicture2 strokeWidth={1.5} className="w-4 h-4" />
        </IconButton>
      </div>
      {error && <div role="alert" className="px-3 py-1.5 text-[12px] text-danger border-b border-hairline/70">{error}</div>}
      <iframe key={`${url}#${nonce}`} src={url} title="Browser" sandbox={BROWSER_SANDBOX} referrerPolicy="no-referrer"
        className="flex-1 w-full min-h-0 bg-white border-0" />
      <div className="flex-none flex items-center gap-2 px-3 h-[30px] border-t border-hairline/70 text-[12px] text-gray-500">
        Page blank? Some sites block being embedded.
        <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="text-ink-muted hover:text-ink underline-offset-2 hover:underline">Open in new tab</button>
      </div>
    </div>
  )
}
```

### MiniPreview
- Path: `components/shell/MiniPreview.tsx`
- Description: Floating scaled-down live preview of the Browser window.
- Props: hidden, onOpen

```tsx
'use client'

import { X } from 'lucide-react'
import { currentUrl } from '@/lib/browser-nav'
import { useBrowser } from '@/hooks/useBrowser'
import { BROWSER_SANDBOX } from './BrowserPanel'

const PAGE_W = 1280
const PAGE_H = 800
const W = 288

/** Floating, scaled-down live view of the Browser page; click to open the panel. */
export default function MiniPreview({ hidden, onOpen }: { hidden: boolean; onOpen: () => void }) {
  const { browser, dispatch } = useBrowser()
  if (!browser.mini || hidden) return null
  const url = currentUrl(browser)
  const scale = W / PAGE_W
  let host = url
  try { host = new URL(url).host } catch { /* keep raw */ }

  return (
    <div className="absolute right-5 bottom-[150px] z-10 rounded-[12px] border border-hairline bg-surface overflow-hidden group"
      style={{ width: W }}>
      <div className="relative bg-white overflow-hidden" style={{ height: PAGE_H * scale }}>
        <iframe src={url} title="Mini preview" tabIndex={-1} sandbox={BROWSER_SANDBOX} referrerPolicy="no-referrer" aria-hidden
          className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
          style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})` }} />
        <button type="button" onClick={onOpen} aria-label={`Open browser at ${host}`} className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill" />
      </div>
      <div className="flex items-center gap-2 px-2.5 h-[28px] text-[12px] text-ink-muted">
        <span className="truncate font-mono">{host}</span>
        <button type="button" aria-label="Close mini preview" onClick={() => dispatch({ type: 'setMini', mini: false })}
          className="ml-auto grid place-items-center w-5 h-5 rounded-[6px] hover:text-ink hover:bg-raised">
          <X strokeWidth={1.5} className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
```

### TeamChat
- Path: `components/shell/TeamChat.tsx`
- Description: Team meeting chat: message list + composer that broadcasts or targets one member.
- Props: team, meeting, members, onStart, starting

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Users, ChevronDown } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { useMeetingMessages } from '@/hooks/useMeetingMessages'
import { displayName, formatAge } from '@/lib/agent-status'
import { meetingText } from '@/lib/team-panels'
import { findAgentByRef } from '@/lib/agent-lookup'
import AgentAvatar from '@/components/AgentAvatar'
import { Button, EmptyState, Notice } from './ui'

/** The team's meeting chat: everyone's messages, and a composer that broadcasts or targets one member. */
export default function TeamChat({ team, meeting, members, onStart, starting }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  onStart: () => void
  starting: boolean
}) {
  const { messages, sendToAgent, broadcastToAll, markAsRead } = useMeetingMessages({
    meetingId: meeting?.id ?? null,
    participantIds: team.agentIds,
    teamName: team.name,
    isActive: !!meeting,
  })
  const [to, setTo] = useState<string>('all')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markAsRead(); endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, markAsRead])
  useEffect(() => { if (to !== 'all' && !team.agentIds.includes(to)) setTo('all') }, [team.agentIds, to])

  if (!meeting) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <EmptyState icon={<Users strokeWidth={1.5} className="w-6 h-6" />} title="No meeting running"
          description={members.length ? 'Start a meeting to talk to all members at once.' : 'Add members from the Members panel (＋ then E), then start a meeting.'}
          action={<Button variant="accent" onClick={onStart} disabled={starting || members.length === 0}>Start meeting</Button>} />
      </div>
    )
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError(null)
    try {
      const result = to === 'all' ? await broadcastToAll(body) : await sendToAgent(to, body)
      if (result.ok) setText('')
      else setError(result.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }
  const now = Date.now()

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {messages.length === 0 && <p className="text-[14px] text-ink-muted">No messages yet. Say hi to the team.</p>}
        {messages.map(m => m.isMine ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 bg-raised text-ink text-[15px] whitespace-pre-wrap">{meetingText(m.preview)}</div>
          </div>
        ) : (
          <div key={m.id} className="max-w-[80%] flex items-start gap-2.5">
            <AgentAvatar agent={findAgentByRef(members, m.from, m.fromAlias, m.fromLabel) ?? { id: m.from, name: m.fromAlias || m.from, label: m.fromLabel }} size="sm" className="mt-0.5" />
            <div className="min-w-0">
              <div className="text-[12px] text-ink-muted"><span className="text-ink font-medium">{m.displayFrom}</span> · {formatAge(m.timestamp, now) || 'now'}</div>
              <div className="text-[15px] text-ink whitespace-pre-wrap mt-0.5">{meetingText(m.preview)}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-8 pb-6 pt-2">
        <div className="rounded-[18px] border border-control-off bg-surface px-4 pt-3.5 pb-3">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} aria-label="Message the team"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
            placeholder={to === 'all' ? 'Message the team' : `Message ${displayName(members.find(m => m.id === to) ?? members[0])}`}
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-gray-500 resize-none focus:outline-none min-h-[44px]" style={{ maxHeight: 160 }} />
          <div className="flex items-center gap-3 mt-1">
            <span className="relative inline-flex">
            <select value={to} onChange={e => setTo(e.target.value)} aria-label="Send to"
              className="h-[28px] appearance-none rounded-[8px] border border-control-border bg-sunken pl-2.5 pr-7 text-[13px] text-ink-muted cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
              <option value="all">To: Everyone</option>
              {members.map(m => <option key={m.id} value={m.id}>To: {displayName(m)}</option>)}
            </select>
            <ChevronDown strokeWidth={1.5} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            </span>
            {error && <Notice tone="error">{error}</Notice>}
            <button type="button" onClick={send} disabled={sending || !text.trim()} aria-label="Send"
              className="ml-auto grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-fill text-white disabled:opacity-40">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### TeamTools
- Path: `components/shell/TeamTools.tsx`
- Description: renderTeamTool(tool, data, env): kanban, documents, instructions, members tool windows for a team.
- Props: tool, TeamToolData, ToolEnv

```tsx
'use client'

import type { ReactNode } from 'react'
import type { Agent } from '@/types/agent'
import type { Team } from '@/types/team'
import { termAgentId } from '@/lib/team-panels'
import type { WindowTool } from '@/lib/window-manager'
import { useTasks } from '@/hooks/useTasks'
import { useDocuments } from '@/hooks/useDocuments'
import TaskKanbanBoard from '@/components/team-meeting/TaskKanbanBoard'
import TaskPanel from '@/components/team-meeting/TaskPanel'
import TeamDocumentsSection from '@/components/teams/TeamDocumentsSection'
import TeamInstructionsSection from '@/components/teams/TeamInstructionsSection'
import ColonyPanel from '@/components/shell/ColonyPanel'
import TeamOverviewSection from '@/components/teams/TeamOverviewSection'
import AgentTabContent from './AgentTabContent'
import BrowserPanel from './BrowserPanel'
import type { ToolEnv } from './PanelBody'

type UpdateTeam = (u: { name?: string; description?: string; agentIds?: string[]; instructions?: string }) => Promise<void>

function KanbanBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskKanbanBoard agents={members} tasks={t.tasks} tasksByStatus={t.tasksByStatus}
    onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} onCreateTask={t.createTask} teamName={team.name} /></div>
}
function TasksBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskPanel agents={members} tasks={t.tasks} pendingTasks={t.pendingTasks}
    inProgressTasks={t.inProgressTasks} completedTasks={t.completedTasks} onCreateTask={t.createTask} onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} /></div>
}
function MembersBody({ team, allAgents, updateTeam }: { team: Team; allAgents: Agent[]; updateTeam: UpdateTeam }) {
  const t = useTasks(team.id)
  const d = useDocuments(team.id)
  return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamOverviewSection team={team} agents={allAgents} taskCount={t.tasks.length} docCount={d.documents.length} onUpdateTeam={updateTeam} /></div>
}

export interface TeamToolData {
  team: Team
  members: Agent[]
  allAgents: Agent[]
  updateTeam: UpdateTeam
}

/** One team tool's content inside a window: Kanban, Tasks, Documents, Instructions, Members, Browser, Colony, or a member's terminal. */
export function renderTeamTool(tool: WindowTool, d: TeamToolData, env: ToolEnv): ReactNode {
  const { team } = d
  const memberId = termAgentId(tool)
  if (memberId) {
    const agent = d.allAgents.find(a => a.id === memberId)
    if (!agent) return null
    return <AgentTabContent agent={agent} activeTab="terminal" setActiveTab={() => {}} onlineAgents={env.onlineAgents}
      wakingAgentId={env.wakingAgentId} onWake={env.onWake} onShowProfile={env.onShowProfile} hideHeaders chatVariant="ink" />
  }
  switch (tool) {
    case 'kanban': return <KanbanBody team={team} members={d.members} />
    case 'tasks': return <TasksBody team={team} members={d.members} />
    case 'documents': return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamDocumentsSection teamId={team.id} /></div>
    case 'instructions': return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamInstructionsSection instructions={team.instructions || ''} onSave={s => d.updateTeam({ instructions: s })} /></div>
    case 'members': return <MembersBody team={team} allAgents={d.allAgents} updateTeam={d.updateTeam} />
    case 'browser': return <BrowserPanel />
    case 'colony': return <ColonyPanel hidden={env.minimized} z={env.z} />
    default: return null
  }
}
```

## E. Feature panels rendered inside the shell (full source)

### ChatView
- Path: `components/ChatView.tsx`
- Description: Transcript chat view for an agent (markdown, tool-burst groups, composer, pending echoes). `variant="ink"` is the command-center look.
- Props: agent: Agent, isActive?, hideHeader?, variant: classic|ink

```tsx
'use client'

import { PRESENCE_STYLE, type AgentPresence } from '@/lib/agent-presence'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { avatarStateForPresence } from './LiveAvatar'
import AgentHeaderBar from './AgentHeaderBar'
import { agentWorkingDirectory, getAgentBaseUrl } from '@/lib/agent-utils'
import { useEffect, useRef, useState, useCallback, useMemo, type KeyboardEvent, type ChangeEvent } from 'react'
import { User, Bot, Wrench, Loader2, Send, AlertCircle, ChevronDown, ChevronRight, Copy, Check, MessageSquare, ScanEye } from 'lucide-react'
import { MarkdownContent } from '@/components/chat/MarkdownRenderer'
import ToolBurstGroup from '@/components/chat/ToolBurstGroup'
import { groupMessages, getToolPreview, type ToolBurst } from '@/lib/chat-utils'
import { reconcilePending } from '@/lib/pending-reconcile.mjs'
import {
  isQuestionAnswered as sharedIsAnswered,
  isQuestionCurrent as sharedIsCurrent,
  paneCardBelongsToTranscriptQuestion,
} from '@/lib/question-state.mjs'
import type { Agent } from '@/types/agent'

// Collapsible thinking block
function ThinkingBlock({ text, timestamp }: { text: string; timestamp?: string }) {
  const [expanded, setExpanded] = useState(false)
  const preview = text.slice(0, 120) + (text.length > 120 ? '...' : '')

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] min-w-0 overflow-hidden">
        <div
          className="rounded-2xl px-4 py-3 bg-purple-900/20 border border-purple-700/30 cursor-pointer transition-colors hover:bg-purple-900/30"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 mb-1">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="text-xs text-purple-400 italic">Thinking</span>
            {timestamp && (
              <span className="text-xs text-purple-500/50 ml-auto">
                {new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {expanded ? (
            <div className="text-sm text-purple-200/80 whitespace-pre-wrap break-words italic max-h-64 overflow-y-auto select-text">
              {text}
            </div>
          ) : (
            <p className="text-sm text-purple-300/50 truncate italic">{preview}</p>
          )}
        </div>
      </div>
    </div>
  )
}

type ChatMode = 'power' | 'assisted'

interface ChatViewProps {
  agent: Agent
  isActive?: boolean  // Only connect WebSocket when active (prevents resource waste with many agents)
  hideHeader?: boolean  // Command-center shell shows its own top bar
  variant?: 'classic' | 'ink'
}

interface Message {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'thinking' | 'summary' | 'system' | 'queue-operation'
    // Emitted by parseJsonlLines for every completed tool call. Carries no
    // payload — it exists so the UI can tell an answered question from a live
    // one after a page reload. See isQuestionAnswered.
    | 'tool_result_marker'
  tool_use_id?: string
  timestamp?: string
  uuid?: string
  message?: {
    content?: string | ContentBlock[]
    model?: string
  }
  thinking?: string
  summary?: string
  toolName?: string
  toolInput?: any
  // For queue-operation type
  operation?: 'enqueue' | 'dequeue'
  content?: string
}

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: any
  id?: string
  [key: string]: any
}

interface PendingMessage {
  id: string
  text: string
  timestamp: string
  status: 'sending' | 'failed'
}

/** Extract the plain text of a message for pending-echo matching. */
function messageText(m: Message): string {
  if (m.type === 'queue-operation' && m.content) return m.content
  const content = m.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.filter(b => b.type === 'text' && b.text).map(b => b.text).join('\n\n')
  }
  return ''
}

/** Dedup key: uuid when present, otherwise a content-derived fallback so
 *  uuid-less messages (synthesized/summary) can't duplicate on overlapping reads. */
function messageKey(m: Message): string {
  if (m.uuid) return m.uuid
  return `${m.type}|${m.timestamp || ''}|${messageText(m).slice(0, 120)}`
}

const PENDING_EXPIRY_MS = 30000
/** Let the TUI open its free-text field before the answer is pasted into it. */
const QUESTION_OTHER_SETTLE_MS = 400

export default function ChatView({ agent, isActive = false, hideHeader = false, variant = 'classic' }: ChatViewProps) {
  const ink = variant === 'ink'
  // What the sidebar and terminal read: one status for every view
  const { presenceOf } = useSessionActivity()
  const [messages, setMessages] = useState<Message[]>([])
  // Pending bubbles survive leaving the chat.
  //
  // These carry the Retry button for a message that may not have landed. They
  // were component state, so switching to the terminal tab unmounted ChatView and
  // took the evidence with it — the message was gone and there was nothing left
  // to retry. Keyed per agent, same as the draft.
  const pendingKey = `aimaestro-chat-pending-${agent.id}`
  /**
   * Drop any pending bubble whose text now appears in the transcript.
   * Shared with MobileChatView — see lib/pending-reconcile.mjs for the two
   * opposite ways this used to fail.
   */
  const clearEchoedPending = useCallback((msgs: Message[]) => {
    setPendingMessages(prev => reconcilePending(prev, msgs, messageText) as PendingMessage[])
  }, [])

  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(pendingKey)
      const parsed = raw ? JSON.parse(raw) : []
      // A bubble still marked 'sending' from a previous mount cannot be waited
      // on any more — the socket that would have confirmed it is gone. Show it
      // as failed so it is actionable rather than spinning forever.
      return Array.isArray(parsed)
        ? parsed.map((p: PendingMessage) => p.status === 'sending' ? { ...p, status: 'failed' as const } : p)
        : []
    } catch { return [] }
  })

  useEffect(() => {
    try {
      if (pendingMessages.length) localStorage.setItem(pendingKey, JSON.stringify(pendingMessages))
      else localStorage.removeItem(pendingKey)
    } catch { /* quota / private mode */ }
  }, [pendingMessages, pendingKey])
  // The draft survives leaving the chat.
  //
  // ChatView UNMOUNTS when you switch to the terminal tab, so anything typed and
  // not yet sent was simply gone on the way back — retype it. Keyed per agent so
  // two agents do not share a draft.
  const draftKey = `aimaestro-chat-draft-${agent.id}`
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(draftKey) || '' } catch { return '' }
  })

  useEffect(() => {
    try {
      if (input) localStorage.setItem(draftKey, input)
      else localStorage.removeItem(draftKey)
    } catch { /* private mode, quota — a lost draft is not worth throwing over */ }
  }, [input, draftKey])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [hookState, setHookState] = useState<{
    status: string;
    message?: string;
    description?: string;
    toolName?: string;
    toolInput?: {
      command?: string;
      file_path?: string;
      path?: string;
      [key: string]: any;
    };
    options?: Array<{
      key: string;
      label: string;
      action: string;
      rule?: string;
    }>;
    notificationType?: string;
    updatedAt?: string;
  } | null>(null)
  const [liveActivity, setLiveActivity] = useState<{ label: string; detail?: string } | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    if (typeof window === 'undefined') return 'assisted'
    return (localStorage.getItem('aimaestro-chat-mode') as ChatMode) || 'assisted'
  })
  const [chatWsConnected, setChatWsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  // Latest connect() from the WS effect, callable from the visibility handler
  // (which previously reset the attempt counter but never actually reconnected
  // once the socket was gone — chat stayed dead until an agent switch)
  const connectRef = useRef<(() => void) | null>(null)
  // Scroll-stick: only autoscroll when the user is already near the bottom
  const stickToBottomRef = useRef(true)
  const [hasUnseenMessages, setHasUnseenMessages] = useState(false)

  // Track if we've done initial load
  const hasLoadedRef = useRef(false)
  // Track last message ID for scroll behavior
  const prevLastMsgIdRef = useRef<string | null>(null)
  // Track last pong for dead connection detection
  const lastPongRef = useRef<number>(Date.now())

  // Persist chat mode
  const toggleChatMode = () => {
    const next = chatMode === 'power' ? 'assisted' : 'power'
    setChatMode(next)
    localStorage.setItem('aimaestro-chat-mode', next)
  }

  // ── WebSocket connection for chat ─────────────────────────────────
  // Stable session name: computed once per agent identity, not on every agent object refresh
  const chatSessionName = useMemo(() =>
    (agent as any).session?.tmuxSessionName || agent.name || agent.alias || agent.id,
    [agent.id, agent.name, agent.alias, (agent as any).session?.tmuxSessionName]
  )

  const getChatWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    let url = `${protocol}//${host}/term?name=${encodeURIComponent(chatSessionName)}&chatOnly=1`
    if (agent.hostId && agent.hostId !== 'local') {
      url += `&host=${encodeURIComponent(agent.hostId)}`
    }
    return url
  }, [chatSessionName, agent.hostId])

  const sendChatMessage = useCallback((type: string, payload?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }))
      return true
    }
    return false
  }, [])

  // Request history (used for initial load + manual refresh)
  const requestHistory = useCallback(() => {
    setIsLoading(true)
    sendChatMessage('chat:requestHistory', { agentId: agent.id })
  }, [sendChatMessage, agent.id])

  // Connect/disconnect WebSocket based on isActive
  useEffect(() => {
    if (!isActive || !agent?.id) return

    const sessionName = agent.name || agent.alias || agent.id

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return
      // Close zombie sockets stuck in CONNECTING
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close()
        wsRef.current = null
      }

      const ws = new WebSocket(getChatWsUrl())

      ws.onopen = () => {
        console.log(`[ChatView] Connected to chat WS for ${sessionName}`)
        setChatWsConnected(true)
        reconnectAttemptsRef.current = 0
        // Request history on connect
        ws.send(JSON.stringify({ type: 'chat:requestHistory', agentId: agent.id }))
        setIsLoading(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'chat:history': {
              const history = data.data || {}
              const newMessages = history.messages || []
              setMessages(newMessages)
              setHookState(history.hookState || null)
              setLastModified(history.lastModified || null)
              setError(null)
              // History always contains what was sent, so reconcile against it on
              // EVERY push — not only the first. Doing it once was why a bubble
              // survived a reconnect or tab switch and rendered beside the real
              // message forever.
              if (!hasLoadedRef.current) {
                setPendingMessages([])
              } else {
                clearEchoedPending(newMessages)
              }
              hasLoadedRef.current = true
              setIsLoading(false)
              break
            }

            case 'chat:messages': {
              // Incremental new messages from JSONL watcher (only fires on real file changes)
              const newMsgs = data.data || []
              if (newMsgs.length > 0) {
                setError(null)
                setMessages(prev => {
                  const existingKeys = new Set(prev.map(messageKey))
                  const uniqueNew = newMsgs.filter((m: Message) => !existingKeys.has(messageKey(m)))
                  if (uniqueNew.length === 0) return prev
                  return [...prev, ...uniqueNew].slice(-200)
                })
                // Clear a pending bubble ONLY when ITS OWN echo appears in the
                // transcript (user message or queued enqueue with matching text).
                // Previously ANY user/assistant message cleared ALL pending
                // bubbles — unrelated agent output made your message look
                // delivered when it might not be.
                clearEchoedPending(newMsgs)

                // Assistant response means the agent moved on — clear sticky permission + activity
                if (newMsgs.some((m: Message) => m.type === 'assistant')) {
                  setHookState(null)
                  setLiveActivity(null)
                }
              }
              break
            }

            case 'chat:hookState': {
              // Permission prompts are sticky against MISSING information, not
              // against contradicting information.
              //
              // `null` means "I could not read a state" — a transient failure must
              // not drop a live permission card mid-approval. A concrete status
              // means the server looked and the agent is not at a prompt, and
              // since v0.38.17 the server validates that against the pane before
              // serving a permission card at all.
              //
              // Ignoring a concrete status was the client-side twin of the server
              // deadlock fixed in v0.38.15: one false permission_request pinned the
              // card, and only an assistant message could clear it — which an idle
              // agent receiving nothing will never produce.
              const newState = data.data || null
              setHookState(prev => {
                if (prev?.status === 'permission_request' && newState === null) return prev
                return newState
              })
              break
            }

            case 'chat:sent': {
              break
            }

            case 'chat:activity': {
              setLiveActivity(data.data || null)
              break
            }

            case 'pong': {
              lastPongRef.current = Date.now()
              break
            }

            case 'chat:sendFailed': {
              // Server refused/failed the send (permission prompt up, paste
              // unverified, etc.) — mark the matching pending bubble failed
              // NOW instead of letting it spin until the 30s expiry
              const failedText = (data.message || '').trim()
              setPendingMessages(prev => {
                const idx = prev.findIndex(p => p.status === 'sending' && p.text.trim() === failedText)
                if (idx === -1) return prev
                const next = [...prev]
                next[idx] = { ...next[idx], status: 'failed' }
                return next
              })
              break
            }

            case 'chat:error': {
              setError(data.error || 'Unknown error')
              setIsLoading(false)
              break
            }
          }
        } catch {
          // Not JSON — ignore (shouldn't happen on chatOnly connection)
        }
      }

      ws.onclose = () => {
        console.log(`[ChatView] Chat WS disconnected for ${sessionName}`)
        setChatWsConnected(false)
        // Guard against stale closures
        if (wsRef.current !== ws) return
        wsRef.current = null

        // Auto-reconnect with backoff (up to 5 attempts)
        if (reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        // onclose will fire after this — reconnect handled there
      }

      wsRef.current = ws
    }

    connectRef.current = connect
    connect()

    return () => {
      connectRef.current = null
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setChatWsConnected(false)
    }
  }, [agent.id, isActive, getChatWsUrl])

  // Reconnect chat WS when page becomes visible (mobile background recovery)
  useEffect(() => {
    if (!isActive) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttemptsRef.current = 0 // Reset for fresh retries
          if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            // Zombie socket — closing it triggers onclose → reconnect
            wsRef.current.close()
          } else {
            // No socket at all (retries exhausted while backgrounded) —
            // reconnect directly; closing nothing reconnects nothing
            connectRef.current?.()
          }
        }
      } else {
        // Page hidden — cancel pending reconnects
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive])

  // Heartbeat: send ping every 15s, force reconnect if no pong for 45s
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // If no pong received in 45s, connection is dead — force reconnect
        if (Date.now() - lastPongRef.current > 45000) {
          console.log('[ChatView] No pong in 45s — forcing reconnect')
          wsRef.current.close() // triggers onclose → reconnect
          return
        }
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [isActive])

  // Track whether the user is near the bottom of the message list.
  // Autoscroll only sticks when they are — scrolling up to read history no
  // longer gets yanked back down by every incoming message.
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    stickToBottomRef.current = nearBottom
    if (nearBottom) setHasUnseenMessages(false)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    stickToBottomRef.current = true
    setHasUnseenMessages(false)
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // Auto-scroll to bottom when new messages or pending messages arrive
  useEffect(() => {
    if (messages.length === 0 && pendingMessages.length === 0) return

    const lastMsg = messages[messages.length - 1]
    const lastId = lastMsg?.uuid || lastMsg?.timestamp || null
    const isInitialLoad = prevLastMsgIdRef.current === null
    const hasNewMessages = lastId !== prevLastMsgIdRef.current
    prevLastMsgIdRef.current = lastId

    if (isInitialLoad) {
      scrollToBottom('instant' as ScrollBehavior)
    } else if (hasNewMessages || pendingMessages.length > 0) {
      if (stickToBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else if (hasNewMessages) {
        setHasUnseenMessages(true)
      }
    }
  }, [messages, pendingMessages, scrollToBottom])

  // Auto-scroll when permission prompt appears (needs action — always surface it)
  useEffect(() => {
    if (hookState?.status === 'permission_request') {
      scrollToBottom()
    }
  }, [hookState, scrollToBottom])

  // Expire stuck pending bubbles into a visible "failed" state with retry.
  // Without this, a lost message spins "Sending..." forever.
  useEffect(() => {
    if (pendingMessages.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setPendingMessages(prev => {
        let changed = false
        const next = prev.map(p => {
          if (p.status === 'sending' && now - new Date(p.timestamp).getTime() > PENDING_EXPIRY_MS) {
            changed = true
            return { ...p, status: 'failed' as const }
          }
          return p
        })
        return changed ? next : prev
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [pendingMessages.length])

  // Answer a permission / choice menu (a single key like "1"/"2"/"3").
  // Uses the dedicated permission path: the server sends it as a RAW KEYSTROKE
  // that actually selects the menu option, and bypasses the send guard that was
  // silently swallowing these clicks (the "response never lands" bug).
  const sendQuickResponse = (text: string) => {
    setHookState(null)  // clear the sticky card optimistically
    const sent = sendChatMessage('chat:permissionResponse', { key: text })
    if (!sent) setError('Not connected — reopen the agent and try again')
  }

  // Retry a failed pending message (re-sends and resets its expiry clock)
  const retryPendingMessage = (id: string) => {
    const pending = pendingMessages.find(p => p.id === id)
    if (!pending) return
    const sent = sendChatMessage('chat:send', { message: pending.text })
    setPendingMessages(prev => prev.map(p =>
      p.id === id
        ? { ...p, status: sent ? 'sending' as const : 'failed' as const, timestamp: new Date().toISOString() }
        : p
    ))
    if (!sent) setError('Not connected — reconnecting...')
  }

  const dismissPendingMessage = (id: string) => {
    setPendingMessages(prev => prev.filter(p => p.id !== id))
  }

  /**
   * The live AskUserQuestion on screen, if there is one.
   *
   * Claude Code treats free text as a legitimate answer to a question — its own
   * terminal prompt reads "Enter a number, or type your own answer", and the SDK
   * documents the custom string being used as the answer value. So typing in the
   * chat must answer the question, not be refused.
   *
   * In the TUI the free-text field lives behind the last option ("Other"), so we
   * press that first and then send the text. Without this, typing while a menu is
   * open goes nowhere and the only way through is a terminal.
   */
  const liveQuestion = (): { otherIndex: number } | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const t = getAskUserQuestion(messages[i])
      if (!t?.id || !t.input?.questions?.length) continue
      if (isQuestionAnswered(t.id) || !isQuestionCurrent(t.id)) return null
      const q = t.input.questions[0] as { options?: unknown[] }
      return { otherIndex: (q.options?.length || 0) + 1 }
    }
    return null
  }

  // Send message via WebSocket
  const handleSend = () => {
    if (!input.trim() || isSending) return

    const messageToSend = input.trim()

    // Check connection BEFORE clearing input — don't lose the user's text
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected — reconnecting...')
      reconnectAttemptsRef.current = 0
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close()
      }
      return
    }

    setInput('')
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
    setIsSending(true)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    // Add to pending messages immediately for instant feedback
    const pendingMsg: PendingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: messageToSend,
      timestamp: new Date().toISOString(),
      status: 'sending',
    }
    setPendingMessages(prev => [...prev, pendingMsg])

    // Answering a live question: open its free-text field first, then send.
    //
    // The deferred branch used to return `true` before the send had happened, so a
    // socket that dropped during the settle window failed silently and the bubble
    // spun to "Not confirmed" 30s later with no error. Report on the ACTUAL send:
    // the deferred one reports late rather than optimistically.
    const q = liveQuestion()
    const doSend = () => sendChatMessage('chat:send', { message: messageToSend })

    let sent = true
    if (q) {
      sendChatMessage('chat:permissionResponse', { key: String(q.otherIndex) })
      setTimeout(() => {
        if (!doSend()) {
          setError('Not connected — reconnecting…')
          setPendingMessages(prev =>
            prev.map(p => (p.id === pendingMsg.id ? { ...p, status: 'failed' as const } : p))
          )
        }
      }, QUESTION_OTHER_SETTLE_MS)
    } else {
      sent = doSend()
    }
    if (!sent) {
      setError('Failed to send — try again')
      setPendingMessages(prev => prev.filter(p => p.id !== pendingMsg.id))
      setInput(messageToSend)
      try { localStorage.setItem(draftKey, messageToSend) } catch { /* ignore */ }
    }

    setIsSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-growing textarea
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
      } else {
        next.add(toolId)
      }
      return next
    })
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMessageContent = (message: Message): string => {
    if (message.thinking) return message.thinking
    if (message.summary) return message.summary

    // Handle queue-operation (enqueued user messages)
    if (message.type === 'queue-operation' && message.content) {
      return message.content
    }

    const content = message.message?.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .filter(block => block.type === 'text' && block.text)
        .map(block => block.text)
        .join('\n\n')
    }
    return ''
  }

  const getToolsFromMessage = (message: Message): ContentBlock[] => {
    const content = message.message?.content
    if (!Array.isArray(content)) return []
    return content.filter(block => block.type === 'tool_use')
  }

  // Extract AskUserQuestion tool_use from a message (if any)
  const getAskUserQuestion = (message: Message): ContentBlock | null => {
    const content = message.message?.content
    if (!Array.isArray(content)) return null
    return content.find(block => block.type === 'tool_use' && block.name === 'AskUserQuestion') || null
  }

  // Shared with MobileChatView — see lib/question-state.mjs. These rules were
  // duplicated in both renderers and had to be fixed twice on 15 Sep 2026.
  const isQuestionAnswered = (toolUseId: string): boolean =>
    sharedIsAnswered(messages, toolUseId, answeredQuestions)

  const isQuestionCurrent = (toolUseId: string): boolean =>
    sharedIsCurrent(messages, toolUseId, hookState)

  // Render tool-specific expanded content
  const renderToolExpanded = (tool: ContentBlock) => {
    const input = tool.input
    if (!input) return null
    const name = tool.name || ''

    switch (name) {
      case 'Bash':
        return (
          <div className="px-3 pb-3">
            <pre className="text-xs bg-gray-950/50 p-2 rounded whitespace-pre-wrap break-all max-h-48 overflow-y-auto font-mono text-green-300">
              {input.command || ''}
            </pre>
          </div>
        )
      case 'Read':
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        return (
          <div className="px-3 pb-3 space-y-1">
            {input.file_path && (
              <div className="text-xs font-mono bg-gray-950/50 px-2 py-1.5 rounded text-blue-300">
                {input.file_path}
              </div>
            )}
            {input.description && (
              <p className="text-xs text-gray-400 italic">{input.description}</p>
            )}
            {input.old_string && (
              <pre className="text-xs bg-red-950/30 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto text-red-300 border border-red-900/30">
                {input.old_string}
              </pre>
            )}
            {input.new_string && (
              <pre className="text-xs bg-green-950/30 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto text-green-300 border border-green-900/30">
                {input.new_string}
              </pre>
            )}
            {input.content && name === 'Write' && (
              <pre className="text-xs bg-gray-950/50 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto text-gray-300">
                {typeof input.content === 'string' ? input.content.slice(0, 500) + (input.content.length > 500 ? '\n...' : '') : ''}
              </pre>
            )}
          </div>
        )
      case 'Grep':
        return (
          <div className="px-3 pb-3">
            <div className="text-xs font-mono bg-gray-950/50 px-2 py-1.5 rounded text-yellow-300">
              /{input.pattern || ''}/{input.path ? ` in ${input.path}` : ''}
            </div>
          </div>
        )
      case 'Glob':
        return (
          <div className="px-3 pb-3">
            <div className="text-xs font-mono bg-gray-950/50 px-2 py-1.5 rounded text-yellow-300">
              {input.pattern || ''}
            </div>
          </div>
        )
      default:
        return (
          <div className="px-3 pb-3">
            <pre className="text-xs bg-gray-950/50 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto text-gray-300">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
        )
    }
  }

  const isOnline = agent.sessions?.some(s => s.status === 'online')

  // Group consecutive tool-only messages into collapsible bursts
  const groupedItems = useMemo(() => groupMessages(messages, chatMode), [messages, chatMode])

  // Activity state derived from hookState + messages + pending.
  // "thinking" = user sent something and no assistant text response yet.
  // We scan backwards from the end: metadata messages (system, attachment, etc.)
  // are invisible — keep looking until we find user or assistant.
  const activityState = useMemo(() => {
    if (hookState?.status === 'permission_request') return 'permission' as const
    // F004 Phase 2: codex reports 'working' from its transcript turn-lifecycle
    // (it has no hook). Show the same amber "working" pulse Claude gets from the
    // message heuristic below.
    if (hookState?.status === 'working') return 'thinking' as const
    if (hookState?.status === 'waiting_for_input') return 'waiting' as const
    if (isSending) return 'sending' as const
    if (pendingMessages.length > 0) return 'thinking' as const
    if (messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const t = messages[i].type
        if (t === 'user' || t === 'queue-operation') return 'thinking' as const
        if (t === 'assistant') return 'idle' as const
      }
    }
    return 'idle' as const
  }, [hookState, pendingMessages.length, isSending, messages])

  // The status is the shared store's (hooks/useSessionActivity.ts), the same
  // value the sidebar and the terminal show. The chat's own data only adds the
  // detail wording ("Working · Bash · yarn test", "Needs you · approval").
  const presence: AgentPresence = presenceOf(agent, { online: !!isOnline })
  const presenceStyle = PRESENCE_STYLE[presence]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
      {/* Header: which agent, where, what it is doing (shared with the terminal tab) */}
      {!hideHeader && (
        <AgentHeaderBar
          hostId={agent.hostId}
          remote={getAgentBaseUrl(agent) !== ''}
          name={agent.label || agent.name || agent.alias || 'Agent'}
          workingDirectory={agentWorkingDirectory(agent)}
          presence={presence}
          avatar={{ agentId: agent.id, src: agent.avatar, hostUrl: getAgentBaseUrl(agent), state: avatarStateForPresence(presence) }}
          status={
            presence === 'working'
              ? (liveActivity ? `Working · ${liveActivity.label}${liveActivity.detail ? ` · ${liveActivity.detail}` : ''}…` : 'Working…')
              : presence === 'needs-you'
                ? (activityState === 'permission' ? 'Needs you · approval' : 'Needs you')
                : presenceStyle.label
          }
          actions={
            // X-Ray changes what the chat shows (thinking and tool calls), so it
            // stays, with a label. Refresh went: the chat is live and reconnects.
            <button
              onClick={toggleChatMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                chatMode === 'power'
                  ? 'text-amber-300 bg-amber-400/15 hover:bg-amber-400/25'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              title={chatMode === 'power' ? 'X-Ray on: showing thinking and tool calls. Click to hide them' : 'X-Ray off: click to show thinking and tool calls'}
              aria-pressed={chatMode === 'power'}
            >
              <ScanEye className="w-4 h-4" />
              X-Ray
            </button>
          }
        />
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 relative"
        style={{ minHeight: 0 }}
      >
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!isLoading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-base text-gray-400">Talk to {agent.label || agent.name || agent.alias || 'this agent'}</p>
            <p className="text-xs mt-1">Send instructions, approve permissions, or ask questions</p>
          </div>
        )}

        {groupedItems.map((item, index) => {
          // Tool burst — render collapsible group
          if ('_isBurst' in item) {
            const burst = item as ToolBurst
            return (
              <ToolBurstGroup
                key={`burst-${burst.startTimestamp || index}`}
                burst={burst}
                expandedTools={expandedTools}
                onToggleTool={toggleTool}
                renderToolExpanded={renderToolExpanded}
              />
            )
          }

          const message = item as Message
          const isUser = message.type === 'user'
          const isQueued = message.type === 'queue-operation' && message.operation === 'enqueue'
          const isThinking = message.type === 'thinking'
          const isSummary = message.type === 'summary'
          const content = getMessageContent(message)
          const tools = getToolsFromMessage(message)

          // Skip system messages with no meaningful content
          if (message.type === 'system') return null

          // Skip empty messages and dequeue operations (keep AskUserQuestion even without text)
          if (!content && tools.length === 0 && !getAskUserQuestion(message)) return null
          if (message.type === 'queue-operation' && message.operation !== 'enqueue') return null

          // Assisted mode: only show user↔agent conversation (hide thinking, tools-only, summaries)
          if (chatMode === 'assisted') {
            if (isThinking || isSummary) return null
            // Skip tool-only assistant messages (no text content) — except AskUserQuestion
            const hasAskQuestion = getAskUserQuestion(message) !== null
            if (message.type === 'assistant' && !content && tools.length > 0 && !hasAskQuestion) return null
          }

          // Summary divider — centered horizontal rule with text (power mode only)
          if (isSummary) {
            return (
              <div key={message.uuid || index} className="flex items-center gap-3 my-3 px-2">
                <div className="flex-1 border-t border-gray-700/50" />
                <span className="text-xs text-gray-500 italic whitespace-nowrap">
                  {message.summary || 'Conversation compacted'}
                </span>
                <div className="flex-1 border-t border-gray-700/50" />
              </div>
            )
          }

          // Thinking block — collapsible (power mode only)
          if (isThinking) {
            return <ThinkingBlock key={message.uuid || index} text={content} timestamp={message.timestamp} />
          }

          // Message grouping: check if previous item is same role within 60s
          const prevItem = index > 0 ? groupedItems[index - 1] : null
          const prevMsg = prevItem && !('_isBurst' in prevItem) ? prevItem as Message : null
          const isSameRole = prevMsg && (
            (isUser && prevMsg.type === 'user') ||
            (isQueued && prevMsg.type === 'queue-operation' && prevMsg.operation === 'enqueue') ||
            (!isUser && !isQueued && prevMsg.type === 'assistant')
          )
          const isGrouped = isSameRole && message.timestamp && prevMsg?.timestamp &&
            Math.abs(new Date(message.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 60000

          return (
            <div
              key={message.uuid || index}
              className={`flex ${(isUser || isQueued) ? 'justify-end' : 'justify-start'} ${isGrouped ? '!mt-1' : ''}`}
            >
              <div className={`max-w-[85%] min-w-0 overflow-hidden ${(isUser || isQueued) ? 'order-1' : ''}`}>
                {/* Message bubble */}
                <div
                  className={
                    ink
                      ? isQueued
                        ? 'rounded-2xl px-4 py-2.5 bg-warn/15 text-ink border border-warn/40'
                        : isUser
                        ? 'rounded-2xl px-4 py-2.5 bg-raised text-ink'
                        : 'px-0 py-1 text-[15px] leading-relaxed text-ink'
                      : `rounded-2xl px-4 py-3 ${
                          isQueued
                            ? 'bg-yellow-600/80 text-white border border-yellow-500'
                            : isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-200'
                        }`
                  }
                >
                  {/* Header with icon — hide if grouped (ink style drops it) */}
                  {!isGrouped && !ink && (
                    <div className="flex items-center gap-2 mb-1">
                      {isQueued ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isUser ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                      <span className="text-xs opacity-70">
                        {isQueued ? 'Queued' : isUser ? 'You' : (agent.label || agent.name || 'Agent')}
                      </span>
                      {message.timestamp && (
                        <span className="text-xs opacity-50 ml-auto">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content — use markdown for assistant, plain for user */}
                  {content && (
                    (isUser || isQueued) ? (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {content}
                      </div>
                    ) : (
                      <MarkdownContent text={content} />
                    )
                  )}

                  {/* Tools — with contextual previews (power mode only) */}
                  {chatMode === 'power' && tools.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {tools.filter(t => t.name !== 'AskUserQuestion').map((tool, toolIdx) => {
                        const toolId = `${index}-${toolIdx}`
                        const isExpanded = expandedTools.has(toolId)
                        const preview = getToolPreview(tool)

                        return (
                          <div
                            key={toolId}
                            className="bg-orange-900/30 rounded-lg border border-orange-800/50"
                          >
                            <button
                              onClick={() => toggleTool(toolId)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-900/20 transition-colors rounded-lg"
                            >
                              <Wrench className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              <span className="text-xs text-orange-300 font-medium">
                                {tool.name || 'Tool'}
                              </span>
                              {preview && !isExpanded && (
                                <span className="text-xs text-orange-400/60 font-mono truncate flex-1 ml-1">
                                  {preview}
                                </span>
                              )}
                              {!preview && <span className="flex-1" />}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              )}
                            </button>

                            {isExpanded && tool.input && renderToolExpanded(tool)}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* AskUserQuestion — interactive options (shown in both modes) */}
                  {(() => {
                    const askTool = getAskUserQuestion(message)
                    if (!askTool?.input?.questions) return null
                    // Not actionable unless it is BOTH unanswered and still the
                    // live question. Anything else renders as history.
                    const answered = askTool.id
                      ? isQuestionAnswered(askTool.id) || !isQuestionCurrent(askTool.id)
                      : false
                    const questions = askTool.input.questions as Array<{
                      question: string
                      header?: string
                      options: Array<{ label: string; description?: string }>
                      multiSelect?: boolean
                    }>

                    // A question that is answered, or that the conversation has
                    // moved past, collapses to ONE LINE.
                    //
                    // Greying the buttons out was not enough: the full six-option
                    // panel still rendered, on every reload and every switch back
                    // from the terminal, which is what people actually complained
                    // about. It is history — show it as history.
                    if (answered) {
                      return (
                        <div className="mt-2 space-y-1">
                          {questions.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="flex items-center gap-2 text-xs text-gray-500 px-2 py-1 rounded bg-gray-800/20"
                            >
                              <Check className="w-3 h-3 flex-shrink-0 text-gray-600" />
                              <span className="truncate">{q.header || q.question}</span>
                              <span className="text-gray-600 flex-shrink-0">· answered</span>
                            </div>
                          ))}
                        </div>
                      )
                    }

                    return (
                      <div className="mt-3 space-y-3">
                        {questions.map((q, qIdx) => (
                          <div key={qIdx} className="bg-cyan-900/30 rounded-lg border border-cyan-700/40 p-3">
                            {q.header && (
                              <div className="text-xs font-medium text-cyan-400 mb-1">{q.header}</div>
                            )}
                            <div className="text-sm text-cyan-100 mb-2">{q.question}</div>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  onClick={() => {
                                    if (!answered && askTool.id) {
                                      setAnsweredQuestions(prev => new Set(prev).add(askTool.id!))
                                      sendQuickResponse(String(optIdx + 1))
                                    }
                                  }}
                                  disabled={answered || isSending}
                                  className={`flex items-start gap-2 w-full text-left px-3 py-2 rounded-lg transition-all ${
                                    answered
                                      ? 'opacity-50 cursor-default bg-gray-800/30'
                                      : 'bg-cyan-800/20 hover:bg-cyan-700/30 border border-cyan-600/30 hover:border-cyan-500/50'
                                  }`}
                                >
                                  <span className="text-cyan-400 font-bold w-5 text-center flex-shrink-0 mt-0.5">
                                    {optIdx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm text-cyan-200">{opt.label}</span>
                                    {opt.description && (
                                      <p className="text-xs text-cyan-400/60 mt-0.5">{opt.description}</p>
                                    )}
                                  </div>
                                </button>
                              ))}
                              {/* "Other" option — always present, matches terminal behavior */}
                              {!answered && (
                                <button
                                  onClick={() => {
                                    const input = document.querySelector<HTMLTextAreaElement>('[data-chat-input]')
                                    input?.focus()
                                  }}
                                  disabled={isSending}
                                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 border border-gray-600/30 hover:border-gray-500/50 transition-all"
                                >
                                  <span className="text-gray-400 font-bold w-5 text-center flex-shrink-0">
                                    {q.options.length + 1}
                                  </span>
                                  <span className="text-sm text-gray-300">Other</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Action buttons */}
                {content && (
                  <div className={`mt-1 flex items-center gap-1 ${(isUser || isQueued) ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => copyToClipboard(content, index)}
                      className={`p-1 rounded text-xs transition-colors ${
                        isUser
                          ? 'text-blue-300 hover:text-white'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                      title="Copy message"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Live activity indicator — shows what the agent is doing right now */}
        {activityState === 'thinking' && liveActivity && hookState?.status !== 'permission_request' && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800/60 border border-gray-700/50">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-300">
                {liveActivity.label}
                {liveActivity.detail && (
                  <span className="text-gray-500 font-mono ml-1">{liveActivity.detail}</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* PERMISSION REQUEST — always from hookState */}
        {/* The id-less pane/hook permission card. Defer to the transcript's
            identity-governed AskUserQuestion card when this is the SAME question
            (matched by option text): otherwise an answered question, correctly
            hidden above, redraws here from screen position. See
            paneCardBelongsToTranscriptQuestion. Genuine tool-permission prompts
            ("Allow Edit?") match no transcript question and still render. */}
        {hookState?.status === 'permission_request' &&
          !paneCardBelongsToTranscriptQuestion(messages, hookState) && (
          <div className="flex justify-start">
            <div className="max-w-[85%] min-w-0 overflow-hidden">
              <div className="rounded-2xl px-4 py-3 bg-amber-900/40 border border-amber-600/50 text-amber-200">
                {/* Header: what tool is asking */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse bg-amber-400" />
                  <span className="text-xs font-medium text-amber-400">
                    {hookState.description || hookState.message || `Allow ${hookState.toolName || 'action'}?`}
                  </span>
                </div>

                {/* Command preview for Bash */}
                {hookState.toolName === 'Bash' && hookState.toolInput?.command && (
                  <div className="text-xs bg-gray-950/50 p-2 rounded font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto mb-3">
                    {hookState.toolInput.command}
                  </div>
                )}

                {/* File path for file operations */}
                {hookState.toolName !== 'Bash' && (hookState.toolInput?.file_path || hookState.toolInput?.path) && (
                  <div className="text-xs opacity-80 font-mono bg-gray-950/30 px-2 py-1 rounded mb-3">
                    {hookState.toolInput.file_path || hookState.toolInput.path}
                  </div>
                )}

                {/* Action buttons matching Claude Code terminal options */}
                {hookState.options && hookState.options.length > 0 && (
                  <div className="space-y-1.5">
                    {hookState.options.map((option: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (option.value === 'no') {
                            // Focus the chat input for typing feedback
                            const input = document.querySelector<HTMLTextAreaElement>('[data-chat-input]')
                            input?.focus()
                          } else {
                            sendQuickResponse(option.key)
                          }
                        }}
                        disabled={isSending}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg
                          transition-all disabled:opacity-50 ${
                          option.value === 'no'
                            ? 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50'
                            : 'bg-amber-800/30 hover:bg-amber-700/40 border border-amber-600/30 hover:border-amber-500/50'
                        }`}
                      >
                        <span className="text-amber-400 font-bold w-5 text-center">{option.key}</span>
                        <span className={`text-sm flex-1 ${option.value === 'no' ? 'text-gray-300' : 'text-amber-200'}`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending messages (sent via Chat but not yet echoed in the transcript) */}
        {pendingMessages.map((pending) => (
          <div key={pending.id} className="flex justify-end">
            <div className="max-w-[85%] min-w-0 overflow-hidden">
              <div className={`rounded-2xl px-4 py-3 text-white border ${
                pending.status === 'failed'
                  ? 'bg-red-900/60 border-red-600/60'
                  : 'bg-blue-600/70 border-blue-500/50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {pending.status === 'failed' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-300" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span className="text-xs opacity-70">
                    {pending.status === 'failed' ? 'Not confirmed — may not have reached the agent' : 'Sending...'}
                  </span>
                  <span className="text-xs opacity-50 ml-auto">
                    {formatTimestamp(pending.timestamp)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{pending.text}</div>
                {pending.status === 'failed' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => retryPendingMessage(pending.id)}
                      className="px-2 py-1 text-xs rounded bg-red-700/60 hover:bg-red-600/60 border border-red-500/50 transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => dismissPendingMessage(pending.id)}
                      className="px-2 py-1 text-xs rounded bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600/50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* New-messages pill — shown when messages arrive while scrolled up */}
      {hasUnseenMessages && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => scrollToBottom()}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-lg flex items-center gap-1.5 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            New messages
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className={ink ? 'px-8 pb-6 pt-2 flex-shrink-0' : 'border-t border-gray-700 bg-gray-800 p-4 flex-shrink-0'}>
        {!isOnline && (
          <div className="mb-3 px-3 py-2 bg-yellow-900/20 border border-yellow-800 rounded-lg text-xs text-yellow-400">
            Agent is offline. Wake the session to send messages.
          </div>
        )}
        {isOnline && !chatWsConnected && (
          <div className="mb-3 px-3 py-2 bg-yellow-900/20 border border-yellow-800 rounded-lg text-xs text-yellow-400 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Chat disconnected — reconnecting...
          </div>
        )}

        <div className={ink ? 'rounded-[18px] border border-control-off bg-surface px-4 pt-3.5 pb-3' : 'flex items-end gap-3'}>
          <textarea
            ref={inputRef}
            data-chat-input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? `Message ${agent.label || agent.name || agent.alias || 'agent'}${ink ? '' : '... (Enter to send)'}` : 'Agent is offline'}
            className={ink
              ? 'w-full bg-transparent text-[15px] text-ink placeholder:text-gray-500 resize-none focus:outline-none min-h-[44px] disabled:opacity-50'
              : 'flex-1 bg-gray-900 text-gray-200 text-sm rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 disabled:opacity-50'}
            rows={1}
            style={{ maxHeight: '160px' }}
            disabled={!isOnline || isSending}
          />
          <div className={ink ? 'flex items-center gap-5 mt-1 text-[14px] text-ink-muted' : 'contents'}>
            {ink && <span className="text-[12px] text-gray-500">Enter to send · Shift+Enter for a new line</span>}
            <button
              onClick={handleSend}
              disabled={!isOnline || isSending || !input.trim()}
              aria-label="Send"
              className={ink
                ? 'ml-auto grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-fill text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
                : 'px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg'}
            >
              {isSending ? <Loader2 className={ink ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} /> : <Send className={ink ? 'w-4 h-4' : 'w-5 h-5'} />}
            </button>
          </div>
        </div>

        {!ink && (
          <div className="mt-2 text-xs text-gray-500">
            Enter = Send &bull; Shift+Enter = New Line
          </div>
        )}
      </div>
    </div>
  )
}
```

### MessageCenter
- Path: `components/MessageCenter.tsx`
- Description: Inbox / Sent / Compose message centre; inbox window of the shell (`compact` = narrow single-pane mode).
- Props: sessionName, agentId?, allAgents: AgentRecipient[], hostUrl?, isActive?, compact?

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Mail, Send, Inbox, Archive, Trash2, AlertCircle, Clock, CheckCircle, Forward, Copy, ChevronDown, Server, ShieldCheck, Globe, HelpCircle, SquarePen } from 'lucide-react'
import { Button, IconButton } from '@/components/shell/ui'
import type { Message, MessageSummary } from '@/lib/messageQueue'
import { findAgentByRef } from '@/lib/agent-lookup'
import AgentAvatar from '@/components/AgentAvatar'

/**
 * Agent recipient info for messaging
 */
export interface AgentRecipient {
  id: string              // Agent ID (UUID)
  name: string            // Technical name for lookups (e.g., "23blocks-api-crm")
  alias: string           // Display name for UI (e.g., "CRM")
  tmuxSessionName?: string // Tmux session name (for backward compatibility)
  hostId?: string         // Host ID for cross-host messaging (e.g., 'macbook-pro', 'mac-mini')
  avatar?: string         // Agent avatar (portrait path, URL or emoji) for sender avatars
}

interface MessageCenterProps {
  sessionName: string
  agentId?: string  // Primary identifier when available
  allAgents: AgentRecipient[]
  hostUrl?: string  // Base URL for remote hosts (e.g., http://100.80.12.6:23000)
  isActive?: boolean  // Only fetch data when active (prevents API flood with many agents)
  compact?: boolean  // Narrow side panel: list OR message (with Back), slim header
}

export default function MessageCenter({ sessionName, agentId, allAgents, hostUrl, isActive = false, compact = false }: MessageCenterProps) {
  // Use agentId as primary identifier if available, fall back to sessionName
  const messageIdentifier = agentId || sessionName
  // Base URL for API calls - empty for local, full URL for remote hosts
  const apiBaseUrl = hostUrl || ''
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [sentMessages, setSentMessages] = useState<MessageSummary[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox')
  const [unreadCount, setUnreadCount] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)
  const [forwardingOriginalMessage, setForwardingOriginalMessage] = useState<Message | null>(null)
  const [inboxLimit, setInboxLimit] = useState(25)  // Pagination: number of inbox messages to load
  const [sentLimit, setSentLimit] = useState(25)    // Pagination: number of sent messages to load
  const [hasMoreInbox, setHasMoreInbox] = useState(false)
  const [hasMoreSent, setHasMoreSent] = useState(false)

  // Compose form state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [composePriority, setComposePriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [composeType, setComposeType] = useState<'request' | 'response' | 'notification' | 'update'>('request')

  // Copy dropdown state
  const [showCopyDropdown, setShowCopyDropdown] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Agent autocomplete state
  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false)
  const [filteredAgents, setFilteredAgents] = useState<AgentRecipient[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const toInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Toast notification state (replaces native alert/confirm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // The sender as an avatar subject: the registered agent when we know it, else a name-only stand-in
  const senderOf = (m: { from: string; fromAlias?: string; fromLabel?: string }) => {
    const known = findAgentByRef(allAgents, m.from, m.fromAlias, m.fromLabel)
    return known
      ? { id: known.id, name: known.name, label: known.alias, avatar: known.avatar }
      : { id: m.from, name: m.fromAlias || m.from, label: m.fromLabel }
  }

  // Show a toast notification that auto-dismisses
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // External agent info toggle
  const [showExternalAgentInfo, setShowExternalAgentInfo] = useState(false)

  // Fetch inbox messages with pagination
  const fetchMessages = useCallback(async (limit?: number) => {
    try {
      const fetchLimit = limit ?? inboxLimit
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&box=inbox&limit=${fetchLimit}`)
      if (!response.ok) return
      const data = await response.json()
      const msgs = data.messages || []
      setMessages(msgs)
      // If we got exactly the limit, there may be more
      setHasMoreInbox(msgs.length === fetchLimit)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [messageIdentifier, apiBaseUrl, inboxLimit])

  // Fetch sent messages with pagination
  const fetchSentMessages = useCallback(async (limit?: number) => {
    try {
      const fetchLimit = limit ?? sentLimit
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&box=sent&limit=${fetchLimit}`)
      if (!response.ok) return
      const data = await response.json()
      const msgs = data.messages || []
      setSentMessages(msgs)
      // If we got exactly the limit, there may be more
      setHasMoreSent(msgs.length === fetchLimit)
    } catch (error) {
      console.error('Error fetching sent messages:', error)
    }
  }, [messageIdentifier, apiBaseUrl, sentLimit])

  // Load more inbox messages
  const loadMoreInbox = useCallback(() => {
    const newLimit = inboxLimit + 25
    setInboxLimit(newLimit)
    fetchMessages(newLimit)
  }, [inboxLimit, fetchMessages])

  // Load more sent messages
  const loadMoreSent = useCallback(() => {
    const newLimit = sentLimit + 25
    setSentLimit(newLimit)
    fetchSentMessages(newLimit)
  }, [sentLimit, fetchSentMessages])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&action=unread-count`)
      if (!response.ok) return
      const data = await response.json()
      setUnreadCount(data.count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [messageIdentifier, apiBaseUrl])

  // Fetch sent count
  const fetchSentCount = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&action=sent-count`)
      if (!response.ok) return
      const data = await response.json()
      setSentCount(data.count || 0)
    } catch (error) {
      console.error('Error fetching sent count:', error)
    }
  }, [messageIdentifier, apiBaseUrl])

  // Load message details
  const loadMessage = async (messageId: string, box: 'inbox' | 'sent' = 'inbox') => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&box=${box}`)
      if (!response.ok) return
      const message = await response.json()
      setSelectedMessage(message)

      // Mark as read if unread (inbox only)
      if (box === 'inbox' && message.status === 'unread') {
        await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&action=read`, {
          method: 'PATCH',
        })
        fetchMessages()
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error loading message:', error)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!composeTo || !composeSubject || !composeMessage) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setLoading(true)
    try {
      // If forwarding, use the forward API
      if (isForwarding && forwardingOriginalMessage) {
        // Extract the note from the message (everything before "--- Forwarded Message ---")
        const forwardNote = composeMessage.split('--- Forwarded Message ---')[0].trim()

        const response = await fetch(`${apiBaseUrl}/api/messages/forward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: forwardingOriginalMessage.id,
            fromSession: messageIdentifier,
            toSession: composeTo,
            forwardNote: forwardNote || undefined,
          }),
        })

        if (response.ok) {
          // Reset form
          setComposeTo('')
          setComposeSubject('')
          setComposeMessage('')
          setComposePriority('normal')
          setComposeType('request')
          setIsForwarding(false)
          setForwardingOriginalMessage(null)
          setView('inbox')
          showToast('Message forwarded successfully!', 'success')
          fetchMessages()
          fetchUnreadCount()
        } else {
          const error = await response.json()
          showToast(`Failed to forward: ${error.error}`, 'error')
        }
      } else {
        // Regular message send
        const response = await fetch(`${apiBaseUrl}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: sessionName,
            to: composeTo,
            subject: composeSubject,
            priority: composePriority,
            content: {
              type: composeType,
              message: composeMessage,
            },
          }),
        })

        if (response.ok) {
          // Reset form
          setComposeTo('')
          setComposeSubject('')
          setComposeMessage('')
          setComposePriority('normal')
          setComposeType('request')
          setView('inbox')
          showToast('Message sent successfully!', 'success')
        } else {
          showToast('Failed to send message', 'error')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('Error sending message', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Delete message (with confirmation via pendingDelete state)
  const deleteMessage = async (messageId: string) => {
    if (pendingDelete !== messageId) {
      // First click: show confirmation
      setPendingDelete(messageId)
      showToast('Click delete again to confirm', 'info')
      setTimeout(() => setPendingDelete(null), 5000) // Reset after 5s
      return
    }

    // Second click: actually delete
    setPendingDelete(null)
    try {
      await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}`, {
        method: 'DELETE',
      })
      setSelectedMessage(null)
      fetchMessages()
      fetchUnreadCount()
      showToast('Message deleted', 'success')
    } catch (error) {
      console.error('Error deleting message:', error)
      showToast('Failed to delete message', 'error')
    }
  }

  // Archive message
  const archiveMessage = async (messageId: string) => {
    try {
      await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&action=archive`, {
        method: 'PATCH',
      })
      setSelectedMessage(null)
      fetchMessages()
      fetchUnreadCount()
    } catch (error) {
      console.error('Error archiving message:', error)
    }
  }

  // Copy message to clipboard (regular format)
  const copyMessageRegular = async () => {
    if (!selectedMessage) return

    try {
      await navigator.clipboard.writeText(selectedMessage.content.message)
      setCopySuccess(true)
      setShowCopyDropdown(false)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying message:', error)
    }
  }

  // Copy message to clipboard (LLM-friendly markdown format)
  const copyMessageForLLM = async () => {
    if (!selectedMessage) return

    // Format message in markdown for LLM consumption
    const isInboxMessage = view === 'inbox'
    let markdown = `# Message: ${selectedMessage.subject}\n\n`

    if (isInboxMessage) {
      markdown += `**From:** ${formatAgentName(selectedMessage.from, selectedMessage.fromAlias, selectedMessage.fromHost)}\n`
      markdown += `**To:** ${sessionName}\n`
    } else {
      markdown += `**From:** ${sessionName}\n`
      markdown += `**To:** ${formatAgentName(selectedMessage.to, selectedMessage.toAlias, selectedMessage.toHost)}\n`
    }

    markdown += `**Date:** ${new Date(selectedMessage.timestamp).toLocaleString()}\n`
    markdown += `**Priority:** ${selectedMessage.priority}\n`
    markdown += `**Type:** ${selectedMessage.content.type}\n\n`

    markdown += `## Message Content\n\n`
    markdown += `${selectedMessage.content.message}\n`

    if (selectedMessage.content.context) {
      markdown += `\n## Context\n\n`
      markdown += '```json\n'
      markdown += JSON.stringify(selectedMessage.content.context, null, 2)
      markdown += '\n```\n'
    }

    if (selectedMessage.forwardedFrom) {
      markdown += `\n## Forwarding Information\n\n`
      markdown += `**Originally From:** ${selectedMessage.forwardedFrom.originalFrom}\n`
      markdown += `**Originally To:** ${selectedMessage.forwardedFrom.originalTo}\n`
      markdown += `**Original Date:** ${new Date(selectedMessage.forwardedFrom.originalTimestamp).toLocaleString()}\n`
      markdown += `**Forwarded By:** ${selectedMessage.forwardedFrom.forwardedBy}\n`
      markdown += `**Forwarded At:** ${new Date(selectedMessage.forwardedFrom.forwardedAt).toLocaleString()}\n`
      if (selectedMessage.forwardedFrom.forwardNote) {
        markdown += `**Forward Note:** ${selectedMessage.forwardedFrom.forwardNote}\n`
      }
    }

    try {
      await navigator.clipboard.writeText(markdown)
      setCopySuccess(true)
      setShowCopyDropdown(false)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying message:', error)
    }
  }

  // Prepare to forward message
  const prepareForward = (message: Message) => {
    // Build forwarded content with human-readable agent names
    const fromDisplay = formatAgentName(message.from, message.fromAlias, message.fromHost)
    const toDisplay = formatAgentName(message.to, message.toAlias, message.toHost)
    let forwardedContent = `--- Forwarded Message ---\n`
    forwardedContent += `From: ${fromDisplay}\n`
    forwardedContent += `To: ${toDisplay}\n`
    forwardedContent += `Sent: ${new Date(message.timestamp).toLocaleString()}\n`
    forwardedContent += `Subject: ${message.subject}\n\n`
    forwardedContent += `${message.content.message}\n`
    forwardedContent += `--- End of Forwarded Message ---`

    // Set compose form for forwarding
    setComposeTo('')
    setComposeSubject(`Fwd: ${message.subject}`)
    setComposeMessage(forwardedContent)
    setComposePriority(message.priority)
    setComposeType('notification')
    setIsForwarding(true)
    setForwardingOriginalMessage(message)
    setView('compose')
  }

  // Only fetch when this agent is active (prevents API flood with 40+ agents)
  useEffect(() => {
    if (!isActive) return
    fetchMessages()
    fetchSentMessages()
    fetchUnreadCount()
    fetchSentCount()
  }, [messageIdentifier, isActive])

  // Polling - only when active
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      fetchMessages()
      fetchSentMessages()
      fetchUnreadCount()
      fetchSentCount()
    }, 10000)
    return () => clearInterval(interval)
  }, [messageIdentifier, isActive])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowCopyDropdown(false)
      }
    }

    if (showCopyDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCopyDropdown])

  // Filter agents based on input for autocomplete
  useEffect(() => {
    if (!composeTo) {
      setFilteredAgents([])
      setShowAgentSuggestions(false)
      return
    }

    const searchTerm = composeTo.toLowerCase()
    // Filter out current agent and match by alias or host
    const filtered = allAgents.filter(agent => {
      if (agent.id === agentId) return false
      const aliasMatch = agent.alias.toLowerCase().includes(searchTerm)
      const hostMatch = agent.hostId?.toLowerCase().includes(searchTerm)
      const fullMatch = `${agent.alias}@${agent.hostId || 'unknown-host'}`.toLowerCase().includes(searchTerm)
      return aliasMatch || hostMatch || fullMatch
    })

    setFilteredAgents(filtered)
    setShowAgentSuggestions(filtered.length > 0)
    setSelectedSuggestionIndex(-1)
  }, [composeTo, allAgents, agentId])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        toInputRef.current && !toInputRef.current.contains(target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(target)
      ) {
        setShowAgentSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation in autocomplete
  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAgentSuggestions || filteredAgents.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < filteredAgents.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          selectAgent(filteredAgents[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        setShowAgentSuggestions(false)
        break
    }
  }

  // Select an agent from suggestions
  const selectAgent = (agent: AgentRecipient) => {
    // Use technical name for messaging, include host for cross-host compatibility
    const hostId = agent.hostId || 'unknown-host'
    const value = `${agent.name}@${hostId}`
    setComposeTo(value)
    setShowAgentSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  // Format agent display with host indicator
  const formatAgentDisplay = (agent: AgentRecipient) => {
    const hostId = agent.hostId || 'unknown-host'
    return {
      primary: agent.alias,
      secondary: `@${hostId}`,
      hasHost: !!agent.hostId
    }
  }

  // Format agent display name - prefer alias over UUID, always include host
  const formatAgentName = (agentId: string, alias?: string, host?: string) => {
    const displayName = alias || agentId
    const hostName = host || 'unknown-host'
    return `${displayName}@${hostName}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'normal': return 'text-blue-600 bg-blue-100'
      case 'low': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4" />
      case 'high': return <Clock className="w-4 h-4" />
      default: return null
    }
  }

  // Check if the "To" field looks like an external agent (not in autocomplete list)
  const isExternalRecipient = (toValue: string): boolean => {
    if (!toValue) return false
    // If it matches any agent in the list, it's not external
    const matchesAgent = allAgents.some(agent =>
      agent.name.toLowerCase() === toValue.toLowerCase() ||
      agent.alias.toLowerCase() === toValue.toLowerCase() ||
      `${agent.name}@${agent.hostId || 'unknown-host'}`.toLowerCase() === toValue.toLowerCase() ||
      `${agent.alias}@${agent.hostId || 'unknown-host'}`.toLowerCase() === toValue.toLowerCase()
    )
    return !matchesAgent && toValue.length > 0
  }

  // Compose field styles: ink controls in the narrow side panel, original otherwise
  const composeLabel = compact ? 'block text-[13px] text-ink-muted mb-1.5' : 'block text-sm font-medium text-gray-300 mb-1'
  const composeInput = compact
    ? 'w-full h-[34px] px-3 bg-sunken border border-control-border rounded-[10px] text-[14px] text-ink placeholder:text-gray-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'
    : 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className={`flex flex-col h-full w-full relative ${compact ? '' : 'bg-gray-900'}`}>
      {/* Toast notification */}
      {toast && (
        <div className={`absolute top-2 right-2 z-50 px-4 py-2 rounded-md text-sm font-medium shadow-lg transition-opacity ${
          toast.type === 'success' ? 'bg-green-800 text-green-200' :
          toast.type === 'error' ? 'bg-red-800 text-red-200' :
          'bg-gray-700 text-gray-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      {compact ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-hairline/70">
          <div role="tablist" aria-label="Mailbox" className="flex rounded-full bg-raised/70 p-0.5">
            {(['inbox', 'sent'] as const).map(v => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 h-[26px] rounded-full text-[13px] capitalize transition-colors ${view === v ? 'bg-ink text-sunken' : 'text-ink-muted hover:text-ink'}`}>
                {v}
                {v === 'inbox' && unreadCount > 0 && <span className="min-w-[16px] px-1 rounded-full bg-accent-fill text-white text-[10px] leading-[16px] text-center">{unreadCount}</span>}
              </button>
            ))}
          </div>
          <span className="ml-auto">
            <IconButton label="New message" active={view === 'compose'} onClick={() => setView('compose')}>
              <SquarePen strokeWidth={1.5} className="w-4 h-4" />
            </IconButton>
          </span>
        </div>
      ) : (
      <div className={`flex items-center justify-between bg-gray-800 border-b border-gray-700 ${compact ? 'px-3 py-2' : 'p-4'}`}>
        <div className={compact ? 'hidden' : 'flex items-center gap-3'}>
          <Mail className="w-5 h-5 text-gray-300" />
          <button
            onClick={() => setShowExternalAgentInfo(!showExternalAgentInfo)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            title="Learn about messaging AI Maestro and external agents"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Agent Types
          </button>
        </div>
        <div className={`flex ${compact ? 'gap-1 w-full' : 'gap-2'}`}>
          <button
            onClick={() => setView('inbox')}
            className={`${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-medium transition-colors ${
              view === 'inbox'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {!compact && <Inbox className="w-4 h-4 inline-block mr-1" />}
            Inbox
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('sent')}
            className={`${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-medium transition-colors ${
              view === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {!compact && <Send className="w-4 h-4 inline-block mr-1" />}
            Sent
          </button>
          <button
            onClick={() => setView('compose')}
            className={`${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-medium transition-colors ${
              view === 'compose'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {!compact && <Send className="w-4 h-4 inline-block mr-1" />}
            Compose
          </button>
        </div>
      </div>
      )}

      {/* Agent Types Info Panel */}
      {showExternalAgentInfo && (
        <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700">
          <div className="flex items-start gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* AI Maestro Agents */}
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-green-400">AI Maestro Agents</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Registered agents in your AI Maestro network. These appear in autocomplete when composing messages.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    Local agents on this machine
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    Network agents on other hosts
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    Push notifications supported
                  </li>
                </ul>
              </div>

              {/* External Agents */}
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-400">External Agents</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Agents outside AI Maestro that use the messaging API. Type their address manually in compose.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    Custom Claude Code agents
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    Third-party integrations
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    Use format: <code className="bg-gray-800 px-1 rounded">name@host</code>
                  </li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowExternalAgentInfo(false)}
              className="text-gray-500 hover:text-gray-300 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Inbox View */}
      {view === 'inbox' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Message List */}
          <div data-inbox-list className={`${compact ? (selectedMessage ? 'hidden' : 'w-full') : 'w-1/3 border-r border-gray-700 bg-gray-800'} overflow-y-auto`}>
            {messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Inbox strokeWidth={1.5} className={`${compact ? 'w-6 h-6 text-ink-muted' : 'w-12 h-12 text-gray-300'} mx-auto mb-2`} />
                <p className={compact ? 'text-[14px] text-ink-muted' : ''}>No inbox messages</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => loadMessage(msg.id)}
                    className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                      msg.status === 'unread' ? 'bg-blue-900/30' : ''
                    } ${selectedMessage?.id === msg.id ? 'bg-blue-900/50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        {/* Verified/External indicator */}
                        <div className="mt-0.5">
                          {msg.fromVerified !== false ? (
                            <span title="AI Maestro Agent">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            </span>
                          ) : (
                            <span title="External Agent">
                              <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <AgentAvatar agent={senderOf(msg)} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold truncate ${msg.status === 'unread' ? 'text-gray-100' : 'text-gray-300'}`}>
                              {(msg as any).fromLabel || msg.fromAlias || msg.from}
                            </span>
                            {getPriorityIcon(msg.priority)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {msg.fromAlias || msg.from}@{msg.fromHost || 'unknown-host'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${getPriorityColor(msg.priority)}`}>
                        {msg.priority}
                      </span>
                    </div>
                    <h3 className={`text-sm mb-1 ${msg.status === 'unread' ? 'font-semibold text-gray-200' : 'font-medium text-gray-300'}`}>
                      {msg.subject}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{msg.preview}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                      {msg.status === 'unread' && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                ))}
                {hasMoreInbox && (
                  <button
                    onClick={loadMoreInbox}
                    className="w-full p-3 text-sm text-blue-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                  >
                    Load more messages...
                  </button>
                )}
              </>
            )}
          </div>

          {/* Message Detail */}
          <div className={`${compact && !selectedMessage ? 'hidden' : 'flex-1'} ${compact ? '' : 'bg-gray-900'} overflow-y-auto`}>
            {selectedMessage ? (
              <div className={compact ? 'p-4' : 'p-6'}>
                {compact && (
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="mb-3 text-xs text-gray-400 hover:text-gray-200"
                  >
                    ← Back
                  </button>
                )}
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-100 mb-3">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-sm text-gray-400 mt-0.5 flex-shrink-0">From:</span>
                      {/* Verified/External indicator */}
                      <span
                        className={`flex items-center mt-0.5 flex-shrink-0 ${(selectedMessage as any).fromVerified !== false ? 'text-green-400' : 'text-blue-400'}`}
                        title={(selectedMessage as any).fromVerified !== false ? 'AI Maestro Agent' : 'External Agent'}
                      >
                        {(selectedMessage as any).fromVerified !== false ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </span>
                      <AgentAvatar agent={senderOf(selectedMessage)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {(selectedMessage as any).fromLabel || selectedMessage.fromAlias || selectedMessage.from}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{selectedMessage.fromAlias || selectedMessage.from}@{selectedMessage.fromHost || 'unknown-host'}</span>
                          <span className="flex-shrink-0">•</span>
                          <span className="flex-shrink-0">{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Copy Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCopyDropdown(!showCopyDropdown)}
                        className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                          copySuccess
                            ? 'text-green-400 bg-green-900/30'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`}
                        title="Copy Message"
                      >
                        <Copy className="w-5 h-5" />
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showCopyDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                          <button
                            onClick={copyMessageRegular}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Message
                          </button>
                          <button
                            onClick={copyMessageForLLM}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy for LLM
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => prepareForward(selectedMessage)}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-md transition-colors"
                      title="Forward"
                    >
                      <Forward className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => archiveMessage(selectedMessage.id)}
                      className="p-2 text-gray-400 hover:bg-gray-800 rounded-md transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(selectedMessage.priority)}`}>
                    {selectedMessage.priority}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600">
                    {selectedMessage.content.type}
                  </span>
                </div>

                <div className="prose max-w-none">
                  <div className="p-4 bg-gray-800 rounded-lg mb-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">
                      {selectedMessage.content.message}
                    </pre>
                  </div>

                  {selectedMessage.content.context && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">Context:</h3>
                      <pre className="p-3 bg-gray-800 rounded text-xs overflow-x-auto text-gray-300">
                        {JSON.stringify(selectedMessage.content.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800 flex gap-3">
                  <button
                    onClick={() => {
                      // Use technical name (from) for routing, not display alias
                      const replyHost = selectedMessage.fromHost || 'unknown-host'
                      setComposeTo(`${selectedMessage.from}@${replyHost}`)
                      setComposeSubject(`Re: ${selectedMessage.subject}`)
                      setComposeType('response')
                      setIsForwarding(false)
                      setForwardingOriginalMessage(null)
                      setView('compose')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4 inline-block mr-2" />
                    Reply
                  </button>
                  <button
                    onClick={() => prepareForward(selectedMessage)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    <Forward className="w-4 h-4 inline-block mr-2" />
                    Forward
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-2 text-gray-600" />
                  <p>Select a message to read</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sent Messages View */}
      {view === 'sent' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Message List */}
          <div data-inbox-list className={`${compact ? (selectedMessage ? 'hidden' : 'w-full') : 'w-1/3 border-r border-gray-700 bg-gray-800'} overflow-y-auto`}>
            {sentMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Send strokeWidth={1.5} className={`${compact ? 'w-6 h-6 text-ink-muted' : 'w-12 h-12 text-gray-300'} mx-auto mb-2`} />
                <p className={compact ? 'text-[14px] text-ink-muted' : ''}>No sent messages</p>
              </div>
            ) : (
              <>
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => loadMessage(msg.id, 'sent')}
                    className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                      selectedMessage?.id === msg.id ? 'bg-blue-900/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-green-400 font-medium mt-0.5">To:</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-300 truncate">
                              {(msg as any).toLabel || msg.toAlias || msg.to}
                            </span>
                            {getPriorityIcon(msg.priority)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {msg.toAlias || msg.to}@{msg.toHost || 'unknown-host'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${getPriorityColor(msg.priority)}`}>
                        {msg.priority}
                      </span>
                    </div>
                    <h3 className="text-sm mb-1 font-medium text-gray-300">
                      {msg.subject}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{msg.preview}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                ))}
                {hasMoreSent && (
                  <button
                    onClick={loadMoreSent}
                    className="w-full p-3 text-sm text-blue-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                  >
                    Load more messages...
                  </button>
                )}
              </>
            )}
          </div>

          {/* Message Detail */}
          <div className={`${compact && !selectedMessage ? 'hidden' : 'flex-1'} ${compact ? '' : 'bg-gray-900'} overflow-y-auto`}>
            {selectedMessage ? (
              <div className={compact ? 'p-4' : 'p-6'}>
                {compact && (
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="mb-3 text-xs text-gray-400 hover:text-gray-200"
                  >
                    ← Back
                  </button>
                )}
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-400 font-medium">Sent Message</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-100 mb-3">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-sm text-gray-400 mt-0.5 flex-shrink-0">To:</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {(selectedMessage as any).toLabel || selectedMessage.toAlias || selectedMessage.to}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{selectedMessage.toAlias || selectedMessage.to}@{selectedMessage.toHost || 'unknown-host'}</span>
                          <span className="flex-shrink-0">•</span>
                          <span className="flex-shrink-0">{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Copy Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCopyDropdown(!showCopyDropdown)}
                        className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                          copySuccess
                            ? 'text-green-400 bg-green-900/30'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`}
                        title="Copy Message"
                      >
                        <Copy className="w-5 h-5" />
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showCopyDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                          <button
                            onClick={copyMessageRegular}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Message
                          </button>
                          <button
                            onClick={copyMessageForLLM}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy for LLM
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(selectedMessage.priority)}`}>
                    {selectedMessage.priority}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600">
                    {selectedMessage.content.type}
                  </span>
                </div>

                <div className="prose max-w-none">
                  <div className="p-4 bg-gray-800 rounded-lg mb-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">
                      {selectedMessage.content.message}
                    </pre>
                  </div>

                  {selectedMessage.content.context && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">Context:</h3>
                      <pre className="p-3 bg-gray-800 rounded text-xs overflow-x-auto text-gray-300">
                        {JSON.stringify(selectedMessage.content.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Send className="w-16 h-16 mx-auto mb-2 text-gray-600" />
                  <p>Select a sent message to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose View */}
      {view === 'compose' && (
        <div className={`flex-1 overflow-y-auto ${compact ? 'p-4' : 'bg-gray-900 p-6'}`}>
          {compact
            ? isForwarding && <div className="text-[15px] font-medium text-ink mb-3">Forward message</div>
            : <h2 className="text-xl font-bold text-gray-100 mb-6">{isForwarding ? 'Forward Message' : 'Compose Message'}</h2>}

          {isForwarding && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-md">
              <p className="text-sm text-blue-300">
                <Forward className="w-4 h-4 inline-block mr-1" />
                Forwarding message from <strong>{forwardingOriginalMessage ? formatAgentName(forwardingOriginalMessage.from, forwardingOriginalMessage.fromAlias, forwardingOriginalMessage.fromHost) : ''}</strong>
              </p>
              <p className="text-xs text-blue-400 mt-1">
                You can add a note at the top of the message before the forwarded content.
              </p>
            </div>
          )}

          <div className={compact ? 'space-y-3.5' : 'space-y-4 max-w-2xl'}>
            <div className="relative">
              <label htmlFor="compose-to" className={composeLabel}>
                {compact ? 'To' : 'To (Agent Name):'}
              </label>
              <input
                ref={toInputRef}
                id="compose-to"
                name="to"
                type="text"
                aria-label="Recipient agent name"
                aria-autocomplete="list"
                aria-expanded={showAgentSuggestions}
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                onKeyDown={handleToKeyDown}
                onFocus={() => composeTo && filteredAgents.length > 0 && setShowAgentSuggestions(true)}
                autoComplete="off"
                className={composeInput}
                placeholder="Type agent name or agent@host"
              />

              {/* Autocomplete suggestions dropdown */}
              {showAgentSuggestions && filteredAgents.length > 0 && (
                <div
                  ref={suggestionsRef}
                  role="listbox"
                  aria-label="Agent suggestions"
                  className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredAgents.map((agent, index) => {
                    const display = formatAgentDisplay(agent)
                    const isSelected = index === selectedSuggestionIndex
                    return (
                      <div
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-700 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{display.primary}</span>
                          <span className={`text-sm ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                            {display.secondary}
                          </span>
                        </div>
                        {display.hasHost && (
                          <Server className={`w-4 h-4 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* External agent indicator */}
              {isExternalRecipient(composeTo) ? (
                <div className="mt-2 flex items-center gap-2 p-2 bg-blue-900/30 border border-blue-700/50 rounded-md">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="text-xs">
                    <span className="text-blue-300 font-medium">External Agent</span>
                    <span className="text-blue-400/70 ml-1">— This agent is not registered in AI Maestro. The message will be sent via API.</span>
                  </div>
                </div>
              ) : (
                <p className={`mt-1 ${compact ? 'text-[12px] text-gray-500' : 'text-xs text-gray-500'}`}>
                  {compact ? <>Agent name, or <code className="font-mono">agent@host</code> for external agents.</> : <>Type to search AI Maestro agents, or enter <code className="bg-gray-800 px-1 rounded">agent@host</code> for external agents.</>}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="compose-subject" className={composeLabel}>
                {compact ? 'Subject' : 'Subject:'}
              </label>
              <input
                id="compose-subject"
                name="subject"
                type="text"
                aria-label="Message subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className={composeInput}
                placeholder="Enter subject"
              />
            </div>

            <div className={`flex ${compact ? 'gap-2.5' : 'gap-4'}`}>
              <div className="flex-1">
                <label className={composeLabel}>
                  {compact ? 'Priority' : 'Priority:'}
                </label>
                <div className="relative">
                <select
                  value={composePriority}
                  onChange={(e) => setComposePriority(e.target.value as any)}
                  className={compact ? `${composeInput} appearance-none pr-8 cursor-pointer` : composeInput}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                  {compact && <ChevronDown strokeWidth={1.5} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />}
                </div>
              </div>

              <div className="flex-1">
                <label className={composeLabel}>
                  {compact ? 'Type' : 'Type:'}
                </label>
                <div className="relative">
                <select
                  value={composeType}
                  onChange={(e) => setComposeType(e.target.value as any)}
                  className={compact ? `${composeInput} appearance-none pr-8 cursor-pointer` : composeInput}
                >
                  <option value="request">Request</option>
                  <option value="response">Response</option>
                  <option value="notification">Notification</option>
                  <option value="update">Update</option>
                </select>
                  {compact && <ChevronDown strokeWidth={1.5} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />}
                </div>
              </div>
            </div>

            <div>
              <label className={composeLabel}>
                {compact ? 'Message' : 'Message:'}
              </label>
              <textarea
                id="compose-message"
                name="message"
                aria-label="Message body"
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                rows={compact ? 8 : 10}
                className={compact ? `${composeInput} h-auto py-2 leading-relaxed resize-y` : 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm'}
                placeholder="Enter your message..."
              />
            </div>

            {compact ? (
              <div className="flex justify-end gap-2 pt-1">
                <Button onClick={() => {
                  setView('inbox')
                  setIsForwarding(false)
                  setForwardingOriginalMessage(null)
                }}>Cancel</Button>
                <Button variant="accent" onClick={sendMessage} disabled={loading}>
                  <Send strokeWidth={1.5} className="w-4 h-4" />
                  {loading ? (isForwarding ? 'Forwarding…' : 'Sending…') : (isForwarding ? 'Forward' : 'Send')}
                </Button>
              </div>
            ) : (
            <div className="flex gap-3">
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isForwarding ? 'Forwarding...' : 'Sending...') : (isForwarding ? 'Forward Message' : 'Send Message')}
              </button>
              <button
                onClick={() => {
                  setView('inbox')
                  setIsForwarding(false)
                  setForwardingOriginalMessage(null)
                }}
                className="px-6 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```
