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
