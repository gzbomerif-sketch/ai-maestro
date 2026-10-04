'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/types/agent'
import { displayName } from '@/lib/agent-status'
import AgentAvatar from '@/components/AgentAvatar'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem as PaletteItem, CommandList } from '@/components/ui/command'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
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


/**
 * ⌘K palette on shadcn's Command (cmdk in a Radix dialog). Ranking stays ours (rankCommandResults,
 * shouldFilter off, top 12); cmdk owns the selection: ↑/↓ clamp at the ends, Enter or click runs,
 * hover selects, a new query selects the first result. Esc and a backdrop click close (Radix).
 */
export default function CommandPalette(p: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

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
    if (p.open) setQuery('')
  }, [p.open])

  const items = useMemo<CommandItem[]>(() => [
    ...p.agents.map(a => ({ id: `agent:${a.id}`, kind: 'agent' as const, label: displayName(a), keywords: [a.name, a.alias || '', a.hostId, ...(a.tags || [])].filter(Boolean), hint: p.statusOf(a) })),
    ...(p.teams ?? []).map(t => ({ id: `team:${t.id}`, kind: 'screen' as const, label: `Team · ${t.name}`, keywords: ['team', t.name] })),
    ...SHELL_SCREENS,
    ...SETTINGS_COMMANDS,
    ...(p.onCreateAgent ? [{ id: 'action:create-agent', kind: 'action' as const, label: 'Create agent…', keywords: ['create', 'agent', 'new'] }] : []),
  ], [p])
  const results = rankCommandResults(query, items).slice(0, 12)

  // Close first, then act: the destination's own focus/dialogs must not fight the closing palette
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

  return (
    <CommandDialog
      open={p.open} onOpenChange={p.onOpenChange}
      className="top-[12vh] translate-y-0 w-[560px] max-w-[92vw] rounded-[14px] sm:rounded-[14px] border-hairline bg-surface text-ink [&>button]:hidden"
      commandProps={{
        shouldFilter: false,
        label: 'Command palette',
        className: 'relative bg-surface text-ink [&_[cmdk-input-wrapper]]:h-[52px] [&_[cmdk-input-wrapper]]:gap-1 [&_[cmdk-input-wrapper]]:border-hairline/70 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input-wrapper]_svg]:text-ink-muted [&_[cmdk-input-wrapper]_svg]:opacity-100',
      }}
    >
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">Jump to an agent, team or screen</DialogDescription>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Jump to an agent or screen…" aria-label="Search"
        className="h-[52px] pr-10 text-[15px] text-ink placeholder:text-ink-muted" />
      <span aria-hidden className="pointer-events-none absolute right-4 top-[17px] text-[12px] text-ink-muted">Esc</span>
      <CommandList className="max-h-[360px] p-1.5">
        <CommandEmpty className="px-3 py-6 text-center text-[14px] text-ink-muted">No matches</CommandEmpty>
        <CommandGroup className="p-0 px-0 text-ink">
          {results.map(r => (
            <PaletteItem key={r.id} value={r.id} onSelect={() => run(r)}
              className="gap-3 rounded-[10px] px-3 py-2.5 text-[15px] text-ink cursor-pointer data-[selected='true']:bg-raised data-[selected=true]:text-ink">
              {r.kind === 'agent' && <AgentAvatar agent={p.agents.find(a => `agent:${a.id}` === r.id) ?? null} size="xs" />}
              <span className="truncate">{r.label}</span>
              <span className="ml-auto text-[12px] text-ink-muted">{r.kind === 'agent' ? r.hint : r.kind === 'action' ? 'Action' : 'Go to'}</span>
            </PaletteItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
